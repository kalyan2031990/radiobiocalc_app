/**
 * Composite report sections — Node-safe (no React Native / AsyncStorage).
 */
import { offlineEvaluateComposite } from "@/lib/offline-engine";
import {
  doseMetricsRowsForEvaluation,
  type GuidelineMetricRow,
} from "@/lib/dose-metrics-guidelines";
import {
  targetPhysicalMetricsFromDvh,
  oarPhysicalMetricsFromDvh,
} from "@/lib/physical-metrics-catalog";
import { formatTcpPercent } from "@/lib/tcp-display";
import type { TherapeuticWindowDoseResponseParams } from "@/lib/report-chart-svg";
import { getOrganParameters } from "@/server/parameters";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";
import type { ClinicalBundle } from "@/lib/clinical-xlsx-core";
import { lookupClinicalRecord } from "@/lib/clinical-xlsx-core";
import {
  applyManuscriptCovariates,
  formatCovariateProbabilityLabel,
} from "@/lib/manuscript-covariates";
import type { StructureModelProbe } from "@/lib/composite-model-probe";
import { defaultCompositeNtcpModel } from "@/lib/structure-role";

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
  modelProbes?: StructureModelProbe[];
  covariateNote?: string;
};

export type CompositeReportExtras = {
  isCompositePlan: boolean;
  structureCount: number;
  compositeStructures: CompositeReportStructureRow[];
  planIndexRows: GuidelineMetricRow[];
  therapeuticSummaryLines: string[];
  abbreviationNotes: string[];
  primaryStructureName?: string;
  planTherapeuticTcp?: number;
  planTherapeuticNtcp?: number;
  planTherapeuticTwi?: number;
  therapeuticWindowChartParams?: TherapeuticWindowDoseResponseParams;
  covariatesApplied?: boolean;
};

const ABBREVIATIONS = [
  "TCP — Tumor Control Probability",
  "NTCP — Normal Tissue Complication Probability",
  "TCI — Target Coverage Index (% target volume ≥ prescription)",
  "CI (RTOG) — Conformity Index = V_RI / V_TV (requires BODY/external DVH)",
  "HI (ICRU-83) — Homogeneity Index = (D2% − D98%) / D50%",
  "TWI — Therapeutic Window Index = TCP − Σ(λ·NTCP) over weighted OARs",
  "UTCP — Uncomplicated TCP (composite therapeutic metric)",
  "P+ — Probability of positive outcome (TCP with complication penalty)",
  "gEUD — generalized Equivalent Uniform Dose",
  "BED — Biologically Effective Dose; EQD2 — EQD2 Gy",
];

