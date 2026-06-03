/**
 * Gyan layer — literature provenance for organs, models, and QUANTEC citations.
 */

import {
  getOrganParameters,
  getOrganClassification,
  MODEL_LABELS,
  type RadiobiologyModelId,
} from "./parameters";

export type LiteratureReference = {
  id: string;
  citation: string;
  source: "QUANTEC" | "RTOG" | "LKB" | "Zaider" | "rbGyanX";
  year?: number;
};

export const CORE_REFERENCES: LiteratureReference[] = [
  {
    id: "quantec-intro",
    citation:
      "Bentzen SM, et al. QUANTEC: An introduction to the scientific issues. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S3-S9.",
    source: "QUANTEC",
    year: 2010,
  },
  {
    id: "quantec-users",
    citation:
      "Marks LB, et al. Use of normal tissue complication probability models in the clinic. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S10-S19.",
    source: "QUANTEC",
    year: 2010,
  },
  {
    id: "lkb-ntcp",
    citation:
      "Lyman JT. Complication probability in clinical radiation therapy. Radiat Res Suppl. 1985;8:S13-S19.",
    source: "LKB",
    year: 1985,
  },
  {
    id: "lkb-loglogit",
    citation:
      "Niemierko A. Reporting and analyzing dose distributions. Med Phys. 1997;24(1):103-110.",
    source: "LKB",
    year: 1997,
  },
  {
    id: "zaider-tcp",
    citation:
      "Zaider M, Minerbo G. Tumour control probability for a uniform stage III lung tumour: clinical implications for dosimetric studies. Phys Med Biol. 2000;45(1):199-213.",
    source: "Zaider",
    year: 2000,
  },
  {
    id: "lee-plan-eval",
    citation:
      "Lee S, Cao YJ, Kim CY. Physical and radiobiological evaluation of radiotherapy treatment plan. In: Evolution of Ionizing Radiation Research. InTech; 2015. doi:10.5772/60846.",
    source: "rbGyanX",
    year: 2015,
  },
  {
    id: "patel-ci-gi",
    citation:
      "Patel G, et al. Conformity index, homogeneity index and gradient index in modern radiotherapy (SRS/SBRT). Rep Pract Oncol Radiother. 2020;25(3):336-344. doi:10.1016/j.rpor.2020.03.002.",
    source: "RTOG",
    year: 2020,
  },
  {
    id: "paddick-ci",
    citation:
      "Paddick I. A simple scoring ratio to index the conformity of radiosurgical treatment plans. J Neurosurg. 2000;93 Suppl 3:219-222.",
    source: "RTOG",
    year: 2000,
  },
  {
    id: "rtog-0915-gi",
    citation:
      "RTOG 0915 — stereotactic body RT; gradient and conformity metrics for SBRT plan evaluation.",
    source: "RTOG",
  },
];

const ORGAN_QUANTEC_REF: Record<string, string> = {
  Parotid: "Deasy JO, et al. Parotid gland — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S58-S63.",
  Larynx: "Bhide SA, et al. Larynx — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S64-S69.",
  "Spinal Cord": "Kirkpatrick JP, et al. Spinal cord — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S42-S49.",
  Brainstem: "Mayo C, et al. Brainstem — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S27-S35.",
  Lung: "Marks LB, et al. Lung — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S70-S76.",
  Heart: "Gagliardi G, et al. Heart — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S77-S84.",
  Esophagus: "Werner-Wasik M, et al. Esophagus — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S85-S91.",
  Rectum: "Michalski JM, et al. Rectum — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S148-S155.",
  Bladder: "Viswanathan AN, et al. Bladder — QUANTEC. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S156-S162.",
  PTV: "ICRU Reports 50/62/83 — target volume definitions and dose reporting.",
  GTV: "ICRU Reports 50/62/83 — target volume definitions.",
};

const MODEL_REF_IDS: Record<RadiobiologyModelId, string[]> = {
  lkb_loglogit: ["lkb-ntcp", "lkb-loglogit", "quantec-users"],
  lkb_probit: ["lkb-ntcp", "quantec-users"],
  poisson: ["lkb-ntcp", "quantec-users"],
  zaider_minerbo: ["zaider-tcp"],
  poisson_dvh: ["zaider-tcp", "quantec-users"],
};

export type ParameterProvenance = {
  organ: string;
  model: string;
  modelLabel: string;
  classification: {
    category: string;
    seriality: string;
    type: string;
  } | null;
  parameters: Record<string, number>;
  parameterNotes: { key: string; label: string; literatureRole: string }[];
  organCitation: string | null;
  referenceIds: string[];
  references: LiteratureReference[];
};

const PARAM_NOTES: Record<string, { label: string; literatureRole: string }> = {
  td50: { label: "TD50", literatureRole: "Dose for 50% complication (Gy), QUANTEC organ table" },
  d50: { label: "D50", literatureRole: "Alternate TCP/NTCP midpoint dose (Gy)" },
  gamma50: { label: "γ50", literatureRole: "Normalized dose-response slope at 50% effect" },
  gamma: { label: "γ", literatureRole: "Slope parameter (LKB / Poisson)" },
  m: { label: "m", literatureRole: "LKB log-logistic slope" },
  n: { label: "n", literatureRole: "Volume effect parameter (serial ≈ 1, parallel ≪ 1)" },
  alphaBeta: { label: "α/β", literatureRole: "LQ fractionation sensitivity (Gy)" },
  s: { label: "s", literatureRole: "LKB probit spread parameter" },
};

export function getProvenanceFor(organ: string, model: string): ParameterProvenance | null {
  const params = getOrganParameters(organ, model);
  if (!params) return null;

  const classInfo = getOrganClassification(organ);
  const modelId = model as RadiobiologyModelId;
  const refIds = [
    ...new Set([...(MODEL_REF_IDS[modelId] ?? ["quantec-users"]), "quantec-intro"]),
  ];

  return {
    organ,
    model,
    modelLabel: MODEL_LABELS[modelId] ?? model,
    classification: classInfo
      ? {
          category: classInfo.category,
          seriality: classInfo.seriality,
          type: classInfo.type,
        }
      : null,
    parameters: params as Record<string, number>,
    parameterNotes: Object.keys(params)
      .filter((k) => PARAM_NOTES[k])
      .map((k) => ({
        key: k,
        ...PARAM_NOTES[k],
      })),
    organCitation: ORGAN_QUANTEC_REF[organ] ?? null,
    referenceIds: refIds,
    references: CORE_REFERENCES.filter((r) => refIds.includes(r.id)),
  };
}

export function getReferenceLibrary(): LiteratureReference[] {
  const organRefs = Object.entries(ORGAN_QUANTEC_REF).map(([organ, citation]) => ({
    id: `organ-${organ.toLowerCase().replace(/\s+/g, "-")}`,
    citation,
    source: "QUANTEC" as const,
    year: 2010,
  }));
  return [...CORE_REFERENCES, ...organRefs];
}
