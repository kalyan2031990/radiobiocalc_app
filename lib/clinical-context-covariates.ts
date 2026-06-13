/**
 * Merge user-entered ClinicalContext with optional xlsx ClinicalRecord for covariate adjustment.
 */
import type { ClinicalContext } from "@/lib/clinical-context";
import { clinicalContextHasValues } from "@/lib/clinical-fields-schema";
import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";

function parseAge(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : undefined;
}

function parseSex(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim().toLowerCase();
  if (s === "male" || s === "m") return "M";
  if (s === "female" || s === "f") return "F";
  return undefined;
}

function parseChemo(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim().toLowerCase();
  if (s === "yes") return "yes";
  if (s === "no") return "none";
  return undefined;
}

function parseSmoking(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim().toLowerCase();
  if (s === "yes" || s === "current" || s === "former") return s;
  if (s === "no") return "no";
  return undefined;
}

function kpsToEcog(kps: string | undefined): number | undefined {
  if (!kps?.trim()) return undefined;
  if (kps === "100" || kps === "90") return 0;
  if (kps === "80" || kps === "70") return 1;
  if (kps === "60 or less") return 2;
  return undefined;
}

function emptyRecord(
  patientId: string,
  organ: string,
  isTarget: boolean,
  totalDoseGy: number,
  fractions: number,
): ClinicalRecord {
  return {
    patientId,
    organ: isTarget ? "PTV" : organ,
    age: 60,
    sex: "M",
    totalDoseGy,
    fractions,
    dosePerFractionGy: fractions > 0 ? totalDoseGy / fractions : 2,
    dataSource: "none",
    syntheticFlag: false,
    adequateForCorrelation: false,
    sourceFile: "user_context",
    note: "User-entered clinical context",
  };
}

/** Merge form fields over xlsx record (user values win when non-empty). */
export function mergeClinicalContextWithRecord(
  ctx: ClinicalContext,
  record: ClinicalRecord | null,
  patientId: string,
  organ: string,
  isTarget: boolean,
  totalDoseGy: number,
  fractions: number,
): ClinicalRecord {
  const base =
    record ??
    emptyRecord(patientId, organ, isTarget, totalDoseGy, fractions);

  const age = parseAge(ctx.age) ?? base.age;
  const sex = parseSex(ctx.sex) ?? base.sex;
  const chemo = parseChemo(ctx.concurrent_chemo) ?? base.chemo;
  const smoking = parseSmoking(ctx.smoking) ?? base.smoking;
  const ecog = kpsToEcog(ctx.kps) ?? base.ecog;

  return {
    ...base,
    patientId: base.patientId || patientId,
    organ: base.organ || (isTarget ? "PTV" : organ),
    age,
    sex,
    chemo,
    smoking,
    ecog,
    stageT: ctx.stage_t?.trim() || base.stageT,
    stageN: ctx.stage_n?.trim() || base.stageN,
    diagnosis: ctx.histology?.trim() || base.diagnosis,
    technique: ctx.technique?.trim() || base.technique,
    totalDoseGy: base.totalDoseGy || totalDoseGy,
    fractions: base.fractions || fractions,
    dosePerFractionGy:
      base.dosePerFractionGy ||
      (fractions > 0 ? totalDoseGy / fractions : 2),
    note: clinicalContextHasValues(ctx)
      ? "User clinical context" + (record ? " + xlsx row" : "")
      : base.note,
  };
}

/**
 * Apply covariates when the user filled optional clinical fields OR when the
 * covariate toggle is on with a linked xlsx row.
 */
export function resolveClinicalForCovariates(args: {
  ctx: ClinicalContext;
  xlsxRecord: ClinicalRecord | null;
  patientId: string;
  organ: string;
  isTarget: boolean;
  totalDoseGy: number;
  fractions: number;
  toggleOn: boolean;
}): { record: ClinicalRecord | null; apply: boolean; userContextDriven: boolean } {
  const userFilled = clinicalContextHasValues(args.ctx);
  const apply =
    userFilled || (args.toggleOn && args.xlsxRecord != null);
  if (!apply) {
    return { record: null, apply: false, userContextDriven: false };
  }
  const record = mergeClinicalContextWithRecord(
    args.ctx,
    args.xlsxRecord,
    args.patientId,
    args.organ,
    args.isTarget,
    args.totalDoseGy,
    args.fractions,
  );
  return { record, apply: true, userContextDriven: userFilled };
}
