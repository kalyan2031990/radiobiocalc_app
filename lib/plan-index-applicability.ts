/**
 * When to report stereotactic indices (Paddick CI, gradient index).
 * Patel et al. RPOR 2020; Lee et al. InTech 2015; RTOG 0915 (SBRT GI).
 * Conventional ~2 Gy/fx plans: TCI, RTOG-style CI, ICRU HI — not Paddick/GI.
 */

export type TechniqueProfile = "conventional" | "hypofractionated" | "sbrt";

export type PlanIndexContext = {
  totalDoseGy: number;
  numFractions: number;
  technique?: string;
};

export function dosePerFractionGy(
  totalDoseGy: number,
  numFractions: number,
): number {
  if (numFractions <= 0) return 0;
  return totalDoseGy / numFractions;
}

/** Aligns with desktop rbGyanX engine `infer_technique_profile`. */
export function inferTechniqueProfile(ctx: PlanIndexContext): TechniqueProfile {
  const dpf = dosePerFractionGy(ctx.totalDoseGy, ctx.numFractions);
  const tech = (ctx.technique ?? "").toUpperCase();
  if (tech === "SBRT" || tech === "SRT" || tech === "SRS") return "sbrt";
  if (dpf >= 5.0 || (ctx.numFractions > 0 && ctx.numFractions <= 8 && dpf >= 4.0)) {
    return "sbrt";
  }
  if (dpf >= 2.6) return "hypofractionated";
  return "conventional";
}

export function stereotacticIndicesApplicable(
  profile: TechniqueProfile,
  technique?: string,
): boolean {
  const tech = (technique ?? "").toUpperCase();
  if (tech === "SBRT" || tech === "SRT" || tech === "SRS") return true;
  return profile === "sbrt";
}

export function indexPackLabel(profile: TechniqueProfile): string {
  switch (profile) {
    case "sbrt":
      return "SRS/SRT/SBRT (stereotactic)";
    case "hypofractionated":
      return "Hypofractionated";
    default:
      return "Conventional fractionation";
  }
}

export function indexPackClinicalNote(
  profile: TechniqueProfile,
  stereotactic: boolean,
): string {
  if (stereotactic) {
    return (
      "Paddick conformity index and gradient index (V50%/V100%) are reported for " +
      "stereotactic plans per Patel et al. (2020) and RTOG 0915 SBRT guidance. " +
      "Values use the target DVH only; full isodose volumes may refine CI/GI."
    );
  }
  if (profile === "hypofractionated") {
    return (
      "Hypofractionated plan: report target coverage (TCI), RTOG-style conformity, and " +
      "ICRU homogeneity. Paddick CI and gradient index are reserved for SRS/SRT/SBRT " +
      "(Patel et al. 2020)."
    );
  }
  return (
    "Conventional fractionation (~1.8–2.2 Gy/fx): report TCI, RTOG-style conformity, and " +
    "ICRU homogeneity (Lee et al. 2015). Paddick CI and gradient index are not shown — " +
    "they are standard for SRS/SRT/SBRT, not for routine IMRT/VMAT courses."
  );
}

export function isConventionalFractionation(ctx: PlanIndexContext): boolean {
  return inferTechniqueProfile(ctx) === "conventional";
}
