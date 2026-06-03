import { BenchmarkComparator } from "../server/benchmark-comparison";
import { benchmarkOrganKey } from "../lib/benchmark-organ-map";
import { buildDocxFromText } from "../server/docx-builder";
import { buildAnalysisReport } from "../server/analysis-report";

let failed = 0;
function assert(c: boolean, m: string) {
  if (!c) {
    console.error("FAIL", m);
    failed++;
  } else console.log("PASS", m);
}

async function main() {
  console.log("=== Phase 2b tests ===\n");
  assert(benchmarkOrganKey("Parotid") === "Parotid", "benchmark map");
  const bench = BenchmarkComparator.getBenchmarkValues("Parotid", "LKB");
  assert(!!bench, "Parotid benchmark");
  const cmp = BenchmarkComparator.compareWithBenchmark(0.89, 0.76, bench!);
  assert(!!cmp.recommendation, "comparison recommendation");

  const docx = buildDocxFromText("Test", "Line1\nLine2");
  assert(docx.length > 1000, "DOCX zip size");
  assert(docx[0] === 0x50 && docx[1] === 0x4b, "DOCX PK signature");

  const report = buildAnalysisReport({
    patientId: "HN-DEMO-001",
    planLabel: "Demo",
    organ: "Parotid",
    structureName: "COMB_PRTD",
    structureType: "oar",
    model: "lkb_loglogit",
    cancerSite: "HN",
    technique: "IMRT",
    totalDose: 70,
    numFractions: 35,
    ntcp: 0.76,
    bed: 72,
    eqd2: 70,
    meanDose: 28,
    maxDose: 70,
    gEUD: 30,
    doseMetricRows: [],
  });
  assert(!!report.docxBase64, "report docx base64");

  process.exit(failed ? 1 : 0);
}

main();
