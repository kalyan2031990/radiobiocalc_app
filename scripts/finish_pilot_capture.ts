/**
 * Finish pilot screenshots from current device state + generate report PDFs.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  captureScreenshot,
  ensureDevice,
  runAdb,
  scrollDown,
  sleep,
  tapByText,
  tapTextWithScroll,
  uiDump,
} from "./mobile-adb-core";

const KIT =
  process.env.PILOT_KIT?.trim() ||
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "rbGyanX_pilot_study_kit");
const OUT = path.join(KIT, "Pilot_test_results", "screenshots");
const PAPER = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures",
  "screenshots",
);
const REPORTS = path.join(KIT, "Pilot_test_results", "reports");
const UI = "/sdcard/rbgyanx_finish.xml";

function xml(): string {
  return uiDump(UI, path.join(KIT, "Pilot_test_results", "ui_finish.xml"));
}

function snap(local: string, paper: string): boolean {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(PAPER, { recursive: true });
  const p = path.join(OUT, local);
  if (!captureScreenshot(p)) return false;
  fs.copyFileSync(p, path.join(PAPER, paper));
  console.log("OK", paper);
  return true;
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

function htmlToPdf(browser: string, htmlPath: string, pdfPath: string): boolean {
  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  spawnSync(
    browser,
    ["--headless=new", "--disable-gpu", "--no-sandbox", `--print-to-pdf=${pdfPath}`, fileUrl],
    { encoding: "utf8", stdio: "pipe" },
  );
  return fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 500;
}

function main(): void {
  ensureDevice();
  const x0 = xml();
  const onResults =
    x0.includes("Calculation Results") || x0.includes("Export report") || x0.includes("Therapeutic Window");

  if (onResults) {
    snap("03_results_RBX-TXT-001.png", "fig04_calculation_results.png");
    for (let i = 0; i < 6; i++) scrollDown();
    sleep(800);
    if (tapTextWithScroll(xml, "Therapeutic Window", 8) || tapTextWithScroll(xml, "Therapeutic", 4)) {
      sleep(3000);
      snap("04_therapeutic_window.png", "fig06_therapeutic_window.png");
      runAdb(["shell", "input", "keyevent", "4"], true);
      sleep(1500);
    }
    tapTextWithScroll(xml, "Export report", 12);
    sleep(2500);
    const x1 = xml();
    if (x1.includes("Save PDF on device") || x1.includes("Export report")) {
      snap("05_export_RBX-TXT-001.png", "fig07_report_export.png");
    }
  } else {
    console.warn("Not on results screen — skipping live capture");
  }

  const browser = findBrowser();
  if (browser) {
    for (const id of ["RBX-TXT-001", "RBX-TXT-004"]) {
      const html = path.join(REPORTS, `rbGyanX_${id}_pilot_clinical_composite.html`);
      const pdf = path.join(REPORTS, `rbGyanX_${id}_pilot_clinical_composite.pdf`);
      if (fs.existsSync(html)) {
        const ok = htmlToPdf(browser, html, pdf);
        console.log(ok ? "PDF OK" : "PDF FAIL", path.basename(pdf));
      }
    }
  }

  console.log("Done →", OUT, PAPER);
}

main();
