/**
 * Composite report sections — Node-safe (no React Native / AsyncStorage).
 */
import { offlineEvaluateComposite } from "@/lib/offline-engine";
import {
  doseMetricsRowsForEvaluation,
  type GuidelineMetricRow,
} from "@/lib/dose-metrics-guidelines";
import { formatTcpPercent } from "@/lib/tcp-display";
import type { TherapeuticWindowDoseResponseParams } from "@/lib/report-chart-svg";
import { getOrganParameters } from "@/server/parameters";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";

export type CompositeReportStructureRow = {
  structureName: string;
  structureType: "target" | "oar";
  organ: string;
  model: string;
  probabilityLabel: string;
  meanDose: string;
  maxDose: string;
  d95: string;
  doseMetricRows: GuidelineMetricRow[];
};

export type CompositeReportExtras = {
  isCompositePlan: boolean;
  structureCount: number;
  compositeStructures: CompositeReportStructureRow[];
  planIndexRows: GuidelineMetricRow[];
  therapeuticSummaryLines: string[];
  primaryStructureName?: string;
  planTherapeuticTcp?: number;
  planTherapeuticNtcp?: number;
  therapeuticWindowChartParams?: TherapeuticWindowDoseResponseParams;
};

export function buildCompositeReportExtrasFromBundle(
  bundle: ParsedDvhBundle,
  options: {
    totalDose: number;
    numFractions: number;
    cancerSite: string;
    technique: string;
  },
): CompositeReportExtras | null {
  const keys = Object.keys(bundle.dvhByStructure).filter(
    (k) => (bundle.dvhByStructure[k]?.length ?? 0) > 0,
  );
  if (keys.length < 2) return null;

  const evaluation = offlineEvaluateComposite(bundle, {
    totalDose: options.totalDose,
    numFractions: options.numFractions,
    cancerSite: options.cancerSite,
    technique: options.technique,
    prescriptionGy: options.totalDose,
  });

  const compositeStructures: CompositeReportStructureRow[] =
    evaluation.structureResults.map((s) => {
      const organ = s.literatureOrgan ?? s.structureName;
      const probabilityLabel =
        s.structureType === "target" && s.tcp != null
          ? `TCP ${formatTcpPercent(s.tcp)}`
          : s.ntcp != null
            ? `NTCP ${(s.ntcp * 100).toFixed(1)}%`
            : "—";

      return {
        structureName: s.structureName,
        structureType: s.structureType,
        organ,
        model: s.model,
        probabilityLabel,
        meanDose: `${s.doseMetrics.meanDose.toFixed(2)} Gy`,
        maxDose: `${s.doseMetrics.maxDose.toFixed(2)} Gy`,
        d95:
          s.doseMetrics.d95 != null && Number.isFinite(s.doseMetrics.d95)
            ? `${s.doseMetrics.d95.toFixed(1)} Gy`
            : "—",
        doseMetricRows: doseMetricsRowsForEvaluation(
          s.structureType,
          organ,
          s.doseMetrics,
        ),
      };
    });

  const planIndexRows: GuidelineMetricRow[] = [];
  const ti = evaluation.targetIndices;
  if (ti) {
    planIndexRows.push(
      { label: "TCI (% vol ≥ Rx)", value: `${ti.tciPercent.toFixed(1)}%`, note: "Target coverage" },
      { label: "CI (RTOG)", value: ti.ciRtog.toFixed(3), note: "Conformity" },
      { label: "HI (ICRU)", value: ti.hiIcu.toFixed(3), note: "D2%/D98%" },
      { label: "HI (modified)", value: ti.hiModified.toFixed(3), note: "(D2−D98)/D50" },
      { label: "D98%", value: `${ti.d98.toFixed(1)} Gy` },
      { label: "D95%", value: `${ti.d95.toFixed(1)} Gy` },
      { label: "D2%", value: `${ti.d2.toFixed(1)} Gy` },
      { label: "V95% Rx", value: `${ti.v95Rx.toFixed(1)}%` },
      { label: "V100% Rx", value: `${ti.v100Rx.toFixed(1)}%` },
    );
    if (ti.ciPaddick != null) {
      planIndexRows.push({
        label: "CI (Paddick)",
        value: ti.ciPaddick.toFixed(3),
        note: "SBRT",
      });
    }
    if (ti.gradientIndex != null) {
      planIndexRows.push({
        label: "Gradient index",
        value: ti.gradientIndex.toFixed(3),
        note: "SBRT",
      });
    }
  }

  const th = evaluation.therapeutic;
  const therapeuticSummaryLines = [
    `TCP ${formatTcpPercent(th.tcpRaw)} (${th.tcpModel} on ${th.tcpStructure})`,
    `Composite NTCP ${(th.ntcpComposite * 100).toFixed(1)}%`,
    `Critical OAR NTCP ${(th.ntcpCritical * 100).toFixed(1)}%`,
    `UTCP ${(th.utcp * 100).toFixed(1)}%`,
    `P+ ${(th.pPlus * 100).toFixed(1)}%`,
    `TWI ${(th.twi * 100).toFixed(1)} (${th.twiInterpretation})`,
  ];

  const tcpRow = evaluation.structureResults.find(
    (s) => s.structureName === th.tcpStructure && s.tcp != null,
  );
  const limitingOar =
    th.oarEntries.reduce(
      (best, e) => (e.ntcp > (best?.ntcp ?? -1) ? e : best),
      th.oarEntries[0],
    ) ?? null;
  const ntcpRow = limitingOar
    ? evaluation.structureResults.find((s) => s.structureName === limitingOar.structureName)
    : evaluation.structureResults.find((s) => s.ntcp != null);

  let therapeuticWindowChartParams: TherapeuticWindowDoseResponseParams | undefined;
  if (tcpRow && ntcpRow) {
    const tcpOrgan = tcpRow.literatureOrgan ?? "PTV";
    const ntcpOrgan = ntcpRow.literatureOrgan ?? ntcpRow.structureName;
    const tcpParams = getOrganParameters(tcpOrgan, tcpRow.model);
    const ntcpParams = getOrganParameters(ntcpOrgan, ntcpRow.model);
    if (tcpParams && ntcpParams) {
      therapeuticWindowChartParams = {
        prescriptionDose: options.totalDose,
        planTcp: th.tcpRaw,
        planNtcp: th.ntcpComposite,
        tcpStructure: th.tcpStructure,
        tcpOrgan,
        tcpModel: tcpRow.model,
        tcpTd50: tcpParams.td50 ?? tcpParams.d50 ?? 70,
        tcpGamma: tcpParams.gamma50 ?? tcpParams.gamma ?? 1,
        ntcpOrgan,
        ntcpStructure: ntcpRow.structureName,
        ntcpModel: ntcpRow.model,
        ntcpTd50: ntcpParams.td50 ?? ntcpParams.d50 ?? 30,
        ntcpGamma: ntcpParams.gamma50 ?? ntcpParams.gamma ?? 1,
      };
    }
  }

  return {
    isCompositePlan: true,
    structureCount: keys.length,
    compositeStructures,
    planIndexRows,
    therapeuticSummaryLines,
    primaryStructureName: evaluation.primaryTarget ?? undefined,
    planTherapeuticTcp: th.tcpRaw,
    planTherapeuticNtcp: th.ntcpComposite,
    therapeuticWindowChartParams,
  };
}
