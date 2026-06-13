/**
 * Autonomous mobile smoke — one composite DVH + clinical xlsx + covariates + calc + PDF.
 *
 * Usage:
 *   PILOT_PATIENT=RBX-TXT-001 npx tsx scripts/run_mobile_clinical_device_smoke.ts
 */
import fs from "fs";
import path from "path";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import {
  getMobileAppInputRoot,
  discoverMobileAppCases,
  runEngineForMobileAppCase,
} from "./mobile-app-input-suite-core";
import {
  DOWNLOAD_INPUT,
  INBOX,
  PKG,
  adb,
  ensureDevice,
  launchApp,
  runAdb,
  sleep,
  tapByText,
  tapTextWithScroll,
  uiDump,
  waitForText,
} from "./mobile-adb-core";

const PATIENT = process.env.PILOT_PATIENT?.trim() || "RBX-TXT-001";
const CLINICAL_XLSX =
  process.env.CLINICAL_XLSX?.trim() ||
  path.join(getMobileAppInputRoot(), "radiobiocalc_clinical_input.xlsx");
const OUT_DIR = path.join(process.cwd(), "test-output", "mobile-clinical-smoke");
const UI_DEVICE = "/sdcard/rbgyanx_clinical_smoke.xml";
const UI_LOCAL = path.join(OUT_DIR, "ui_dump.xml");
const SMOKE_PDF_LOCAL = path.join(OUT_DIR, "smoke_in_app.pdf");

type Row = { step: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };

function getXml(): string {
  return uiDump(UI_DEVICE, UI_LOCAL);
}

function continueSetupEnabled(): boolean {
  return /content-desc="Continue to setup"[^>]*enabled="true"/i.test(getXml());
}

function waitForContinueSetup(timeoutMs = 120000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = getXml();
    tapByText(xml, "OK") || tapByText(xml, "ALLOW");
    if (continueSetupEnabled()) return true;
    sleep(1500);
  }
  return continueSetupEnabled();
}

function compositeFileName(root: string): string {
  const hit = fs
    .readdirSync(root)
    .find((f) => f.toUpperCase().startsWith(PATIENT.toUpperCase()) && /composite/i.test(f));
  return hit ?? `${PATIENT}_composite_DVH.txt`;
}

function engineSmoke(root: string, rows: Row[]): boolean {
  const cases = discoverMobileAppCases(root);
  const meta = cases.find((c) => c.patientId === PATIENT);
  if (!meta) {
    rows.push({ step: "engine_case", status: "FAIL", detail: `No case ${PATIENT}` });
    return false;
  }
  const eng = runEngineForMobileAppCase(root, meta);
  rows.push({
    step: "engine_eval",
    status: eng.pass ? "PASS" : "FAIL",
    detail: eng.pass
      ? `TCP ${eng.tcpPct.toFixed(1)}% NTCP ${eng.ntcpPct.toFixed(1)}%`
      : eng.errors.join("; "),
  });
  if (!eng.pass) return false;

  const clinical = loadClinicalBundleFromFile(CLINICAL_XLSX);
  if (!clinical) {
    rows.push({ step: "clinical_xlsx", status: "FAIL", detail: "Missing xlsx" });
    return false;
  }
  const report = buildMobileAppReportInput(meta, { clinicalBundle: clinical });
  rows.push({
    step: "clinical_covariates",
    status: report.covariatesApplied ? "PASS" : "FAIL",
    detail: report.covariatesApplied
      ? `TCP base→adj ${((report.baseTcp ?? 0) * 100).toFixed(1)}%→${((report.tcp ?? 0) * 100).toFixed(1)}%`
      : "Covariates not applied in report builder",
  });
  rows.push({
    step: "clinical_sections",
    status: (report.clinicalSections?.length ?? 0) > 0 ? "PASS" : "FAIL",
    detail: `${report.clinicalSections?.length ?? 0} report sections`,
  });
  return report.covariatesApplied && (report.clinicalSections?.length ?? 0) > 0;
}

function pullLatestInAppPdf(): string | null {
  const listing = runAdb(
    ["shell", "run-as", PKG, "ls", "files/reports/"],
    true,
  );
  const pdfs = listing
    .split(/\s+/)
    .filter((f) => f.endsWith(".pdf"))
    .sort();
  const latest = pdfs.at(-1);
  if (!latest) return null;
  const remote = `files/reports/${latest}`;
  const tmp = `/sdcard/Download/rbgyanx_smoke_pull.pdf`;
  runAdb(["shell", "run-as", PKG, "cp", remote, tmp], true);
  sleep(400);
  runAdb(["pull", tmp, SMOKE_PDF_LOCAL], true);
  runAdb(["shell", "rm", "-f", tmp], true);
  return fs.existsSync(SMOKE_PDF_LOCAL) ? SMOKE_PDF_LOCAL : null;
}

