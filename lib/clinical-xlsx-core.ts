/**
 * Clinical record types + lookup (no xlsx — safe for app bundle).
 */
export type ClinicalDataSource =
  | "observed_treatment_params"
  | "observed_ptv_synthetic_file"
  | "synthetic_cohort_median"
  | "synthetic_template_hn"
  | "none";

export type ClinicalRecord = {
  patientId: string;
  organ: string;
  age: number;
  sex: string;
  diagnosis?: string;
  technique?: string;
  totalDoseGy: number;
  fractions: number;
  dosePerFractionGy: number;
  durationWeeks?: number;
  alphaBeta?: number;
  toxicity?: number;
  followUpMonths?: number;
  ecog?: number;
  stageT?: string;
  stageN?: string;
  smoking?: string;
  chemo?: string;
  xerostomiaG2?: number;
  dysphagiaG2?: number;
  dermatitisG2?: number;
  dataSource: ClinicalDataSource;
  syntheticFlag: boolean;
  adequateForCorrelation: boolean;
  sourceFile: string;
  note: string;
};

export type ClinicalBundle = {
  treatmentParams: ClinicalRecord[];
  ptvSynthetic: ClinicalRecord[];
  hnTemplates: ClinicalRecord[];
  cohortStats: Record<
    string,
    { n: number; ageMedian: number; toxicityRate: number; doseMedian: number; sexMode: string }
  >;
};

export function normOrgan(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (/parotid/.test(s)) return "Parotid";
  if (/larynx|laryanx/.test(s)) return "Larynx";
  if (/spinal|cord/.test(s)) return "SpinalCord";
  if (/ptv|target/.test(s)) return "PTV";
  return String(v ?? "").trim();
}

export function folderToOrgan(folder: string): string {
  const f = folder.toLowerCase();
  if (f.includes("parotid")) return "Parotid";
  if (f.includes("lary")) return "Larynx";
  if (f.includes("spinal") || f.includes("cord")) return "SpinalCord";
  if (f.includes("ptv")) return "PTV";
  return normOrgan(folder);
}

export function buildCohortStats(records: ClinicalRecord[]): ClinicalBundle["cohortStats"] {
  const byOrgan: Record<string, ClinicalRecord[]> = {};
  for (const r of records) {
    if (r.syntheticFlag) continue;
    byOrgan[r.organ] ??= [];
    byOrgan[r.organ]!.push(r);
  }
  const out: ClinicalBundle["cohortStats"] = {};
  for (const [organ, rows] of Object.entries(byOrgan)) {
    const ages = rows.map((r) => r.age).sort((a, b) => a - b);
    const tox = rows.filter((r) => r.toxicity === 1).length;
    const doses = rows.map((r) => r.totalDoseGy);
    const sexCounts: Record<string, number> = {};
    for (const r of rows) sexCounts[r.sex] = (sexCounts[r.sex] ?? 0) + 1;
    const sexMode = Object.entries(sexCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "M";
    out[organ] = {
      n: rows.length,
      ageMedian: ages[Math.floor(ages.length / 2)] ?? 60,
      toxicityRate: rows.length ? tox / rows.length : 0.4,
      doseMedian: doses.sort((a, b) => a - b)[Math.floor(doses.length / 2)] ?? 66,
      sexMode,
    };
  }
  return out;
}

export function emptyClinicalBundle(): ClinicalBundle {
  return { treatmentParams: [], ptvSynthetic: [], hnTemplates: [], cohortStats: {} };
}

export function mergeClinicalBundles(base: ClinicalBundle, extra: ClinicalBundle): ClinicalBundle {
  const treatmentParams = extra.treatmentParams.length
    ? extra.treatmentParams
    : base.treatmentParams;
  const ptvSynthetic = extra.ptvSynthetic.length ? extra.ptvSynthetic : base.ptvSynthetic;
  const hnTemplates = extra.hnTemplates.length ? extra.hnTemplates : base.hnTemplates;
  return {
    treatmentParams,
    ptvSynthetic,
    hnTemplates,
    cohortStats: buildCohortStats(treatmentParams),
  };
}

function stableHash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function syntheticFromCohortDeterministic(
  patientId: string,
  organ: string,
  stats: ClinicalBundle["cohortStats"],
  templateIdx: number,
  templates: ClinicalRecord[],
): ClinicalRecord {
  const c = stats[organ];
  const t = templates[templateIdx % Math.max(templates.length, 1)];
  const h = stableHash01(`${patientId}|${organ}`);
  const toxicityImputed = c ? (h < c.toxicityRate ? 1 : 0) : h < 0.4 ? 1 : 0;
  return {
    patientId,
    organ,
    age: c?.ageMedian ?? t?.age ?? 60,
    sex: c?.sexMode ?? t?.sex ?? "M",
    diagnosis: t?.diagnosis ?? "Head and Neck Cancer",
    technique: t?.technique ?? "IMRT",
    totalDoseGy: c?.doseMedian ?? t?.totalDoseGy ?? 66,
    fractions: t?.fractions ?? 33,
    dosePerFractionGy: t?.dosePerFractionGy ?? 2,
    ecog: t?.ecog,
    stageT: t?.stageT,
    stageN: t?.stageN,
    smoking: t?.smoking,
    chemo: t?.chemo,
    toxicity: toxicityImputed,
    dataSource: "synthetic_cohort_median",
    syntheticFlag: true,
    adequateForCorrelation: false,
    sourceFile: "imputed",
    note: `No observed clinical row for ${patientId}/${organ}; cohort median imputation`,
  };
}

export function lookupClinicalRecord(
  bundle: ClinicalBundle,
  patientId: string,
  organKey: string,
  isTarget: boolean,
): ClinicalRecord {
  const id = String(patientId ?? "")
    .trim()
    .replace(/\s+/g, "");
  const organ = isTarget ? "PTV" : folderToOrgan(organKey);

  const observed = bundle.treatmentParams.find((r) => r.patientId === id && r.organ === organ);
  if (observed) return observed;

  if (isTarget) {
    const ptv = bundle.ptvSynthetic.find((r) => r.patientId === id);
    if (ptv) return ptv;
  }

  const templateIdx = stableHash01(id) * bundle.hnTemplates.length;
  return syntheticFromCohortDeterministic(
    id,
    organ,
    bundle.cohortStats,
    Math.floor(templateIdx),
    bundle.hnTemplates,
  );
}

export function clinicalDataSourceLabel(record: ClinicalRecord): string {
  if (record.dataSource === "none") return "No clinical data source enabled";
  if (record.dataSource === "observed_treatment_params") return "Observed (HN57 registry)";
  if (record.dataSource === "observed_ptv_synthetic_file") return "PTV extension (synthetic-flagged)";
  if (record.dataSource === "synthetic_cohort_median") return "Synthetic imputation (cohort median)";
  return record.note;
}

export function clinicalBundleSummary(bundle: ClinicalBundle): {
  treatmentRows: number;
  ptvRows: number;
  templateRows: number;
  patientCount: number;
} {
  const ids = new Set(bundle.treatmentParams.map((r) => r.patientId));
  return {
    treatmentRows: bundle.treatmentParams.length,
    ptvRows: bundle.ptvSynthetic.length,
    templateRows: bundle.hnTemplates.length,
    patientCount: ids.size,
  };
}
