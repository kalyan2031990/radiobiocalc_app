/**
 * One-case clinical + covariate report check (RBX-TXT-001).
 */
import { buildAnalysisReport } from "../server/analysis-report";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
} from "./mobile-app-input-suite-core";

const PATIENT = process.env.PILOT_PATIENT?.trim() || "RBX-TXT-001";

function main(): void {
  const root = getMobileAppInputRoot();
  const xlsx = `${root}\\radiobiocalc_clinical_input.xlsx`;
  const bundle = loadClinicalBundleFromFile(xlsx);
  if (!bundle) {
    console.error("Clinical xlsx not found:", xlsx);
    process.exit(1);
  }

  const meta = discoverMobileAppCases(root).find((c) => c.patientId === PATIENT);
  if (!meta) {
    console.error("Case not found:", PATIENT);
    process.exit(1);
  }

  const input = buildMobileAppReportInput(meta, {
    clinicalBundle: bundle,
    includeClinicalInReport: true,
  });
  const report = buildAnalysisReport(input);

  if (!input.therapeuticWindowChartSvg) {
    console.error("FAIL: missing therapeutic window chart");
    process.exit(1);
  }
  if (!report.html.includes("Therapeutic window")) {
    console.error("FAIL: chart not embedded in HTML");
    process.exit(1);
  }
  if (!input.clinicalSections?.length) {
    console.error("FAIL: clinical sections missing");
    process.exit(1);
  }

  console.log("PASS", PATIENT);
  console.log("  clinical sections:", input.clinicalSections.length);
  console.log("  covariates applied:", !!input.covariatesApplied);
  console.log("  chart params:", !!input.therapeuticWindowChartParams);
  console.log("  report:", report.filenameBase);
}

main();
