/**
 * Side-by-side plan (A/B) comparison — runs engine twice, diffs metrics (F1).
 */

import type { CompositePlanEvaluation, StructureEvalResult } from "@/lib/composite-plan-types";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import { offlineEvaluateComposite } from "@/lib/offline-engine";

export type PlanEvalOptions = {
  totalDose: number;
  numFractions: number;
  cancerSite?: string;
  technique?: string;
  prescriptionGy?: number;
  fileHint?: string;
};

export type StructureCompareRow = {
  structureName: string;
  structureType: "target" | "oar";
  planA: StructureMetrics;
  planB: StructureMetrics;
  delta: StructureMetrics;
  better: Partial<Record<MetricKey, "A" | "B" | "neutral">>;
};

export type CompositeCompareRow = {
  label: string;
  planA: number;
  planB: number;
  delta: number;
  better: "A" | "B" | "neutral";
  key: MetricKey;
};

export type MetricKey =
  | "d95"
  | "tci"
  | "geud"
  | "ntcp"
  | "tcpDisplay"
  | "tcpUncapped"
  | "utcp"
  | "pPlus"
  | "twi";

export type StructureMetrics = {
  d95?: number;
  tci?: number;
  geud: number;
  ntcp?: number;
  tcpDisplay?: number;
  tcpUncapped?: number;
};

export type PlanCompareResult = {
  planA: CompositePlanEvaluation;
  planB: CompositePlanEvaluation;
  labelA: string;
  labelB: string;
  structureRows: StructureCompareRow[];
  compositeRows: CompositeCompareRow[];
};

function structureMetrics(
  s: StructureEvalResult,
  evalData: CompositePlanEvaluation,
): StructureMetrics {
  const tci =
    s.structureType === "target" && evalData.targetIndices
      ? evalData.targetIndices.tciPercent
      : undefined;
  return {
    d95: s.doseMetrics.d95,
    tci,
    geud: s.doseMetrics.gEUD,
    ntcp: s.ntcp,
    tcpDisplay: s.tcp,
    tcpUncapped: s.tcp,
  };
}

function deltaNum(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null || b == null) return undefined;
  return b - a;
}

function betterForMetric(
  key: MetricKey,
  a: number | undefined,
  b: number | undefined,
): "A" | "B" | "neutral" {
  if (a == null || b == null) return "neutral";
  const d = b - a;
  if (Math.abs(d) < 0.05) return "neutral";
  const higherBetter = key === "d95" || key === "tci" || key === "tcpDisplay" || key === "tcpUncapped" || key === "utcp" || key === "pPlus" || key === "twi";
  if (higherBetter) return d > 0 ? "B" : "A";
  return d < 0 ? "B" : "A";
}

export function evaluatePlan(
  bundle: ParsedDvhBundle,
  options: PlanEvalOptions,
): CompositePlanEvaluation {
  return offlineEvaluateComposite(bundle, options);
}

