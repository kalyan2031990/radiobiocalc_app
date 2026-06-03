/**
 * When therapeutic window / TCP–NTCP trade-off applies.
 */

import type { ParsedDvhBundle } from "@/lib/plan-evaluation";
import { structureKeys } from "@/lib/plan-evaluation";
import { inferEvaluationRole } from "@/lib/structure-role";

export type PlanScope = "single_structure" | "multi_structure";

export function analyzePlanScope(bundle: ParsedDvhBundle | null): {
  scope: PlanScope;
  structureCount: number;
  hasTarget: boolean;
  hasOar: boolean;
  therapeuticWindowEligible: boolean;
} {
  if (!bundle) {
    return {
      scope: "single_structure",
      structureCount: 0,
      hasTarget: false,
      hasOar: false,
      therapeuticWindowEligible: false,
    };
  }

  const keys = structureKeys(bundle);
  let hasTarget = false;
  let hasOar = false;

  for (const name of keys) {
    const meta = bundle.structures?.find((s) => s.name === name);
    const role = inferEvaluationRole(name, undefined, meta?.type);
    if (role === "target") hasTarget = true;
    else hasOar = true;
  }

  const multi = keys.length > 1;
  return {
    scope: multi ? "multi_structure" : "single_structure",
    structureCount: keys.length,
    hasTarget,
    hasOar,
    therapeuticWindowEligible: multi && hasTarget && hasOar,
  };
}
