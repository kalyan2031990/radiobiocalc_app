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
  isCompositePlan: true,
  structureCount: 3,
  planTherapeuticTcp: 0.88,
  planTherapeuticNtcp: 0.15,
  therapeuticWindowChartParams: {
    prescriptionDose: 70,
    planTcp: 0.88,
    planNtcp: 0.15,
    tcpStructure: "PTV70",
    tcpOrgan: "PTV",
    tcpModel: "poisson_dvh",
    tcpTd50: 70,
    tcpGamma: 1.5,
    ntcpOrgan: "Parotid",
    ntcpStructure: "Parotid_L",
    ntcpModel: "lkb_loglogit",
    ntcpTd50: 28,
    ntcpGamma: 1.2,
  },
  therapeuticWindowChartSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#ddd"/></svg>',
});

if (!report.html.includes("rbGyanX")) {
  console.error("FAIL: missing HTML branding");
  process.exit(1);
}
if (!report.html.includes("<svg")) {
  console.error("FAIL: missing chart SVG in HTML");
  process.exit(1);
}
if (!report.docxText.includes("Visualizations:")) {
  console.error("FAIL: missing chart summary in DOCX text");
  process.exit(1);
}
if (!report.docxBase64 || report.docxBase64.length < 100) {
  console.error("FAIL: missing DOCX base64");
  process.exit(1);
}
console.log("PASS report export:", report.filenameBase, "docx bytes", report.docxBase64.length);
