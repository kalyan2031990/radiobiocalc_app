/**
 * BED / EQD₂ fractionation-equivalence table with LQL damping (F6).
 */

import { calculateBED, calculateEQD2 } from "@/server/radiobiology";
import { calculateBED_LQL } from "@/server/advanced-models";

export type FractionationCategory =
  | "conventional"
  | "moderate_hypo"
  | "hypofractionated"
  | "sbrt"
  | "custom";

export type FractionationSchedule = {
  id: string;
  label: string;
  totalDoseGy: number;
  numFractions: number;
  category: FractionationCategory;
  isCustom?: boolean;
};

export const PRESET_SCHEDULES: FractionationSchedule[] = [
  { id: "conv-50-25", label: "50 Gy / 25 fx", totalDoseGy: 50, numFractions: 25, category: "conventional" },
  { id: "conv-60-30", label: "60 Gy / 30 fx", totalDoseGy: 60, numFractions: 30, category: "conventional" },
  { id: "conv-66-33", label: "66 Gy / 33 fx", totalDoseGy: 66, numFractions: 33, category: "conventional" },
  { id: "conv-70-35", label: "70 Gy / 35 fx", totalDoseGy: 70, numFractions: 35, category: "conventional" },
  { id: "mod-55-20", label: "55 Gy / 20 fx", totalDoseGy: 55, numFractions: 20, category: "moderate_hypo" },
  { id: "mod-60-20", label: "60 Gy / 20 fx", totalDoseGy: 60, numFractions: 20, category: "moderate_hypo" },
  { id: "hypo-40-15", label: "40 Gy / 15 fx", totalDoseGy: 40, numFractions: 15, category: "hypofractionated" },
  { id: "hypo-48-12", label: "48 Gy / 12 fx", totalDoseGy: 48, numFractions: 12, category: "hypofractionated" },
  { id: "hypo-52-13", label: "52 Gy / 13 fx", totalDoseGy: 52, numFractions: 13, category: "hypofractionated" },
  { id: "sbrt-30-5", label: "30 Gy / 5 fx (SBRT)", totalDoseGy: 30, numFractions: 5, category: "sbrt" },
  { id: "sbrt-40-4", label: "40 Gy / 4 fx (SBRT)", totalDoseGy: 40, numFractions: 4, category: "sbrt" },
  { id: "sbrt-48-4", label: "48 Gy / 4 fx (SBRT)", totalDoseGy: 48, numFractions: 4, category: "sbrt" },
  { id: "sbrt-50-5", label: "50 Gy / 5 fx (SBRT)", totalDoseGy: 50, numFractions: 5, category: "sbrt" },
  { id: "sbrt-54-3", label: "54 Gy / 3 fx (SBRT)", totalDoseGy: 54, numFractions: 3, category: "sbrt" },
  { id: "sbrt-60-3", label: "60 Gy / 3 fx (SBRT)", totalDoseGy: 60, numFractions: 3, category: "sbrt" },
  { id: "sbrt-20-1", label: "20 Gy / 1 fx (SRS)", totalDoseGy: 20, numFractions: 1, category: "sbrt" },
];

export const CATEGORY_COLORS: Record<FractionationCategory, string> = {
  conventional: "#2563EB",
  moderate_hypo: "#7C3AED",
  hypofractionated: "#D97706",
  sbrt: "#DC2626",
  custom: "#64748B",
};

export type EquivalenceRow = {
  schedule: FractionationSchedule;
  dosePerFractionGy: number;
  bedTumor: number;
  eqd2Tumor: number;
  bedLate: number;
  eqd2Late: number;
  lqlApplied: boolean;
};

export type EquivalenceTableOptions = {
  alphaBetaTumor?: number;
  alphaBetaLate?: number;
  useLqlDamping?: boolean;
  lqlTransitionGy?: number;
  customSchedules?: FractionationSchedule[];
};

const DEFAULT_AB_TUMOR = 10;
const DEFAULT_AB_LATE = 3;

function alphaBetaToAlphaBetaRatio(alphaBeta: number): { alpha: number; beta: number } {
  const beta = 0.035;
  return { alpha: alphaBeta * beta, beta };
}

export function computeEquivalenceRow(
  schedule: FractionationSchedule,
  opts: EquivalenceTableOptions = {},
): EquivalenceRow {
  const abTumor = opts.alphaBetaTumor ?? DEFAULT_AB_TUMOR;
  const abLate = opts.alphaBetaLate ?? DEFAULT_AB_LATE;
  const dpf = schedule.totalDoseGy / schedule.numFractions;
  const useLql = opts.useLqlDamping === true && dpf > 6;
  const dt = opts.lqlTransitionGy ?? 6;

  let bedTumor: number;
  let bedLate: number;
  if (useLql) {
    const { alpha: aT, beta: bT } = alphaBetaToAlphaBetaRatio(abTumor);
    const { alpha: aL, beta: bL } = alphaBetaToAlphaBetaRatio(abLate);
    bedTumor = calculateBED_LQL(dpf, schedule.numFractions, aT, bT, 0, dt);
    bedLate = calculateBED_LQL(dpf, schedule.numFractions, aL, bL, 0, dt);
  } else {
    bedTumor = calculateBED(schedule.totalDoseGy, schedule.numFractions, abTumor);
    bedLate = calculateBED(schedule.totalDoseGy, schedule.numFractions, abLate);
  }

  const eqd2Tumor = calculateEQD2(schedule.totalDoseGy, schedule.numFractions, abTumor);
  const eqd2Late = calculateEQD2(schedule.totalDoseGy, schedule.numFractions, abLate);

  return {
    schedule,
    dosePerFractionGy: dpf,
    bedTumor,
    eqd2Tumor,
    bedLate,
    eqd2Late,
    lqlApplied: useLql,
  };
}

export function buildEquivalenceTable(
  opts: EquivalenceTableOptions = {},
): EquivalenceRow[] {
  const schedules = [
    ...PRESET_SCHEDULES,
    ...(opts.customSchedules ?? []),
  ];
  return schedules.map((s) => computeEquivalenceRow(s, opts));
}

export function equivalenceTableToCsv(rows: EquivalenceRow[]): string {
  const header =
    "Schedule,Total Gy,Fractions,d/fx,BED (tumor),EQD2 (tumor),BED (late),EQD2 (late),LQL";
  const lines = rows.map((r) =>
    [
      r.schedule.label,
      r.schedule.totalDoseGy,
      r.schedule.numFractions,
      r.dosePerFractionGy.toFixed(2),
      r.bedTumor.toFixed(2),
      r.eqd2Tumor.toFixed(2),
      r.bedLate.toFixed(2),
      r.eqd2Late.toFixed(2),
      r.lqlApplied ? "yes" : "no",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function buildCustomSchedule(
  totalDoseGy: number,
  numFractions: number,
  label?: string,
): FractionationSchedule {
  return {
    id: `custom-${totalDoseGy}-${numFractions}-${Date.now()}`,
    label: label ?? `${totalDoseGy} Gy / ${numFractions} fx (custom)`,
    totalDoseGy,
    numFractions,
    category: "custom",
    isCustom: true,
  };
}
