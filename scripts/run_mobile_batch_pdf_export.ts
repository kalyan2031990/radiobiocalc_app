/**
 * Batch-export composite-plan PDF reports for rbGyaX_mobile_app_input and push to phone Downloads.
 *
 * Uses the same offline report builder as the mobile app (buildAnalysisReport + composite sections).
 * PDFs are rendered via headless Chrome/Edge, then adb push to:
 *   /sdcard/Download/rbGyaX_exported_reports/
 *
 * Usage:
 *   npx tsx scripts/run_mobile_batch_pdf_export.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { buildAnalysisReport } from "../server/analysis-report";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
} from "./mobile-app-input-suite-core";

const DEVICE_EXPORT_DIR = "/sdcard/Download/rbGyaX_exported_reports/";
const LOCAL_OUT = path.join(process.cwd(), "test-output", "mobile-exported-pdfs");

type Row = {
  patientId: string;
  pdf: string;
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
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
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
      ((r.stderr ?? "") + (r.stdout ?? "")).trim() || "PDF render failed (empty or missing file)",
    );
  }
}

function main(): void {
  const root = getMobileAppInputRoot();
  const cases = discoverMobileAppCases(root);
  const browser = findBrowser();

  if (!browser) {
    console.error("Chrome or Edge required for headless PDF export.");
    process.exit(1);
  }

  try {
    runAdb(["devices"], false);
  } catch {
    console.error("No adb device connected.");
    process.exit(1);
  }

  fs.mkdirSync(LOCAL_OUT, { recursive: true });
  runAdb(["shell", "mkdir", "-p", DEVICE_EXPORT_DIR], true);

  const rows: Row[] = [];
  const indexLines = [
    "# rbGyanX exported composite reports",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${root}`,
    `Engine: offline mobile report builder (composite + physical indices)`,
    "",
    "| Patient | PDF | Status |",
    "|---------|-----|--------|",
  ];

  for (const meta of cases) {
    const pdfName = `rbGyanX_${meta.patientId}_composite.pdf`;
    const localPdf = path.join(LOCAL_OUT, pdfName);
    try {
      const input = buildMobileAppReportInput(meta);
      const report = buildAnalysisReport(input);
      htmlToPdf(browser, report.html, localPdf);
      runAdb(["push", localPdf, `${DEVICE_EXPORT_DIR}${pdfName}`], false);
      rows.push({ patientId: meta.patientId, pdf: pdfName, status: "PASS", detail: "pushed" });
      indexLines.push(`| ${meta.patientId} | ${pdfName} | PASS |`);
      console.log(`PASS ${meta.patientId} → ${DEVICE_EXPORT_DIR}${pdfName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({ patientId: meta.patientId, pdf: pdfName, status: "FAIL", detail: msg });
      indexLines.push(`| ${meta.patientId} | ${pdfName} | FAIL: ${msg} |`);
      console.error(`FAIL ${meta.patientId}: ${msg}`);
    }
  }

  const indexMd = indexLines.join("\n");
  const indexLocal = path.join(LOCAL_OUT, "INDEX.md");
  fs.writeFileSync(indexLocal, indexMd);
  runAdb(["push", indexLocal, `${DEVICE_EXPORT_DIR}INDEX.md`], true);

  const summary = {
    generatedAt: new Date().toISOString(),
    deviceDir: DEVICE_EXPORT_DIR,
    localDir: LOCAL_OUT,
    pass: rows.filter((r) => r.status === "PASS").length,
    total: rows.length,
    rows,
  };
  fs.writeFileSync(path.join(LOCAL_OUT, "EXPORT_SUMMARY.json"), JSON.stringify(summary, null, 2));

  const passN = summary.pass;
  console.log(`\nDone: ${passN}/${rows.length} PDFs → ${DEVICE_EXPORT_DIR}`);
  if (passN !== rows.length) process.exit(1);
}

main();
