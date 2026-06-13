/**
 * Build AnalysisReportInput for batch/mobile PDF export (offline engine parity).
 */
import fs from "fs";
import { offlineParseDvh, offlineCalculate } from "@/lib/offline-engine";
import { doseMetricsRowsForEvaluation } from "@/lib/dose-metrics-guidelines";
import { buildClinicalReportSections } from "@/lib/clinical-report-sections";
import { clinicalRecordToContext } from "@/lib/clinical-record-map";
import {
  clinicalDataSourceLabel,
  lookupClinicalRecord,
  type ClinicalBundle,
} from "@/lib/clinical-xlsx-core";
import { applyManuscriptCovariates } from "@/lib/manuscript-covariates";
import { resolveClinicalForCovariates } from "@/lib/clinical-context-covariates";
import type { ClinicalContext } from "@/lib/clinical-context";
import { buildCompositeReportExtrasFromBundle } from "@/lib/export-report-composite";
import { attachReportCharts } from "@/lib/enrich-report-charts";
import {
  defaultModelForRole,
  inferEvaluationRole,
  literatureOrganForRole,
} from "@/lib/structure-role";
import type { AnalysisReportInput } from "@/server/analysis-report";
import type { MobileAppCase } from "../scripts/mobile-app-input-suite-core";

export type MobileReportOptions = {
  clinicalBundle?: ClinicalBundle | null;
  /** User-entered clinical context (form fields); merged over xlsx for covariates. */
  clinicalContext?: ClinicalContext;
  includeClinicalInReport?: boolean;
  /** When clinical bundle is supplied, default true (log-odds adjustment). */
  applyClinicalCovariates?: boolean;
};

function covariatesEnabled(options: MobileReportOptions): boolean {
  if (options.applyClinicalCovariates === false) return false;
  return !!options.clinicalBundle;
}

export function buildMobileAppReportInput(
  meta: MobileAppCase,
  options: MobileReportOptions = {},
): AnalysisReportInput {
  const content = fs.readFileSync(meta.filePath, "utf8");
  const bundle = offlineParseDvh(content, meta.fileName);
  const cancerSite = "HN";
  const technique = "IMRT";
  const includeClinical = options.includeClinicalInReport !== false;

  const compositeExtras = buildCompositeReportExtrasFromBundle(bundle, {
    totalDose: meta.totalDoseGy,
    numFractions: meta.fractions,
    cancerSite,
    technique,
  });

  const primaryName =
    compositeExtras?.primaryStructureName ??
    bundle.structures.find((s) => s.type === "target")?.name ??
    bundle.structures[0]?.name ??
    "Structure";

  const struct = bundle.structures.find((s) => s.name === primaryName);
  const structureType = inferEvaluationRole(
    primaryName,
    meta.patientId,
    struct?.type,
  );
  const organ = literatureOrganForRole(primaryName, meta.patientId) ?? "PTV";
  const model = defaultModelForRole(structureType, cancerSite) as
    | "lkb_loglogit"
    | "lkb_probit"
    | "poisson"
    | "zaider_minerbo"
    | "poisson_dvh";

  const dvh = bundle.dvhByStructure[primaryName] ?? [];
  const calc = offlineCalculate({
    dvh,
    totalDose: meta.totalDoseGy,
    numFractions: meta.fractions,
    organ,
    structureType,
    model,
    cancerSite,
    technique,
    targetType: "PTV",
  });

  const doseMetricRows = doseMetricsRowsForEvaluation(
    structureType,
    organ,
    calc.doseMetrics,
  );

  let tcp = calc.tcp;
  let ntcp = calc.ntcp;
  let baseTcp: number | undefined;
  let baseNtcp: number | undefined;
  let covariatesApplied = false;
  let clinicalSections: AnalysisReportInput["clinicalSections"];
  let clinicalDataNote: string | undefined;

  if (options.clinicalBundle) {
    const record = lookupClinicalRecord(
      options.clinicalBundle,
      meta.patientId,
      organ,
      structureType === "target",
    );
    clinicalDataNote = `${clinicalDataSourceLabel(record)}${record.syntheticFlag ? " (synthetic-flagged)" : ""}`;
    const clinicalCtx =
      options.clinicalContext ??
      (includeClinical ? clinicalRecordToContext(record) : {});
    if (includeClinical) {
      clinicalSections = buildClinicalReportSections(
        clinicalCtx,
        cancerSite,
        structureType,
        organ,
      );
    }
    const cov = resolveClinicalForCovariates({
      ctx: clinicalCtx,
      xlsxRecord: record,
      patientId: meta.patientId,
      organ,
      isTarget: structureType === "target",
      totalDoseGy: meta.totalDoseGy,
      fractions: meta.fractions,
      toggleOn: covariatesEnabled(options),
    });
    if (cov.apply && cov.record) {
      const adj = applyManuscriptCovariates(calc.tcp, calc.ntcp, cov.record, organ);
      if (structureType === "target" && adj.adjustedTcp != null && calc.tcp != null) {
        baseTcp = calc.tcp;
        tcp = adj.adjustedTcp;
        covariatesApplied = adj.factorsApplied.length > 0;
      }
      if (structureType === "oar" && adj.adjustedNtcp != null && calc.ntcp != null) {
        baseNtcp = calc.ntcp;
        ntcp = adj.adjustedNtcp;
        covariatesApplied = adj.factorsApplied.length > 0;
      }
    }
  }

  const result: AnalysisReportInput = {
    patientId: meta.patientId,
    planLabel: meta.fileName.replace(/_composite_DVH\.txt$/i, ""),
    organ,
    structureName: primaryName,
    structureType,
    model: calc.model,
    cancerSite,
    technique,
    totalDose: meta.totalDoseGy,
    numFractions: meta.fractions,
    tcp,
    ntcp,
    baseTcp,
    baseNtcp,
    covariatesApplied,
    clinicalDataNote,
    bed: calc.bed,
    eqd2: calc.eqd2,
    meanDose: calc.doseMetrics.meanDose,
    maxDose: calc.doseMetrics.maxDose,
    gEUD: calc.doseMetrics.gEUD ?? calc.doseMetrics.meanDose,
    doseMetricRows,
    includeClinicalInReport: includeClinical && !!clinicalSections?.length,
    clinicalSections,
    ...(compositeExtras ?? {}),
  };

  if (covariatesApplied && compositeExtras?.therapeuticSummaryLines?.length) {
    const lines = [...compositeExtras.therapeuticSummaryLines];
    if (structureType === "target" && tcp != null && baseTcp != null) {
      lines[0] =
        `TCP ${(tcp * 100).toFixed(1)}% (covariate-adjusted from base ${(baseTcp * 100).toFixed(1)}%)`;
    }
    result.therapeuticSummaryLines = lines;
  }

  return attachReportCharts(result);
}
