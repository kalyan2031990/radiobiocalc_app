/** Capture fig07 export screen — assumes setup or results screen. */
import fs from "fs";
import path from "path";
import {
  captureScreenshot,
  ensureDevice,
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
const UI = "/sdcard/rbgyanx_fig07.xml";

function xml(): string {
  return uiDump(UI, path.join(KIT, "Pilot_test_results", "ui_fig07.xml"));
}

function main(): void {
  ensureDevice();
  const x = xml();
  if (x.includes("Run calculation") && !x.includes("Calculation Results")) {
    for (let i = 0; i < 10; i++) scrollDown();
    sleep(500);
    tapTextWithScroll(xml, "Run calculation", 4);
    if (!waitForText(xml, "Calculation Results", 300000)) {
      throw new Error("Results timeout");
    }
  }
  for (let i = 0; i < 10; i++) scrollDown();
  sleep(600);
  if (
    !tapTextWithScroll(xml, "Export report (PDF / DOCX)", 12) &&
    !tapTextWithScroll(xml, "Export report", 12)
  ) {
    throw new Error("Export button not found");
  }
  sleep(3500);
  tapByText(xml(), "OK");
  if (!waitForText(xml, "Save PDF on device", 30000) && !waitForText(xml, "Export report", 5000)) {
    console.warn("May not be on export screen");
  }
  sleep(1000);
  const p = path.join(OUT, "05_export_RBX-TXT-001.png");
  if (!captureScreenshot(p)) throw new Error("Screenshot failed");
  fs.copyFileSync(p, path.join(PAPER, "fig07_report_export.png"));
  console.log("OK fig07_report_export.png");
}

main();