export function comparePlans(
  evalA: CompositePlanEvaluation,
  evalB: CompositePlanEvaluation,
  labelA = "Plan A",
  labelB = "Plan B",
): PlanCompareResult {
  const names = new Set([
    ...evalA.structureResults.map((s) => s.structureName),
    ...evalB.structureResults.map((s) => s.structureName),
  ]);

  const structureRows: StructureCompareRow[] = [...names].sort().map((name) => {
    const a = evalA.structureResults.find((s) => s.structureName === name);
    const b = evalB.structureResults.find((s) => s.structureName === name);
    const mA: StructureMetrics = a
      ? structureMetrics(a, evalA)
      : { geud: 0 };
    const mB: StructureMetrics = b
      ? structureMetrics(b, evalB)
      : { geud: 0 };
    const delta: StructureMetrics = {
      d95: deltaNum(mA.d95, mB.d95),
      tci: deltaNum(mA.tci, mB.tci),
      geud: (mB.geud ?? 0) - (mA.geud ?? 0),
      ntcp: deltaNum(mA.ntcp, mB.ntcp),
      tcpDisplay: deltaNum(mA.tcpDisplay, mB.tcpDisplay),
      tcpUncapped: deltaNum(mA.tcpUncapped, mB.tcpUncapped),
    };
    const better: StructureCompareRow["better"] = {};
    for (const k of ["d95", "tci", "geud", "ntcp", "tcpDisplay", "tcpUncapped"] as const) {
      better[k] = betterForMetric(k, mA[k], mB[k]);
    }
    return {
      structureName: name,
      structureType: a?.structureType ?? b?.structureType ?? "oar",
      planA: mA,
      planB: mB,
      delta,
      better,
    };
  });

  const twA = evalA.therapeutic;
  const twB = evalB.therapeutic;
  const compositeRows: CompositeCompareRow[] = [
    {
      key: "tcpDisplay",
      label: "TCP (display)",
      planA: twA.tcp,
      planB: twB.tcp,
      delta: twB.tcp - twA.tcp,
      better: betterForMetric("tcpDisplay", twA.tcp, twB.tcp),
    },
    {
      key: "tcpUncapped",
      label: "TCP (uncapped)",
      planA: twA.tcpRaw,
      planB: twB.tcpRaw,
      delta: twB.tcpRaw - twA.tcpRaw,
      better: betterForMetric("tcpUncapped", twA.tcpRaw, twB.tcpRaw),
    },
    {
      key: "ntcp",
      label: "Composite NTCP",
      planA: twA.ntcpComposite,
      planB: twB.ntcpComposite,
      delta: twB.ntcpComposite - twA.ntcpComposite,
      better: betterForMetric("ntcp", twA.ntcpComposite, twB.ntcpComposite),
    },
    {
      key: "utcp",
      label: "UTCP",
      planA: twA.utcp,
      planB: twB.utcp,
      delta: twB.utcp - twA.utcp,
      better: betterForMetric("utcp", twA.utcp, twB.utcp),
    },
    {
      key: "pPlus",
      label: "P+",
      planA: twA.pPlus,
      planB: twB.pPlus,
      delta: twB.pPlus - twA.pPlus,
      better: betterForMetric("pPlus", twA.pPlus, twB.pPlus),
    },
    {
      key: "twi",
      label: "TWI",
      planA: twA.twi,
      planB: twB.twi,
      delta: twB.twi - twA.twi,
      better: betterForMetric("twi", twA.twi, twB.twi),
    },
  ];

  if (evalA.targetIndices && evalB.targetIndices) {
    compositeRows.unshift({
      key: "tci",
      label: "TCI (%)",
      planA: evalA.targetIndices.tciPercent,
      planB: evalB.targetIndices.tciPercent,
      delta: evalB.targetIndices.tciPercent - evalA.targetIndices.tciPercent,
      better: betterForMetric("tci", evalA.targetIndices.tciPercent, evalB.targetIndices.tciPercent),
    });
    compositeRows.unshift({
      key: "d95",
      label: "D95 (Gy)",
      planA: evalA.targetIndices.d95 ?? 0,
      planB: evalB.targetIndices.d95 ?? 0,
      delta: (evalB.targetIndices.d95 ?? 0) - (evalA.targetIndices.d95 ?? 0),
      better: betterForMetric("d95", evalA.targetIndices.d95, evalB.targetIndices.d95),
    });
  }

  return { planA: evalA, planB: evalB, labelA, labelB, structureRows, compositeRows };
}

export function compareTwoBundles(
  bundleA: ParsedDvhBundle,
  bundleB: ParsedDvhBundle,
  optionsA: PlanEvalOptions,
  optionsB: PlanEvalOptions,
  labelA = "Plan A",
  labelB = "Plan B",
): PlanCompareResult {
  const evalA = evaluatePlan(bundleA, optionsA);
  const evalB = evaluatePlan(bundleB, optionsB);
  return comparePlans(evalA, evalB, labelA, labelB);
}
