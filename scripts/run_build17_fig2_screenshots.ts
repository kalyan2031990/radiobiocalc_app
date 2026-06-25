/**
 * Capture Figure 2 panels (a–k) on connected device — build 17 (v1.0.1).
 *
 * Usage:
 *   INPUT_FOLDERS=<supplementary input> FIGURES_OUT=<figures/screenshots> npx tsx scripts/run_build17_fig2_screenshots.ts
 */
import fs from "fs";
import path from "path";
import {
  captureScreenshot,
  dismissOverlays,
  ensureDevice,
  inputAdbText,
  isolateCaseOnDevice,
  launchApp,
  runAdb,
  scrollDown,
  scrollToBottom,
  scrollToTop,
  sleep,
  tapBelowLabel,
  tapByText,
  tapFileInList,
  tapTextWithScroll,
  uiDump,
  waitForText,
  waitForTextWithScroll,
} from "./mobile-adb-core";
import {
  getMobileAppInputRoot,
  resolveCompositeDvhDir,
} from "./mobile-app-input-suite-core";
import { waitForCalculationComplete } from "./mobile-device-flow";

const FIG_OUT =
  process.env.FIGURES_OUT?.trim() ||
  path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_mobile_paper",
    "revised",
    "supplementary_data_build17",
    "figures",
    "screenshots",
  );
const UI = "/sdcard/rbgyanx_fig2.xml";
const UI_LOCAL = path.join(FIG_OUT, "_ui_dump.xml");

const CLINICAL_FILLS: Array<{ kind: "text" | "select"; label: string; value: string }> = [
  { kind: "text", label: "Age (years)", value: "58" },
  { kind: "select", label: "Sex", value: "Male" },
  { kind: "select", label: "KPS / performance", value: "90" },
  { kind: "select", label: "Treatment intent", value: "Definitive" },
  { kind: "select", label: "Histology", value: "Squamous cell carcinoma" },
  { kind: "select", label: "H&N primary subsite", value: "Oropharynx" },
  { kind: "select", label: "HPV status (p16)", value: "Negative" },
  { kind: "select", label: "Smoking status", value: "Former" },
  { kind: "select", label: "Concurrent chemotherapy", value: "Yes" },
];

function getXml(): string {
  return uiDump(UI, UI_LOCAL);
}

function snap(canonical: string): void {
  fs.mkdirSync(FIG_OUT, { recursive: true });
  const dest = path.join(FIG_OUT, canonical);
  if (!captureScreenshot(dest)) throw new Error(`screenshot failed: ${canonical}`);
  console.log("OK", canonical, `(${Math.round(fs.statSync(dest).size / 1024)} KB)`);
}

const FORCE_REFRESH = process.env.FORCE_FIG2_REFRESH === "1";

function have(canonical: string): boolean {
  if (FORCE_REFRESH) return false;
  const p = path.join(FIG_OUT, canonical);
  return fs.existsSync(p) && fs.statSync(p).size > 5000;
}

function snapIf(canonical: string, fn: () => void): void {
  if (have(canonical)) {
    console.log("SKIP (exists)", canonical);
    return;
  }
  fn();
}

function dvhPath(patientId: string): string {
  const root = getMobileAppInputRoot();
  const dir = resolveCompositeDvhDir(root);
  const hit = fs
    .readdirSync(dir)
    .find((f) => f.toUpperCase().startsWith(patientId.toUpperCase()) && /composite/i.test(f));
  if (!hit) throw new Error(`No DVH for ${patientId} in ${dir}`);
  return path.join(dir, hit);
}

function clinicalXlsx(): string {
  const root = getMobileAppInputRoot();
  const p = path.join(root, "radiobiocalc_clinical_input.xlsx");
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return p;
}

function fileNameFor(patientId: string): string {
  return path.basename(dvhPath(patientId));
}

function openImportScreen(captureHome = false): void {
  launchApp();
  sleep(2500);
  dismissOverlays(getXml);
  if (captureHome) snapIf("fig01_app_home.png", () => snap("fig01_app_home.png"));
  tapTextWithScroll(getXml, "Import plan DVH", 4) || tapTextWithScroll(getXml, "Import", 4);
  sleep(2000);
  dismissOverlays(getXml);
  scrollToTop(6);
  for (let i = 0; i < 3; i++) {
    tapTextWithScroll(getXml, "Refresh Downloads list", 2) ||
      tapTextWithScroll(getXml, "Refresh", 2);
    sleep(2500);
  }
}

function selectDvh(patientId: string): void {
  const file = fileNameFor(patientId);
  if (!tapFileInList(getXml, file, 20)) {
    throw new Error(`Could not tap ${file}`);
  }
  sleep(2000);
  tapFileInList(getXml, file, 2);
  sleep(1500);
}

function continueToSetup(): void {
  scrollToBottom(8);
  tapTextWithScroll(getXml, "Continue to setup", 6);
  sleep(3500);
  if (!waitForTextWithScroll(getXml, "Run calculation", 120000, 16)) {
    throw new Error("Setup screen timeout");
  }
}

