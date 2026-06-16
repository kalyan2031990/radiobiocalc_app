/**
 * Capture 1–2 clinical-context screenshots on setup screen (Task A).
 */
import fs from "fs";
import path from "path";
import {
  captureScreenshot,
  DOWNLOAD_INPUT,
  INBOX,
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
const UI = "/sdcard/rbgyanx_clin.xml";

function xml(): string {
  return uiDump(UI, path.join(KIT, "Pilot_test_results", "ui_clinical.xml"));
}

function snap(local: string, paper: string): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(PAPER, { recursive: true });
  fs.mkdirSync(BUILD16, { recursive: true });
  const p = path.join(OUT, local);
  if (!captureScreenshot(p)) throw new Error(`screenshot failed: ${local}`);
  fs.copyFileSync(p, path.join(PAPER, paper));
  fs.copyFileSync(p, path.join(BUILD16, paper));
  console.log("OK", paper);
}

function dismiss(): void {
  const x = xml();
  tapByText(x, "I Understand") || tapByText(x, "OK") || tapByText(x, "ALLOW");
}

function tapFile(): boolean {
  for (let i = 0; i <= 6; i++) {
    dismiss();
    if (tapByText(xml(), FILE) || tapByText(xml(), PATIENT)) return true;
    scrollDown();
    sleep(400);
  }
  return false;
}

function main(): void {
  ensureDevice();
  const dvh = path.join(KIT, "02_dvh_cases", "core", FILE);
  const xlsx = path.join(KIT, "03_clinical", "radiobiocalc_clinical_input.xlsx");
  runAdb(["shell", "mkdir", "-p", INBOX], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  runAdb(["push", dvh, `${INBOX}/${FILE}`], true);
  runAdb(["push", dvh, `${DOWNLOAD_INPUT}${FILE}`], true);
  if (fs.existsSync(xlsx)) {
    runAdb(["push", xlsx, `${DOWNLOAD_INPUT}radiobiocalc_clinical_input.xlsx`], true);
  }

  launchApp();
  sleep(3000);
  dismiss();

  tapTextWithScroll(xml, "Import plan DVH") || tapTextWithScroll(xml, "Import");
  sleep(2000);
  tapTextWithScroll(xml, "Refresh Downloads list");
  sleep(3500);
  if (!tapFile()) throw new Error("DVH file not tapped");

  for (let i = 0; i < 4; i++) scrollDown();
  tapTextWithScroll(xml, "Continue to setup", 4);
  sleep(3500);
  if (!waitForText(xml, "Plan evaluation setup", 30000)) {
    throw new Error("Setup screen timeout");
  }

  for (let i = 0; i < 14; i++) scrollDown();
  sleep(800);
  if (!waitForText(xml, "Clinical data", 15000) && !waitForText(xml, "Clinical context", 5000)) {
    for (let i = 0; i < 6; i++) scrollDown();
    sleep(600);
  }
  snap("06_clinical_data_panel.png", "fig08_clinical_data_xlsx.png");

  tapByText(xml(), "Clinical context (optional)") ||
    tapByText(xml(), "Clinical context") ||
    tapTextWithScroll(xml, "Clinical context", 3);
  sleep(2000);
  for (let i = 0; i < 2; i++) scrollDown();
  sleep(500);
  snap("07_clinical_context_form.png", "fig09_clinical_context_form.png");

  console.log("Clinical screenshots →", OUT);
}

main();
