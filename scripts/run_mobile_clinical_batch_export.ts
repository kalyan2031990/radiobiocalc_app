/**
 * Batch-export composite PDFs with clinical xlsx context — PC + phone Downloads.
 *
 * Usage:
 *   CLINICAL_XLSX=C:\...\radiobiocalc_clinical_input.xlsx npx tsx scripts/run_mobile_clinical_batch_export.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { buildAnalysisReport } from "../server/analysis-report";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import { clinicalBundleSummary } from "../lib/clinical-xlsx-core";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
  runAllMobileAppCases,
} from "./mobile-app-input-suite-core";

const DEFAULT_XLSX =
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\radbiocalc_input\\rbGyaX_mobile_app_input\\radiobiocalc_clinical_input.xlsx";

const CLINICAL_XLSX = process.env.CLINICAL_XLSX?.trim() || DEFAULT_XLSX;
const LOCAL_OUT =
  process.env.PILOT_OUT_DIR?.trim() ||
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\rbGyanX_mobile_paper\\radbiocalc_app_input_output\\rbGyanX_v1.0.0_validation_output\\exported_pdfs_clinical";
const DEVICE_EXPORT_DIR = "/sdcard/Download/rbGyaX_exported_reports_clinical/";

type Row = {
  patientId: string;
  pdf: string;
  clinicalSource: string;
  status: "PASS" | "FAIL";
  detail: string;
};

function adb(): string {
  return path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
}

function runAdb(args: string[], ignoreExit = false): string {
  const r = spawnSync(adb(), args, { encoding: "utf8", stdio: "pipe" });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  if (r.status !== 0 && !ignoreExit) throw new Error(out || `adb exit ${r.status}`);
  return out;
}

function findBrowser(): string | null {
  for (const p of [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function htmlToPdf(browser: string, html: string, pdfPath: string): void {
  const htmlPath = pdfPath.replace(/\.pdf$/i, ".html");
  fs.writeFileSync(htmlPath, html, "utf8");
  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const r = spawnSync(
    browser,
    ["--headless=new", "--disable-gpu", "--no-sandbox", `--print-to-pdf=${pdfPath}`, fileUrl],
    { encoding: "utf8", stdio: "pipe" },
  );
  if (r.status !== 0 || !fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 500) {
    throw new Error(
      ((r.stderr ?? "") + (r.stdout ?? "")).trim() || "PDF render failed",
    );
  }
}

function main(): void {
  const root = getMobileAppInputRoot();
  const clinicalBundle = loadClinicalBundleFromFile(CLINICAL_XLSX);
  if (!clinicalBundle) {
    console.error("Clinical xlsx not found:", CLINICAL_XLSX);
    process.exit(1);
  }

  const summary = clinicalBundleSummary(clinicalBundle);
  console.log(`Clinical: ${path.basename(CLINICAL_XLSX)}`);
  console.log(
    `  treatment=${summary.treatmentRows} ptv=${summary.ptvRows} templates=${summary.templateRows}`,
  );

  const { cases, results } = runAllMobileAppCases(root);
  const passN = results.filter((r) => r.pass).length;
  console.log(`Engine: ${passN}/${results.length} PASS`);
  if (passN !== results.length) {
    console.error("Engine validation failed — fix before export");
    process.exit(1);
  }

  const browser = findBrowser();
  if (!browser) {
    console.error("Chrome or Edge required for PDF export.");
    process.exit(1);
  }

  try {
    runAdb(["devices"], false);
  } catch {
    console.error("No adb device connected.");
    process.exit(1);
  }

  fs.mkdirSync(LOCAL_OUT, { recursive: true });
  for (const f of fs.readdirSync(LOCAL_OUT)) {
    if (/^rbGyanX_.*\.(pdf|html)$/i.test(f)) {
      fs.unlinkSync(path.join(LOCAL_OUT, f));
    }
  }
  runAdb(["shell", "mkdir", "-p", DEVICE_EXPORT_DIR], true);
  runAdb(["push", CLINICAL_XLSX, `${DEVICE_EXPORT_DIR}${path.basename(CLINICAL_XLSX)}`], true);

  const rows: Row[] = [];
  const indexLines = [
    "# rbGyanX clinical composite reports",
    "",
    `Generated: ${new Date().toISOString()}`,
    `DVH root: ${root}`,
    `Clinical xlsx: ${CLINICAL_XLSX}`,
    `Clinical in report: ON · Covariate adjustment: ON (when clinical row linked)`,
    "",
    "| Patient | PDF | Clinical source | Status |",
    "|---------|-----|-----------------|--------|",
  ];

  for (const meta of cases) {
    const pdfName = `rbGyanX_${meta.patientId}_clinical_composite.pdf`;
    const localPdf = path.join(LOCAL_OUT, pdfName);
    try {
      const input = buildMobileAppReportInput(meta, {
        clinicalBundle,
        includeClinicalInReport: true,
      });
      const report = buildAnalysisReport(input);
      htmlToPdf(browser, report.html, localPdf);
      runAdb(["push", localPdf, `${DEVICE_EXPORT_DIR}${pdfName}`], false);
      const src = meta.clinicalTcpSource + (meta.clinicalTcpSynthetic ? " (syn)" : "");
      rows.push({
        patientId: meta.patientId,
        pdf: pdfName,
        clinicalSource: src,
        status: "PASS",
        detail: "pushed",
      });
      indexLines.push(`| ${meta.patientId} | ${pdfName} | ${src} | PASS |`);
      console.log(`PASS ${meta.patientId} → ${DEVICE_EXPORT_DIR}${pdfName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        patientId: meta.patientId,
        pdf: pdfName,
        clinicalSource: "—",
        status: "FAIL",
        detail: msg,
      });
      indexLines.push(`| ${meta.patientId} | ${pdfName} | — | FAIL: ${msg} |`);
      console.error(`FAIL ${meta.patientId}: ${msg}`);
    }
  }

  const indexLocal = path.join(LOCAL_OUT, "INDEX.md");
  fs.writeFileSync(indexLocal, indexLines.join("\n"));
  runAdb(["push", indexLocal, `${DEVICE_EXPORT_DIR}INDEX.md`], true);

  const exportSummary = {
    generatedAt: new Date().toISOString(),
    clinicalXlsx: CLINICAL_XLSX,
    deviceDir: DEVICE_EXPORT_DIR,
    localDir: LOCAL_OUT,
    enginePass: passN,
    engineTotal: results.length,
    pass: rows.filter((r) => r.status === "PASS").length,
    total: rows.length,
    rows,
  };
  fs.writeFileSync(
    path.join(LOCAL_OUT, "EXPORT_SUMMARY.json"),
    JSON.stringify(exportSummary, null, 2),
  );

  console.log(`\nDone: ${exportSummary.pass}/${rows.length} clinical PDFs`);
  console.log(`PC: ${LOCAL_OUT}`);
  console.log(`Phone: ${DEVICE_EXPORT_DIR}`);
  if (exportSummary.pass !== rows.length) process.exit(1);
}

main();