function runCalculation(): void {
  scrollToTop(6);
  sleep(500);
  scrollToBottom(8);
  for (let attempt = 0; attempt < 3; attempt++) {
    tapTextWithScroll(getXml, "Run calculation", 12);
    sleep(2000);
    if (waitForCalculationComplete(getXml, 420000)) break;
    if (attempt === 2) {
      fs.writeFileSync(path.join(FIG_OUT, "_ui_fail_calc.xml"), getXml());
      throw new Error("Calculation results timeout");
    }
  }
  sleep(1500);
}

function xmlHas(label: string): boolean {
  return getXml().toLowerCase().includes(label.toLowerCase());
}

function scrollUntilHas(label: string, max = 18): void {
  for (let i = 0; i < max; i++) {
    if (xmlHas(label)) return;
    scrollDown();
    sleep(450);
  }
}

function fillClinicalField(field: (typeof CLINICAL_FILLS)[number]): void {
  scrollUntilHas(field.label.split("(")[0].trim(), 14);
  const x = getXml();
  const label =
    field.label === "H&N primary subsite" && !x.includes("H&N primary subsite")
      ? "primary subsite"
      : field.label;
  if (!tapBelowLabel(x, label) && !tapByText(x, label)) return;
  if (field.kind === "text") {
    inputAdbText(field.value);
    return;
  }
  sleep(800);
  tapByText(getXml(), field.value) || tapTextWithScroll(getXml, field.value, 4);
  sleep(500);
}

function main(): void {
  ensureDevice();
  const xlsx = clinicalXlsx();
  fs.mkdirSync(FIG_OUT, { recursive: true });
  console.log("Figure 2 screenshots →", FIG_OUT);

  // --- RBX-TXT-001: panels (a)–(d), (f), (g) ---
  isolateCaseOnDevice(dvhPath("RBX-TXT-001"), xlsx);
  openImportScreen(true);
  snapIf("fig02_dvh_import.png", () => snap("fig02_dvh_import.png"));

  selectDvh("RBX-TXT-001");
  continueToSetup();
  scrollToTop(4);
  sleep(600);
  snapIf("fig03_calculation_setup.png", () => snap("fig03_calculation_setup.png"));

  if (!have("fig04_calculation_results.png")) runCalculation();
  scrollToTop(4);
  snapIf("fig04_calculation_results.png", () => snap("fig04_calculation_results.png"));

  if (!have("fig06_therapeutic_window.png")) {
    if (tapTextWithScroll(getXml, "Therapeutic", 6) || tapTextWithScroll(getXml, "Window", 6)) {
      sleep(2500);
      snap("fig06_therapeutic_window.png");
      runAdb(["shell", "input", "keyevent", "4"], true);
      sleep(1200);
    }
  }

  if (!have("fig07_report_export.png")) {
    tapTextWithScroll(getXml, "Export report", 10);
    if (waitForTextWithScroll(getXml, "Save PDF on device", 60000, 10)) {
      sleep(1200);
      snap("fig07_report_export.png");
    }
  }
  runAdb(["shell", "input", "keyevent", "4"], true);
  sleep(1000);

  // --- RBX-TXT-004: panel (e) ---
  if (!have("fig05_results_RBX-TXT-004.png")) {
    isolateCaseOnDevice(dvhPath("RBX-TXT-004"));
    openImportScreen(false);
    selectDvh("RBX-TXT-004");
    continueToSetup();
    runCalculation();
    scrollToTop(4);
    snap("fig05_results_RBX-TXT-004.png");
  }
  runAdb(["shell", "input", "keyevent", "4"], true);
  sleep(800);
  runAdb(["shell", "input", "keyevent", "4"], true);
  sleep(800);

  // --- Clinical panels (h)–(k) ---
  if (!have("fig11_results_clinical_context.png")) {
    isolateCaseOnDevice(dvhPath("RBX-TXT-001"), xlsx);
    openImportScreen(false);
    selectDvh("RBX-TXT-001");
    continueToSetup();

    scrollUntilHas("Clinical data");
    scrollUntilHas("Clinical context");
    sleep(600);
    snapIf("fig08_clinical_data_xlsx.png", () => snap("fig08_clinical_data_xlsx.png"));

    tapByText(getXml(), "Clinical context (optional)") ||
      tapByText(getXml(), "Clinical context") ||
      tapTextWithScroll(getXml, "Clinical context", 4);
    sleep(1500);
    snapIf("fig09_clinical_context_form.png", () => snap("fig09_clinical_context_form.png"));

    for (const f of CLINICAL_FILLS) fillClinicalField(f);
    sleep(800);
    scrollUntilHas("Concurrent chemotherapy", 8);
    snapIf("fig10_clinical_context_filled.png", () => snap("fig10_clinical_context_filled.png"));

    runCalculation();
    tapTextWithScroll(getXml, "Clinical", 8);
    sleep(1500);
    snap("fig11_results_clinical_context.png");
  }

  console.log("All Figure 2 panels captured.");
}

main();
