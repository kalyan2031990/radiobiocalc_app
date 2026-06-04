/**
 * Optional clinical covariates — presets today; multivariable adjustment (py_ntcpx-style) later.
 *
 * Current TCP/NTCP formulas do NOT consume ClinicalContext. Values are stored for
 * reports, MDT traceability, and future regression layers.
 */

import type { ClinicalContext } from "@/lib/clinical-context";
import type { CancerSiteId } from "@/server/sites-registry";

export type ClinicalModifierPlan = {
  /** When false, only DVH + literature LQ parameters drive TCP/NTCP */
  appliesToCalculation: false;
  /** Factors a future MV model could ingest (aligned with common HN / thoracic literature) */
  plannedFactors: readonly string[];
  summary: string;
};

const PLANNED_FACTORS = [
  "age",
  "sex",
  "bmi",
  "smoking",
  "hpv",
  "concurrent_chemo",
  "systemic_agent",
  "kps",
  "histology",
  "stage_t",
  "stage_n",
  "stage_m",
] as const;

/**
 * Describe how clinical presets relate to calculation (honest gap vs py_ntcpx MV regression).
 */
export function clinicalModifierPlan(
  _site: CancerSiteId | string,
  _ctx: ClinicalContext,
): ClinicalModifierPlan {
  return {
    appliesToCalculation: false,
    plannedFactors: PLANNED_FACTORS,
    summary:
      "Clinical presets are optional documentation only. TCP/NTCP use DVH + QUANTEC/RTOG literature parameters. Planned: site-specific multivariable adjustment (e.g. HPV, chemo, age for HN TCP) as an explicit opt-in layer — not silent defaults.",
  };
}
