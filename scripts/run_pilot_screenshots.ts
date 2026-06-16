/**
 * Capture pilot manuscript screenshots on connected device (Task A focus).
 */
import fs from "fs";
import path from "path";
import {
  DOWNLOAD_INPUT,
  INBOX,
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
const OUT = path.join(KIT, "Pilot_test_results", "screenshots");
const PAPER = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures",
  "screenshots",
);
const BUILD16 = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures_build16",
  "screenshots",
);
const PATIENT = "RBX-TXT-001";
const FILE = `${PATIENT}_composite_DVH.txt`;
const UI = "/sdcard/rbgyanx_cap.xml";

function xml(): string {
  return uiDump(UI, path.join(KIT, "Pilot_test_results", "ui_cap.xml"));
}

function snap(local: string, paper?: string): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(PAPER, { recursive: true });
  fs.mkdirSync(BUILD16, { recursive: true });
  const p = path.join(OUT, local);
  if (!captureScreenshot(p)) {
    console.warn("screenshot failed", local);
    return;
  }
  if (paper) {
    fs.copyFileSync(p, path.join(PAPER, paper));
    fs.copyFileSync(p, path.join(BUILD16, paper));
  }
  console.log("OK", paper ?? local);
}

function dismiss(): void {
  const x = xml();
  tapByText(x, "I Understand") || tapByText(x, "OK") || tapByText(x, "ALLOW");
}

function main(): void {
  ensureDevice();
  const dvh = path.join(KIT, "02_dvh_cases", "core", FILE);
  runAdb(["shell", "mkdir", "-p", INBOX], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  runAdb(["push", dvh, `${INBOX}/${FILE}`], true);
  runAdb(["push", dvh, `${DOWNLOAD_INPUT}${FILE}`], true);

  launchApp();
  sleep(3000);
  dismiss();
  snap("01_home.png", "fig01_app_home.png");

  tapTextWithScroll(xml, "Import plan DVH") || tapTextWithScroll(xml, "Import");
  sleep(2000);
  tapTextWithScroll(xml, "Refresh Downloads list");
  sleep(3000);
  snap("02_import.png", "fig02_dvh_import.png");

  for (let i = 0; i < 6; i++) {
    dismiss();
    if (tapByText(xml(), FILE) || tapByText(xml(), PATIENT)) break;
    scrollDown();
    sleep(400);
  }
  sleep(2000);
  for (let i = 0; i < 4; i++) scrollDown();
  tapTextWithScroll(xml, "Continue to setup", 4);
  sleep(3500);

  if (waitForText(xml, "Plan evaluation setup", 20000)) {
    for (let i = 0; i < 8; i++) scrollDown();
    sleep(600);
    snap("03_setup.png", "fig03_calculation_setup.png");
    tapTextWithScroll(xml, "Run calculation", 14);
  }

  if (waitForText(xml, "Export report", 240000)) {
    snap("04_results.png", "fig04_calculation_results.png");
    for (let i = 0; i < 5; i++) scrollDown();
    sleep(600);
    if (tapTextWithScroll(xml, "Therapeutic", 4) || tapTextWithScroll(xml, "Window", 4)) {
      sleep(2500);
      snap("05_therapeutic_window.png", "fig06_therapeutic_window.png");
      runAdb(["shell", "input", "keyevent", "4"], true);
      sleep(1200);
    }
    tapTextWithScroll(xml, "Export report", 10);
    if (waitForText(xml, "Save PDF on device", 45000)) {
      sleep(1500);
      snap("06_export.png", "fig07_report_export.png");
    }
  }

  console.log("Screenshots →", OUT);
  console.log("Paper copies →", PAPER);
  console.log("Build16 copies →", BUILD16);
  console.log("Regenerate multipanel: python rbGyanX_mobile_paper/figures_build16/make_figures.py");
}

main();
