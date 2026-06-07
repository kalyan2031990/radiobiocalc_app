/**
 * Single-patient / single-plan helpers for mobile rbGyanX.
 */

export type { DVHPoint, ParsedDvhBundle } from "@/lib/dvh-bundle-types";
export { mapToLiteratureOrgan } from "@/lib/literature-organ-map";

import type { DVHPoint, ParsedDvhBundle } from "@/lib/dvh-bundle-types";

export function parseDvhBundle(json: string | undefined): ParsedDvhBundle | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ParsedDvhBundle;
  } catch {
    return null;
  }
}

export function structureKeys(bundle: ParsedDvhBundle): string[] {
  return Object.keys(bundle.dvhByStructure ?? {}).filter(
    (k) => (bundle.dvhByStructure[k]?.length ?? 0) > 0,
  );
}

import { inferEvaluationRole } from "@/lib/structure-role";
import { arrayMax, arrayMin } from "@/lib/numeric-safe";

export function inferStructureType(
  name: string,
  declaredType?: string,
  fileHint?: string,
): "target" | "oar" {
  return inferEvaluationRole(name, fileHint, declaredType);
}

export type PlanDescriptiveStats = {
  nPoints: number;
  doseMeanGy: number;
  doseStdGy: number;
  doseMedianGy: number;
  doseMinGy: number;
  doseMaxGy: number;
  volumeTotalCc: number;
  doseCoeffVar: number;
  interpretation: string;
};

export function computePlanDescriptiveStats(dvh: DVHPoint[]): PlanDescriptiveStats {
  if (dvh.length === 0) {
    return {
      nPoints: 0,
      doseMeanGy: 0,
      doseStdGy: 0,
      doseMedianGy: 0,
      doseMinGy: 0,
      doseMaxGy: 0,
      volumeTotalCc: 0,
      doseCoeffVar: 0,
      interpretation: "No DVH points",
    };
  }

  const sorted = [...dvh].sort((a, b) => a.dose - b.dose);
  const doses = sorted.map((p) => p.dose);
  const volMax = arrayMax(sorted.map((p) => p.volume), 1);
  const relV = sorted.map((p) => p.volume / volMax);
  const mean = relV.reduce((s, v, i) => s + v * doses[i], 0);
  const variance =
    relV.reduce((s, v, i) => s + v * Math.pow(doses[i] - mean, 2), 0) /
    Math.max(relV.reduce((a, b) => a + b, 0), 1e-9);
  const std = Math.sqrt(variance);
  const mid = Math.floor(doses.length / 2);
  const median =
    doses.length % 2 === 0
      ? (doses[mid - 1] + doses[mid]) / 2
      : doses[mid];
  const cv = mean > 0 ? std / mean : 0;

  let interpretation = "Uniform dose distribution (low heterogeneity)";
  if (cv > 0.35) {
    interpretation = "High dose heterogeneity — review hot/cold spots for plan QA";
  } else if (cv > 0.2) {
    interpretation = "Moderate heterogeneity — typical for complex OAR DVHs";
  }

  return {
    nPoints: dvh.length,
    doseMeanGy: mean,
    doseStdGy: std,
    doseMedianGy: median,
    doseMinGy: arrayMin(doses),
    doseMaxGy: arrayMax(doses),
    volumeTotalCc: volMax,
    doseCoeffVar: cv,
    interpretation,
  };
}
