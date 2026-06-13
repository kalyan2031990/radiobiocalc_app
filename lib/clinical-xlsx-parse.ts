/**
 * xlsx parsing — lazy-imported when user uploads clinical spreadsheet.
 */
import * as XLSX from "xlsx";
import {
  buildCohortStats,
  emptyClinicalBundle,
  mergeClinicalBundles,
  normOrgan,
  type ClinicalBundle,
  type ClinicalRecord,
} from "@/lib/clinical-xlsx-core";

function normId(v: unknown): string {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function normSex(v: unknown): string {
  const s = String(v ?? "").trim().toUpperCase();
  if (s.startsWith("F")) return "F";
  if (s.startsWith("M")) return "M";
  return s || "U";
}

function readSheetRows(wb: XLSX.WorkBook, sheetName?: string): Record<string, unknown>[] {
  const name = sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0]!;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, { defval: "" });
}

function parseWorkbookBytes(bytes: ArrayBuffer, fileName: string): Partial<ClinicalBundle> {
  const wb = XLSX.read(new Uint8Array(bytes), { type: "array" });
  const base = fileName.toLowerCase();

  if (/treatment_params/i.test(base)) {
    return {
      treatmentParams: readSheetRows(wb, "HN_data").map((r) => ({
        patientId: normId(r.PatientId),
        organ: normOrgan(r.Organ),
        age: Number(r.Age) || 60,
        sex: normSex(r.Sex),
        diagnosis: String(r.Diagnosis ?? ""),
        technique: String(r.Technique ?? ""),
        totalDoseGy: Number(r.TotalDose_Gy) || 66,
        fractions: Number(r.n_frac) || 33,
        dosePerFractionGy: Number(r.dose_per_frac_Gy) || 2,
        durationWeeks: Number(r.duration_wk) || undefined,
        alphaBeta: Number(r.alpha_beta) || undefined,
        toxicity: r.Toxicity === "" || r.Toxicity == null ? undefined : Number(r.Toxicity),
        followUpMonths: Number(r.Follow_up_months) || undefined,
        dataSource: "observed_treatment_params" as const,
        syntheticFlag: false,
        adequateForCorrelation: true,
        sourceFile: fileName,
        note: "HN57 treatment params + organ toxicity",
      })),
    };
  }

  if (/synthetic_clinical/i.test(base)) {
    return {
      ptvSynthetic: readSheetRows(wb).map((r) => ({
        patientId: normId(r.PatientId),
        organ: "PTV",
        age: Number(r.Age) || 60,
        sex: normSex(r.Sex),
        diagnosis: String(r.Diagnosis ?? ""),
        technique: String(r.Technique ?? ""),
        totalDoseGy: Number(r.TotalDose_Gy) || 70,
        fractions: Number(r.n_frac) || 35,
        dosePerFractionGy: Number(r.dose_per_frac_Gy) || 2,
        durationWeeks: Number(r.duration_wk) || undefined,
        alphaBeta: Number(r.alpha_beta) || 10,
        toxicity: r.Toxicity === "" || r.Toxicity == null ? undefined : Number(r.Toxicity),
        followUpMonths: Number(r.Follow_up_months) || undefined,
        dataSource: "observed_ptv_synthetic_file" as const,
        syntheticFlag: true,
        adequateForCorrelation: false,
        sourceFile: fileName,
        note: "PTV-matched synthetic clinical extension",
      })),
    };
  }

  if (/test_toxicity|rbgyanx_input/i.test(base)) {
    return {
      hnTemplates: readSheetRows(wb).map((r) => ({
        patientId: normId(r.PatientID),
        organ: "HN_template",
        age: Number(r.Age) || 60,
        sex: normSex(r.Sex),
        diagnosis: String(r.Site ?? "HeadAndNeck"),
        technique: String(r.Technique ?? ""),
        totalDoseGy: Number(r.Total_Dose_Gy) || 70,
        fractions: Number(r.Fractions) || 33,
        dosePerFractionGy: Number(r.Dose_per_Fraction_Gy) || 2,
        ecog: Number(r.ECOG) || 0,
        stageT: String(r.Stage_T ?? ""),
        stageN: String(r.Stage_N ?? ""),
        smoking: String(r.Smoking ?? ""),
        chemo: String(r.Chemo ?? ""),
        xerostomiaG2: Number(r.Xerostomia_G2plus) || 0,
        dysphagiaG2: Number(r.Dysphagia_G2plus) || 0,
        dermatitisG2: Number(r.Dermatitis_G2plus) || 0,
        toxicity:
          Number(r.Xerostomia_G2plus) || Number(r.Dysphagia_G2plus) || Number(r.Dermatitis_G2plus)
            ? 1
            : 0,
        dataSource: "synthetic_template_hn" as const,
        syntheticFlag: true,
        adequateForCorrelation: false,
        sourceFile: fileName,
        note: "rbGyanX HN template pool",
      })),
    };
  }

  if (/radiobiocalc_clinical/i.test(base)) {
    return parseRadiobiocalcClinicalWorkbook(wb, fileName);
  }

  return parseGenericWorkbook(wb, fileName);
}

