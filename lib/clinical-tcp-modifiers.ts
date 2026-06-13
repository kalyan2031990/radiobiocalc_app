/**
 * Optional clinical covariates — user context and xlsx rows adjust TCP/NTCP when provided.
 */

import type { ClinicalContext } from "@/lib/clinical-context";
import { clinicalContextHasValues } from "@/lib/clinical-fields-schema";
import type { CancerSiteId } from "@/server/sites-registry";

export type ClinicalModifierPlan = {
  appliesToCalculation: boolean;
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

export function clinicalModifierPlan(
  _site: CancerSiteId | string,
  ctx: ClinicalContext,
): ClinicalModifierPlan {
  const applies = clinicalContextHasValues(ctx);
  return {
    appliesToCalculation: applies,
    plannedFactors: PLANNED_FACTORS,
    summary: applies
      ? "Clinical context fields you entered adjust TCP/NTCP via exploratory log-odds covariates (age, sex, chemo, smoking, KPS/ECOG)."
      : "Optional clinical fields adjust TCP/NTCP when filled, or when xlsx clinical data is linked with covariates enabled.",
  };
}
