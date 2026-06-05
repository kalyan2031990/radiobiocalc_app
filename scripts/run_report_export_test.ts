/**
 * On-device report builder smoke test (HTML + DOCX zip).
 */
import { buildAnalysisReport } from "../server/analysis-report";

const report = buildAnalysisReport({
  patientId: "SYN-001",
  planLabel: "Plan A",
  organ: "Parotid",
  structureName: "Parotid_L",
  structureType: "oar",
  model: "lkb_loglogit",
  cancerSite: "HN",
  technique: "IMRT",
  totalDose: 70,
  numFractions: 35,
  ntcp: 0.22,
  bed: 80,
  eqd2: 70,
  meanDose: 26,
  maxDose: 70,
  gEUD: 26,
  doseMetricRows: [{ label: "Dmean", value: "26 Gy", note: "" }],
  includeClinicalInReport: false,
});

if (!report.html.includes("rbGyanX")) {
  console.error("FAIL: missing HTML branding");
  process.exit(1);
}
if (!report.docxBase64 || report.docxBase64.length < 100) {
  console.error("FAIL: missing DOCX base64");
  process.exit(1);
}
console.log("PASS report export:", report.filenameBase, "docx bytes", report.docxBase64.length);