function parseRadiobiocalcClinicalWorkbook(
  wb: XLSX.WorkBook,
  fileName: string,
): Partial<ClinicalBundle> {
  const ptvSynthetic: ClinicalRecord[] = [];
  const treatmentParams: ClinicalRecord[] = [];

  if (wb.Sheets.TCP_target) {
    for (const r of readSheetRows(wb, "TCP_target")) {
      const pid = normId(r.anon_id);
      if (!pid || !/^RBX-/i.test(pid)) continue;
      const synthetic = /synthetic/i.test(String(r.source ?? ""));
      ptvSynthetic.push({
        patientId: pid,
        organ: "PTV",
        age: Number(r.age) || 60,
        sex: normSex(r.sex),
        diagnosis: String(r.histology ?? r.site ?? ""),
        technique: String(r.technique ?? ""),
        totalDoseGy: Number(r.total_dose_gy) || 66,
        fractions: Number(r.num_fractions) || 33,
        dosePerFractionGy: Number(r.dose_per_fraction_gy) || 2,
        alphaBeta: Number(r.alpha_beta_tumor) || 10,
        toxicity:
          r.observed_local_failure === "" || r.observed_local_failure == null
            ? undefined
            : Number(r.observed_local_failure),
        followUpMonths: Number(r.followup_months) || undefined,
        ecog: r.ecog === "" ? undefined : Number(r.ecog),
        stageT: String(r.stage_t ?? ""),
        stageN: String(r.stage_n ?? ""),
        smoking: String(r.smoking ?? ""),
        chemo: String(r.concurrent_chemo ?? ""),
        dataSource: synthetic ? "observed_ptv_synthetic_file" : "observed_ptv_synthetic_file",
        syntheticFlag: synthetic,
        adequateForCorrelation: !synthetic,
        sourceFile: fileName,
        note: String(r.source ?? "TCP_target sheet"),
      });
    }
  }

  if (wb.Sheets.NTCP_OAR) {
    for (const r of readSheetRows(wb, "NTCP_OAR")) {
      const link = normId(r.dvh_link);
      if (!link || !/^RBX-(TXT|DCM)/i.test(link)) continue;
      const organ = normOrgan(r.organ);
      if (!organ || organ === "HN_template") continue;
      treatmentParams.push({
        patientId: link,
        organ,
        age: Number(r.age) || 60,
        sex: normSex(r.sex),
        technique: String(r.technique ?? ""),
        totalDoseGy: Number(r.total_dose_gy) || 66,
        fractions: Number(r.num_fractions) || 33,
        dosePerFractionGy: Number(r.dose_per_fraction_gy) || 2,
        alphaBeta: Number(r.alpha_beta_oar) || undefined,
        toxicity:
          r.observed_complication === "" || r.observed_complication == null
            ? undefined
            : Number(r.observed_complication),
        followUpMonths: Number(r.followup_months) || undefined,
        smoking: String(r.smoking ?? ""),
        chemo: String(r.concurrent_chemo ?? ""),
        dataSource: "observed_treatment_params",
        syntheticFlag: false,
        adequateForCorrelation: true,
        sourceFile: fileName,
        note: String(r.ntcp_endpoint ?? "NTCP_OAR sheet"),
      });
    }
  }

  return { ptvSynthetic, treatmentParams };
}

/** Best-effort parse for any clinical xlsx with PatientId + Organ columns. */
function parseGenericWorkbook(wb: XLSX.WorkBook, fileName: string): Partial<ClinicalBundle> {
  const rows = readSheetRows(wb);
  const treatmentParams: ClinicalRecord[] = [];
  for (const r of rows) {
    const pid = normId(r.PatientId ?? r.PatientID ?? r.patient_id);
    const organ = normOrgan(r.Organ ?? r.organ ?? "");
    if (!pid || !organ || organ === "HN_template") continue;
    treatmentParams.push({
      patientId: pid,
      organ,
      age: Number(r.Age ?? r.age) || 60,
      sex: normSex(r.Sex ?? r.sex),
      diagnosis: String(r.Diagnosis ?? ""),
      technique: String(r.Technique ?? ""),
      totalDoseGy: Number(r.TotalDose_Gy ?? r.Total_Dose_Gy) || 66,
      fractions: Number(r.n_frac ?? r.Fractions) || 33,
      dosePerFractionGy: Number(r.dose_per_frac_Gy ?? r.Dose_per_Fraction_Gy) || 2,
      toxicity:
        r.Toxicity != null && r.Toxicity !== ""
          ? Number(r.Toxicity)
          : undefined,
      dataSource: "observed_treatment_params",
      syntheticFlag: false,
      adequateForCorrelation: true,
      sourceFile: fileName,
      note: "Generic xlsx import",
    });
  }
  return treatmentParams.length ? { treatmentParams } : {};
}

export function buildClinicalBundleFromXlsxFiles(
  files: { fileName: string; bytes: ArrayBuffer }[],
): ClinicalBundle {
  let bundle = emptyClinicalBundle();
  for (const f of files) {
    const part = parseWorkbookBytes(f.bytes, f.fileName);
    bundle = mergeClinicalBundles(bundle, {
      treatmentParams: part.treatmentParams ?? [],
      ptvSynthetic: part.ptvSynthetic ?? [],
      hnTemplates: part.hnTemplates ?? [],
      cohortStats: {},
    });
  }
  bundle.cohortStats = buildCohortStats(bundle.treatmentParams);
  return bundle;
}
