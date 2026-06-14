/**
 * Shared types for composite plan evaluation (client + API responses).
 */

import type { TargetPlanIndices } from "@/lib/plan-dosimetric-indices";
import type { PlanExplanation } from "@/lib/rbgyanx-explain";
import type { TherapeuticWindowResult } from "@/lib/therapeutic-window";

import type { StructureModelProbe } from "@/lib/composite-model-probe";

export type StructureEvalResult = {
  structureName: string;
  structureType: "target" | "oar";
  literatureOrgan: string | null;
  model: string;
  tcp?: number;
  ntcp?: number;
  modelProbes?: StructureModelProbe[];
  doseMetrics: {
    meanDose: number;
    maxDose: number;
    gEUD: number;
    d95?: number;
    d98?: number;
    d2?: number;
  };
};

export type CompositePlanEvaluation = {
  prescriptionGy: number;
  totalDose: number;
  numFractions: number;
  cancerSite: string;
  targetIndices: TargetPlanIndices | null;
  primaryTarget: string | null;
  structureResults: StructureEvalResult[];
  therapeutic: TherapeuticWindowResult;
  planExplanation: PlanExplanation;
};
