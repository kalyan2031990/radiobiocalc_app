/**
 * Evaluate all literature models per structure in a composite plan.
 */
import { getOrganParameters, type RadiobiologyModelId } from "@/server/parameters";
import { offlineCalculate } from "@/lib/offline-engine";
import type { DVHPoint } from "@/lib/dvh-bundle-types";
import { inferTargetTypeFromName } from "@/lib/infer-target-type";

const MODELS: RadiobiologyModelId[] = [
  "lkb_loglogit",
  "lkb_probit",
  "poisson",
  "zaider_minerbo",
  "poisson_dvh",
];

const MODEL_LABELS: Record<string, string> = {
  lkb_loglogit: "LKB log-logistic",
  lkb_probit: "LKB probit",
  poisson: "Poisson",
  zaider_minerbo: "Zaider–Minerbo",
  poisson_dvh: "Poisson LQ-DVH",
};

export type StructureModelProbe = {
  model: string;
  label: string;
  valuePct: number;
  isDefault: boolean;
};

export function probeModelsForStructure(opts: {
  dvh: DVHPoint[];
  totalDose: number;
  numFractions: number;
  organ: string;
  structureType: "target" | "oar";
  cancerSite: string;
  technique: string;
  structureName: string;
  defaultModel: string;
  prescriptionGy?: number;
}): StructureModelProbe[] {
  const rows: StructureModelProbe[] = [];
  const targetType = inferTargetTypeFromName(opts.structureName);
  const rx = opts.prescriptionGy ?? opts.totalDose;
  for (const model of MODELS) {
    if (!getOrganParameters(opts.organ, model)) continue;
    if (opts.structureType === "target" && (model === "lkb_probit" || model === "poisson")) continue;
    const calc = offlineCalculate({
      dvh: opts.dvh,
      totalDose: opts.totalDose,
      numFractions: opts.numFractions,
      organ: opts.organ,
      structureType: opts.structureType,
      model,
      cancerSite: opts.cancerSite,
      technique: opts.technique,
      targetType,
      prescriptionGy: rx,
    });
    const raw = opts.structureType === "target" ? calc.tcp : calc.ntcp;
    if (raw == null || !Number.isFinite(raw)) continue;
    rows.push({
      model: calc.model,
      label: MODEL_LABELS[calc.model] ?? calc.model,
      valuePct: raw * 100,
      isDefault: calc.model === opts.defaultModel || model === opts.defaultModel,
    });
  }
  return rows;
}