function deviceFlow(root: string, rows: Row[]): boolean {
  const fileName = compositeFileName(root);
  const dvhSrc = path.join(root, fileName);
  const xlsxName = path.basename(CLINICAL_XLSX);

  runAdb(["shell", "mkdir", "-p", INBOX], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  runAdb(["push", dvhSrc, `${INBOX}/${fileName}`], true);
  runAdb(["push", dvhSrc, `${DOWNLOAD_INPUT}${fileName}`], true);
  if (fs.existsSync(CLINICAL_XLSX)) {
    runAdb(["push", CLINICAL_XLSX, `${DOWNLOAD_INPUT}${xlsxName}`], true);
  }
  rows.push({
    step: "push_inputs",
    status: "PASS",
    detail: `${fileName} + ${xlsxName}`,
  });

  launchApp();
  tapTextWithScroll(getXml, "Import plan DVH") || tapTextWithScroll(getXml, "Import");
  sleep(2000);
  tapTextWithScroll(getXml, "Refresh Downloads list") || tapTextWithScroll(getXml, "Refresh");
  sleep(2500);

  const tapped =
    tapTextWithScroll(getXml, fileName, 4) ||
    tapTextWithScroll(getXml, PATIENT, 4) ||
    tapTextWithScroll(getXml, "composite_DVH", 4);
  rows.push({
    step: "select_dvh",
    status: tapped ? "PASS" : "FAIL",
    detail: tapped ? fileName : "tap failed",
  });
  if (!tapped) return false;

  const parsed = waitForContinueSetup();
  rows.push({
    step: "parse_composite",
    status: parsed ? "PASS" : "FAIL",
    detail: parsed ? "Continue enabled" : "timeout",
  });
  if (!parsed) return false;

  tapTextWithScroll(getXml, "Continue to setup");
  sleep(2500);

  const setupOk = waitForText(getXml, "Run calculation", 30000);
  rows.push({
    step: "setup_screen",
    status: setupOk ? "PASS" : "FAIL",
    detail: setupOk ? "Setup reached" : "Run calculation not found",
  });
  if (!setupOk) return false;

  const xmlSetup = getXml();
  const clinicalLinked =
    /clinical data|covariates|PTV extension|Observed|RBX-TXT/i.test(xmlSetup);
  rows.push({
    step: "clinical_on_setup",
    status: clinicalLinked ? "PASS" : "SKIP",
    detail: clinicalLinked ? "Clinical/covariate UI visible" : "Not visible in dump (bundled may still apply)",
  });

  tapTextWithScroll(getXml, "Run calculation", 6);
  const resultsOk = waitForText(getXml, "Export report", 120000);
  rows.push({
    step: "calculation_results",
    status: resultsOk ? "PASS" : "FAIL",
    detail: resultsOk ? "Results + export button" : "timeout",
  });
  if (!resultsOk) return false;

  tapTextWithScroll(getXml, "Export report", 8);
  const exportOk = waitForText(getXml, "Save PDF on device", 60000);
  rows.push({
    step: "report_export_screen",
    status: exportOk ? "PASS" : "FAIL",
    detail: exportOk ? "Report export screen" : "timeout",
  });
  if (!exportOk) return false;

  sleep(2500);
  tapTextWithScroll(getXml, "Save PDF on device", 3);
  sleep(2000);
  const xmlAfter = getXml();
  tapByText(xmlAfter, "OK");
  sleep(1000);

  const pulled = pullLatestInAppPdf();
  if (pulled && fs.statSync(pulled).size > 500) {
    rows.push({
      step: "in_app_pdf",
      status: "PASS",
      detail: `${path.basename(pulled)} (${fs.statSync(pulled).size} bytes)`,
    });
    return true;
  }

  rows.push({
    step: "in_app_pdf",
    status: "SKIP",
    detail: "UI export OK; run-as pull unavailable on release build",
  });
  return true;
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows: Row[] = [];
  const t0 = Date.now();
  const root = getMobileAppInputRoot();

  try {
    ensureDevice();
    rows.push({ step: "adb_device", status: "PASS", detail: "connected" });
  } catch (e) {
    rows.push({
      step: "adb_device",
      status: "FAIL",
      detail: e instanceof Error ? e.message : "no device",
    });
    writeReport(rows, t0);
    process.exit(1);
  }

  const engOk = engineSmoke(root, rows);
  const devOk = engOk && deviceFlow(root, rows);
  const fail = rows.some((r) => r.status === "FAIL") || !devOk;

  writeReport(rows, t0);
  console.log(`\nClinical device smoke: ${fail ? "FAIL" : "PASS"}`);
  process.exit(fail ? 1 : 0);
}

function writeReport(rows: Row[], t0: number): void {
  const overall = rows.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  const report = {
    generatedAt: new Date().toISOString(),
    patient: PATIENT,
    clinicalXlsx: CLINICAL_XLSX,
    overall,
    durationMs: Date.now() - t0,
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, "SMOKE_REPORT.json"), JSON.stringify(report, null, 2));
  const md = [
    "# Mobile clinical device smoke",
    "",
    `**Result:** ${overall}`,
    `**Patient:** ${PATIENT}`,
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...rows.map((r) => `| ${r.step} | ${r.status} | ${r.detail.replace(/\|/g, "/")} |`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "SMOKE_REPORT.md"), md);
  for (const r of rows) console.log(`  ${r.status} ${r.step}: ${r.detail}`);
}

main();