export function buildCompositeReportExtrasFromBundle(
  bundle: ParsedDvhBundle,
  options: {
    totalDose: number;
    numFractions: number;
    cancerSite: string;
    technique: string;
    prescriptionGy?: number;
    clinicalBundle?: ClinicalBundle | null;
    applyClinicalCovariates?: boolean;
    tcpModel?: import("@/server/radiobiology").CalculationRequest["model"];
    ntcpModel?: import("@/server/radiobiology").CalculationRequest["model"];
  },
): CompositeReportExtras | null {
  const keys = Object.keys(bundle.dvhByStructure).filter(
    (k) => (bundle.dvhByStructure[k]?.length ?? 0) > 0,
  );
  if (keys.length < 2) return null;

  const prescriptionGy = options.prescriptionGy ?? options.totalDose;
  const evaluation = offlineEvaluateComposite(bundle, {
    totalDose: options.totalDose,
    numFractions: options.numFractions,
    cancerSite: options.cancerSite,
    technique: options.technique,
    prescriptionGy,
    tcpModel: options.tcpModel,
    ntcpModel: options.ntcpModel,
  });

  const indexCtx = {
    totalDoseGy: options.totalDose,
    numFractions: options.numFractions,
    technique: options.technique,
    cancerSite: options.cancerSite,
  };

  const covOn = options.applyClinicalCovariates !== false && !!options.clinicalBundle;
  const patientId = bundle.patientInfo?.patientId ?? "LOCAL";

  const compositeStructures: CompositeReportStructureRow[] =
    evaluation.structureResults.map((s) => {
      const organ = s.literatureOrgan ?? s.structureName;
      const dvh = bundle.dvhByStructure[s.structureName] ?? [];
      const physRows =
        dvh.length > 0
          ? s.structureType === "target"
            ? targetPhysicalMetricsFromDvh(dvh, prescriptionGy, indexCtx)
            : oarPhysicalMetricsFromDvh(dvh, organ, indexCtx)
          : doseMetricsRowsForEvaluation(s.structureType, organ, {
              ...s.doseMetrics,
              minDose: s.doseMetrics.meanDose,
            });

      let probabilityLabel =
        s.structureType === "target" && s.tcp != null
          ? `TCP ${formatTcpPercent(s.tcp)}`
          : s.ntcp != null
            ? `NTCP ${(s.ntcp * 100).toFixed(1)}%`
            : "—";
      let covariateNote: string | undefined;

      if (covOn && options.clinicalBundle) {
        const record = lookupClinicalRecord(
          options.clinicalBundle,
          patientId,
          organ,
          s.structureType === "target",
        );
        const adj = applyManuscriptCovariates(s.tcp, s.ntcp, record, organ);
        if (adj.factorsApplied.length > 0) {
          if (s.structureType === "target" && s.tcp != null && adj.adjustedTcp != null) {
            probabilityLabel = formatCovariateProbabilityLabel("tcp", s.tcp, adj.adjustedTcp, adj);
          }
          if (s.structureType === "oar" && s.ntcp != null && adj.adjustedNtcp != null) {
            probabilityLabel = formatCovariateProbabilityLabel("ntcp", s.ntcp, adj.adjustedNtcp, adj);
            covariateNote = `Exploratory: ${adj.factorsApplied.join(", ")}`;
          }
        }
      }

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
        doseMetricRows: physRows,
        modelProbes: s.modelProbes,
        covariateNote,
      };
    });

  const planIndexRows: GuidelineMetricRow[] = [];
  const ti = evaluation.targetIndices;
  if (ti) {
    planIndexRows.push(
      { label: "TCI (% vol ≥ Rx)", value: `${ti.tciPercent.toFixed(1)}%`, note: "Target coverage" },
      {
        label: "CI (RTOG)",
        value: ti.ciRtog != null ? ti.ciRtog.toFixed(3) : "N/A",
        note: ti.ciRtogNote,
      },
      {
        label: "HI (ICRU-83)",
        value: ti.hiIcru83.toFixed(3),
        note: "(D2−D98)/D50 — primary homogeneity",
      },
      {
        label: "HI (D2/D98 ratio)",
        value: ti.hiRatio.toFixed(3),
        note: "Secondary ratio index",
      },
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
        note: "SBRT — requires BODY DVH",
      });
    }
    if (ti.gradientIndex != null) {
      planIndexRows.push({
        label: "Gradient index",
        value: ti.gradientIndex.toFixed(3),
        note: "SBRT V50%/V100% on BODY",
      });
    }
  }

  const th = evaluation.therapeutic;
  const therapeuticSummaryLines = [
    `PTV TCP ${formatTcpPercent(th.tcpRaw)} (${th.tcpModel} on ${th.tcpStructure})`,
    `Composite NTCP ${(th.ntcpComposite * 100).toFixed(1)}% (max single-organ NTCP across evaluated OARs)`,
    `Critical OAR NTCP ${(th.ntcpCritical * 100).toFixed(1)}%`,
    `UTCP ${(th.utcp * 100).toFixed(1)}%`,
    `P+ ${(th.pPlus * 100).toFixed(1)}%`,
    `TWI ${(th.twi * 100).toFixed(1)}% (${th.twiInterpretation})`,
  ];

  const tcpRow = evaluation.structureResults.find(
    (s) => s.structureName === th.tcpStructure && s.tcp != null,
  );
  const limitingOar =
    th.oarEntries.reduce(
      (best, e) => (e.ntcp > (best?.ntcp ?? -1) ? e : best),
      th.oarEntries[0],
    ) ?? null;

  let therapeuticWindowChartParams: TherapeuticWindowDoseResponseParams | undefined;
  if (tcpRow) {
    const tcpOrgan = tcpRow.literatureOrgan ?? "PTV";
    const tcpParams = getOrganParameters(tcpOrgan, tcpRow.model);
    const ntcpOrgan = limitingOar?.literatureOrgan ?? "Parotid";
    const ntcpModel = defaultCompositeNtcpModel();
    const ntcpParams = getOrganParameters(ntcpOrgan, ntcpModel);
    if (tcpParams && ntcpParams) {
      therapeuticWindowChartParams = {
        prescriptionDose: prescriptionGy,
        planTcp: th.tcpRaw,
        planNtcp: th.ntcpComposite,
        planTwi: th.twi,
        tcpStructure: th.tcpStructure,
        tcpOrgan,
        tcpModel: tcpRow.model,
        tcpTd50: tcpParams.td50 ?? tcpParams.d50 ?? 70,
        tcpGamma: tcpParams.gamma50 ?? tcpParams.gamma ?? 1,
        ntcpOrgan,
        ntcpStructure: limitingOar?.structureName ?? "Composite OARs",
        ntcpModel,
        ntcpTd50: ntcpParams.td50 ?? ntcpParams.d50 ?? 30,
        ntcpGamma: ntcpParams.gamma50 ?? ntcpParams.gamma ?? 1,
        compositeNtcpLabel: `Composite NTCP (max OAR)`,
        allOarSummary: th.oarEntries
          .map((e) => `${e.structureName} ${(e.ntcp * 100).toFixed(0)}%`)
          .join(", "),
      };
    }
  }

  return {
    isCompositePlan: true,
    structureCount: keys.length,
    compositeStructures,
    planIndexRows,
    therapeuticSummaryLines,
    abbreviationNotes: ABBREVIATIONS,
    primaryStructureName: evaluation.primaryTarget ?? undefined,
    planTherapeuticTcp: th.tcpRaw,
    planTherapeuticNtcp: th.ntcpComposite,
    planTherapeuticTwi: th.twi,
    therapeuticWindowChartParams,
    covariatesApplied: covOn,
  };
}
