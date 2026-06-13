/**
 * Map imported clinical xlsx record → ClinicalContext form fields.
 */
import type { ClinicalContext } from "@/lib/clinical-context";
import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";

function sexLabel(sex: string): string {
  if (sex === "F") return "Female";
  if (sex === "M") return "Male";
  return "Unknown";
}

function chemoLabel(chemo?: string): string {
  const c = String(chemo ?? "").trim();
  if (!c || /^none$/i.test(c) || /^no$/i.test(c)) return "No";
  return "Yes";
}

function smokingLabel(smoking?: string): string {
  const s = String(smoking ?? "").trim();
  if (!s) return "Unknown";
  if (/^yes$/i.test(s)) return "Yes";
  if (/^no$/i.test(s)) return "No";
  return s;
}

export function clinicalRecordToContext(record: ClinicalRecord): ClinicalContext {
  const ctx: ClinicalContext = {
    age: String(record.age),
    sex: sexLabel(record.sex),
  };
  if (record.chemo) ctx.concurrent_chemo = chemoLabel(record.chemo);
  if (record.smoking) ctx.smoking = smokingLabel(record.smoking);
  if (record.stageT) ctx.stage_t = record.stageT;
  if (record.stageN) ctx.stage_n = record.stageN;
  if (record.ecog != null) {
    const ecog = record.ecog;
    ctx.kps = ecog <= 1 ? "90" : ecog === 2 ? "70" : "60 or less";
  }
  if (record.diagnosis) ctx.histology = record.diagnosis.slice(0, 80);
  if (record.technique) ctx.technique = record.technique;
  if (record.toxicity != null) ctx.observed_toxicity = record.toxicity ? "Yes" : "No";
  return ctx;
}

export function extractPatientIdFromDvh(
  patientInfoId?: string,
  fileName?: string,
): string {
  const fromInfo = String(patientInfoId ?? "").trim();
  const idMatch = fromInfo.match(/\d{4}-\d+/);
  if (idMatch) return idMatch[0]!;
  const fromFile = fileName?.match(/(\d{4}-\d+)/);
  if (fromFile) return fromFile[1]!;
  return fromInfo.replace(/\s+/g, "") || "";
}
