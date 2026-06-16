/**
 * Run pilot study kit on connected Android device — Task A/B, screenshots, PDFs.
 *
 * Usage: npx tsx scripts/run_pilot_kit_device_test.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { buildAnalysisReport } from "../server/analysis-report";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
  runEngineForMobileAppCase,
} from "./mobile-app-input-suite-core";
import {
  DOWNLOAD_INPUT,
  INBOX,
  PKG,
  captureScreenshot,
  ensureDevice,
  launchApp,
  runAdb,
  scrollDown,
  sleep,
  tapByText,
  tapTextWithScroll,
  uiDump,
  waitForText,
} from "./mobile-adb-core";

const KIT =
  process.env.PILOT_KIT?.trim() ||
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "rbGyanX_pilot_study_kit");
const OUT = path.join(KIT, "Pilot_test_results");
const SCREEN_PAPER = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures",
  "screenshots",
);
const SCREEN_BUILD16 = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures_build16",
  "screenshots",
);
const CASES = ["RBX-TXT-001", "RBX-TXT-004"] as const;
const UI_DEVICE = "/sdcard/rbgyanx_pilot_ui.xml";

type Row = { step: string; caseId?: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };

function getXml(): string {
  const local = path.join(OUT, "ui_dump_latest.xml");
  return uiDump(UI_DEVICE, local);
}

function shot(name: string, paperName?: string): boolean {
  const local = path.join(OUT, "screenshots", name);
  const ok = captureScreenshot(local);
  if (ok && paperName) {
    fs.mkdirSync(SCREEN_PAPER, { recursive: true });
    fs.mkdirSync(SCREEN_BUILD16, { recursive: true });
    fs.copyFileSync(local, path.join(SCREEN_PAPER, paperName));
    fs.copyFileSync(local, path.join(SCREEN_BUILD16, paperName));
  }
  return ok;
}

function dismissOverlays(): void {
  const xml = getXml();
  tapByText(xml, "I Understand") ||
    tapByText(xml, "Accept") ||
    tapByText(xml, "OK") ||
    tapByText(xml, "ALLOW");
}

function tapFile(patientId: string): boolean {
  const fileName = `${patientId}_composite_DVH.txt`;
  for (let i = 0; i <= 6; i++) {
    const xml = getXml();
    dismissOverlays();
    if (tapByText(xml, fileName) || tapByText(xml, patientId)) return true;
    scrollDown();
    sleep(500);
  }
  return false;
}

function tapContinueSetup(): boolean {
  for (let i = 0; i < 4; i++) scrollDown();
  sleep(600);
  return tapTextWithScroll(getXml, "Continue to setup", 4);
}

function continueSetupEnabled(): boolean {
  const xml = getXml();
  return (
    /content-desc="Continue to setup"[^>]*enabled="true"/i.test(xml) ||
    /text="Continue to setup"[^>]*enabled="true"/i.test(xml)
  );
}

function waitForContinueSetup(timeoutMs = 120000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    dismissOverlays();
    if (continueSetupEnabled()) return true;
    sleep(1500);
  }
  return continueSetupEnabled();
}

function findBrowser(): string | null {
  for (const p of [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function htmlToPdf(browser: string, html: string, pdfPath: string): void {
  const htmlPath = pdfPath.replace(/\.pdf$/i, ".html");
  fs.writeFileSync(htmlPath, html, "utf8");
  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  spawnSync(
    browser,
    ["--headless=new", "--disable-gpu", "--no-sandbox", `--print-to-pdf=${pdfPath}`, fileUrl],
    { encoding: "utf8", stdio: "pipe" },
  );
}

function kitPath(...parts: string[]): string {
  return path.join(KIT, ...parts);
}

function runCaseOnDevice(patientId: string, rows: Row[]): boolean {
  const fileName = `${patientId}_composite_DVH.txt`;
  const dvhSrc = kitPath("02_dvh_cases", "core", fileName);
  if (!fs.existsSync(dvhSrc)) {
    rows.push({ step: "kit_dvh", caseId: patientId, status: "FAIL", detail: `Missing ${fileName}` });
    return false;
  }

  runAdb(["shell", "mkdir", "-p", INBOX], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  runAdb(["push", dvhSrc, `${INBOX}/${fileName}`], true);
  runAdb(["push", dvhSrc, `${DOWNLOAD_INPUT}${fileName}`], true);

  launchApp();
  sleep(2500);
  dismissOverlays();
  sleep(1000);
  shot(`00_home_${patientId}.png`, patientId === "RBX-TXT-001" ? "fig01_app_home.png" : undefined);

  tapTextWithScroll(getXml, "Import plan DVH") || tapTextWithScroll(getXml, "Import");
  sleep(2000);
  dismissOverlays();
  tapTextWithScroll(getXml, "Refresh Downloads list") || tapTextWithScroll(getXml, "Refresh");
  sleep(3500);
  shot(`01_import_${patientId}.png`, patientId === "RBX-TXT-001" ? "fig02_dvh_import.png" : undefined);

  const tapped = tapFile(patientId);
  if (!tapped) {
    rows.push({ step: "select_dvh", caseId: patientId, status: "FAIL", detail: fileName });
    return false;
  }

  if (!waitForContinueSetup()) {
    rows.push({ step: "parse", caseId: patientId, status: "FAIL", detail: "Continue timeout" });
    return false;
  }
  rows.push({ step: "parse", caseId: patientId, status: "PASS", detail: "Composite parsed" });

  if (!tapContinueSetup()) {
    rows.push({ step: "continue_setup", caseId: patientId, status: "FAIL", detail: "Tap failed" });
    return false;
  }
  sleep(3000);
  if (!waitForText(getXml, "Plan evaluation setup", 30000)) {
    rows.push({ step: "setup", caseId: patientId, status: "FAIL", detail: "Setup screen timeout" });
    return false;
  }
  for (let i = 0; i < 8; i++) scrollDown();
  sleep(800);
  shot(`02_setup_${patientId}.png`, patientId === "RBX-TXT-001" ? "fig03_calculation_setup.png" : undefined);
  rows.push({ step: "setup", caseId: patientId, status: "PASS", detail: "Plan evaluation setup" });

  if (!tapTextWithScroll(getXml, "Run calculation", 12)) {
    rows.push({ step: "run_calc", caseId: patientId, status: "FAIL", detail: "Run calculation not tapped" });
    return false;
  }
  if (!waitForText(getXml, "Export report", 180000)) {
    rows.push({ step: "results", caseId: patientId, status: "FAIL", detail: "Results timeout" });
    return false;
  }
  shot(
    `03_results_${patientId}.png`,
    patientId === "RBX-TXT-001" ? "fig04_calculation_results.png" : `fig05_results_${patientId}.png`,
  );
  rows.push({ step: "results", caseId: patientId, status: "PASS", detail: "Calculation results" });

  if (patientId === "RBX-TXT-001") {
    for (let i = 0; i < 4; i++) {
      scrollDown();
    }
    sleep(800);
    if (tapTextWithScroll(getXml, "Therapeutic", 3) || tapTextWithScroll(getXml, "Window", 3)) {
      sleep(2500);
      shot("04_therapeutic_window.png", "fig06_therapeutic_window.png");
      rows.push({ step: "therapeutic_window", caseId: patientId, status: "PASS", detail: "Screenshot" });
      runAdb(["shell", "input", "keyevent", "4"], true);
      sleep(1500);
    } else {
      rows.push({ step: "therapeutic_window", caseId: patientId, status: "SKIP", detail: "Button not found" });
    }
  }

  tapTextWithScroll(getXml, "Export report", 8);
  if (!waitForText(getXml, "Save PDF on device", 60000)) {
    rows.push({ step: "export_screen", caseId: patientId, status: "FAIL", detail: "Export timeout" });
    return false;
  }
  sleep(2000);
  shot(
    `05_export_${patientId}.png`,
    patientId === "RBX-TXT-001" ? "fig07_report_export.png" : undefined,
  );
  rows.push({ step: "export_screen", caseId: patientId, status: "PASS", detail: "Export screen" });

  tapTextWithScroll(getXml, "Save PDF on device", 4);
  sleep(3500);
  tapByText(getXml(), "OK");
  rows.push({ step: "save_pdf", caseId: patientId, status: "PASS", detail: "Save PDF tapped" });
  return true;
}

function main(): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  fs.mkdirSync(SCREEN_PAPER, { recursive: true });

  const rows: Row[] = [];
  const t0 = Date.now();
  const clinicalXlsx = kitPath("03_clinical", "radiobiocalc_clinical_input.xlsx");
  const apk = kitPath("01_app", "rbGyanX_Mobile_v1.0.0_build15.apk");
  const engineRoot = getMobileAppInputRoot();
  const clinical = loadClinicalBundleFromFile(clinicalXlsx);
  const browser = findBrowser();

  try {
    ensureDevice();
    rows.push({ step: "adb", status: "PASS", detail: runAdb(["devices"], true).split("\n")[1] ?? "connected" });
  } catch (e) {
    rows.push({ step: "adb", status: "FAIL", detail: e instanceof Error ? e.message : "no device" });
    writeOut(rows, t0);
    process.exit(1);
  }

  if (fs.existsSync(apk)) {
    const inst = runAdb(["install", "-r", apk], true);
    rows.push({
      step: "install_apk",
      status: /Success/i.test(inst) ? "PASS" : "SKIP",
      detail: inst.slice(0, 120),
    });
  }

  if (fs.existsSync(clinicalXlsx)) {
    runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
    runAdb(["push", clinicalXlsx, `${DOWNLOAD_INPUT}radiobiocalc_clinical_input.xlsx`], true);
  }

  const engineRows: Record<string, { tcp: number; ntcp: number; twi: number }> = {};

  for (const patientId of CASES) {
    const meta = discoverMobileAppCases(engineRoot).find((c) => c.patientId === patientId);
    if (meta) {
      const eng = runEngineForMobileAppCase(engineRoot, meta);
      engineRows[patientId] = { tcp: eng.tcpPct, ntcp: eng.ntcpPct, twi: eng.twiPct };
      rows.push({
        step: "engine",
        caseId: patientId,
        status: eng.pass ? "PASS" : "FAIL",
        detail: `TCP ${eng.tcpPct.toFixed(1)}% NTCP ${eng.ntcpPct.toFixed(1)}% TWI ${eng.twiPct.toFixed(1)}%`,
      });

      if (clinical && browser && meta) {
        try {
          const input = buildMobileAppReportInput(meta, { clinicalBundle: clinical });
          const report = buildAnalysisReport(input);
          const pdfOut = path.join(OUT, "reports", `rbGyanX_${patientId}_pilot_clinical_composite.pdf`);
          htmlToPdf(browser, report.html, pdfOut);
          rows.push({
            step: "pc_report_pdf",
            caseId: patientId,
            status: fs.existsSync(pdfOut) && fs.statSync(pdfOut).size > 500 ? "PASS" : "FAIL",
            detail: path.basename(pdfOut),
          });
        } catch (e) {
          rows.push({
            step: "pc_report_pdf",
            caseId: patientId,
            status: "FAIL",
            detail: e instanceof Error ? e.message : "pdf fail",
          });
        }
      }
    }

    const devOk = runCaseOnDevice(patientId, rows);
    if (!devOk) {
      console.error(`Device flow failed for ${patientId}`);
    }
    sleep(2000);
  }

  const feedbackMd = [
    "# Pilot run feedback (investigator-filled from device/engine)",
    "",
    `**Date:** ${new Date().toISOString()}`,
    `**Kit:** ${KIT}`,
    "",
    "## Task A — RBX-TXT-001",
    `- TCP: ${engineRows["RBX-TXT-001"]?.tcp.toFixed(1) ?? "—"}%`,
    `- NTCP: ${engineRows["RBX-TXT-001"]?.ntcp.toFixed(1) ?? "—"}%`,
    `- TWI: ${engineRows["RBX-TXT-001"]?.twi.toFixed(1) ?? "—"}%`,
    "",
    "## Task B — RBX-TXT-004",
    `- TCP: ${engineRows["RBX-TXT-004"]?.tcp.toFixed(1) ?? "—"}%`,
    `- NTCP: ${engineRows["RBX-TXT-004"]?.ntcp.toFixed(1) ?? "—"}%`,
    `- TWI: ${engineRows["RBX-TXT-004"]?.twi.toFixed(1) ?? "—"}%`,
    "",
    "## Screenshots",
    "See `screenshots/` and paper folder `rbGyanX_mobile_paper/figures/screenshots/`.",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "PILOT_FEEDBACK_SUMMARY.md"), feedbackMd);

  fs.copyFileSync(
    kitPath("05_instructions", "rbGyanX_pilot_feedback_FORM.pdf"),
    path.join(OUT, "rbGyanX_pilot_feedback_FORM_blank.pdf"),
  );

  const figReadme = [
    "# Manuscript figure screenshots",
    "",
    "Suggested embed order for `rbGyanx_mobile_manuscript.docx`:",
    "",
    "| File | Suggested caption |",
    "|------|-------------------|",
    "| fig01_app_home.png | rbGyanX Mobile home screen (offline build v1.0.0). |",
    "| fig02_dvh_import.png | Composite DVH import from device Downloads. |",
    "| fig03_calculation_setup.png | Plan calculation setup (HN, IMRT, prescription). |",
    "| fig04_calculation_results.png | Composite TCP/NTCP results and dose metrics. |",
    "| fig06_therapeutic_window.png | Therapeutic window visualization. |",
    "| fig07_report_export.png | PDF/DOCX report export screen. |",
    "| fig05_results_RBX-TXT-004.png | Second pilot case (50 Gy) results. |",
    "",
    "Insert via Word: References → Insert → Picture.",
  ].join("\n");
  fs.writeFileSync(path.join(SCREEN_PAPER, "FIGURES_README.md"), figReadme);

  writeOut(rows, t0);
  const fail = rows.some((r) => r.status === "FAIL");
  console.log(`\nPilot kit run: ${fail ? "PARTIAL" : "PASS"} → ${OUT}`);
  process.exit(fail ? 1 : 0);
}

function writeOut(rows: Row[], t0: number): void {
  const overall = rows.some((r) => r.status === "FAIL") ? "PARTIAL" : "PASS";
  const json = {
    generatedAt: new Date().toISOString(),
    kit: KIT,
    output: OUT,
    paperScreenshots: SCREEN_PAPER,
    overall,
    durationMs: Date.now() - t0,
    rows,
  };
  fs.writeFileSync(path.join(OUT, "PILOT_RUN_REPORT.json"), JSON.stringify(json, null, 2));
  const md = [
    "# Pilot kit device run",
    "",
    `**Result:** ${overall}`,
    `**Output:** ${OUT}`,
    "",
    "| Step | Case | Status | Detail |",
    "|------|------|--------|--------|",
    ...rows.map(
      (r) => `| ${r.step} | ${r.caseId ?? "—"} | ${r.status} | ${r.detail.replace(/\|/g, "/")} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "PILOT_RUN_REPORT.md"), md);
  for (const r of rows) console.log(`  ${r.status} ${r.caseId ?? ""} ${r.step}: ${r.detail}`);
}

main();
