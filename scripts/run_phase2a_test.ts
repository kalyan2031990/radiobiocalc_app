/**
 * Phase 2a — Gyan layer smoke tests (provenance, references, reports).
 */
import { getProvenanceFor, getReferenceLibrary } from "../server/literature-references";
import { buildAnalysisReport } from "../server/analysis-report";
import { registerEmailUser, loginEmailUser } from "../server/email-auth-store";
import fs from "fs";
import path from "path";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("PASS:", msg);
  }
}

async function main() {
  console.log("=== Phase 2a tests ===\n");

  const prov = getProvenanceFor("Parotid", "lkb_loglogit");
  assert(!!prov, "Parotid LKB provenance");
  assert((prov?.references.length ?? 0) >= 2, "Parotid has multiple references");
  assert(!!prov?.organCitation?.includes("Parotid"), "Parotid organ citation");

  const ptv = getProvenanceFor("PTV", "zaider_minerbo");
  assert(!!ptv, "PTV Zaider provenance");

  const lib = getReferenceLibrary();
  assert(lib.length >= 10, "Reference library size");

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
    doseMetricRows: [{ label: "Dmean", value: "28.0 Gy", note: "QUANTEC" }],
  });
  assert(report.html.includes("rbGyanX"), "Report HTML branding");
  assert(report.html.includes("QUANTEC") || report.html.includes("Parotid"), "Report HTML references");
  assert(report.docxText.includes("NTCP"), "Report DOCX text");
  assert(report.docxBase64.length > 100, "Report DOCX base64");

  const testEmail = `test_${Date.now()}@rbgyanx.local`;
  const reg = await registerEmailUser(testEmail, "testpass12", "Test User");
  assert(reg.success, "Email register");
  const login = await loginEmailUser(testEmail, "testpass12");
  assert(login.success, "Email login");
  const bad = await loginEmailUser(testEmail, "wrong");
  assert(!bad.success, "Email login rejects bad password");

  const bg = path.join(process.cwd(), "assets", "images", "rbgyanx-mobile-background.png");
  assert(fs.existsSync(bg), "Theme background image present");

  console.log(failed ? `\n${failed} failure(s)` : "\nAll Phase 2a checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
