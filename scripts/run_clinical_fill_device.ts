/**
 * Single-DVH pilot run with clinical context fields filled on device.
 * Saves screenshots + summary to pilot1; embeds 2 figures in manuscript.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  DOWNLOAD_INPUT,
  INBOX,
  captureScreenshot,
  ensureDevice,
  inputAdbText,
  launchApp,
  runAdb,
  scrollDown,
  sleep,
  tapBelowLabel,
  tapByText,
  tapTextWithScroll,
  uiDump,
  waitForText,
} from "./mobile-adb-core";

const KIT =
  process.env.PILOT_KIT?.trim() ||
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "rbGyanX_pilot_study_kit");
const PILOT1 = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "pilot_feedback",
  "pilot1",
);
const PAPER_FIG = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures",
  "screenshots",
);
const PATIENT = "RBX-TXT-001";
const FILE = `${PATIENT}_composite_DVH.txt`;
const UI = "/sdcard/rbgyanx_fill.xml";

const FILLS: Array<{ kind: "text" | "select"; label: string; value: string }> = [
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

function xml(): string {
  return uiDump(UI, path.join(PILOT1, "ui_clinical_fill.xml"));
}

function snap(local: string, paper: string): string {
  const dir = path.join(PILOT1, "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(PAPER_FIG, { recursive: true });
  const p = path.join(dir, local);
  if (!captureScreenshot(p)) throw new Error(`screenshot failed: ${local}`);
  fs.copyFileSync(p, path.join(PAPER_FIG, paper));
  fs.copyFileSync(p, path.join(PILOT1, "figures_for_paper", paper));
  console.log("OK", paper);
  return p;
}

function dismiss(): void {
  const x = xml();
  tapByText(x, "I Understand") || tapByText(x, "OK") || tapByText(x, "ALLOW");
}

function xmlIncludes(x: string, label: string): boolean {
  const n = label.toLowerCase();
  const hay = x.toLowerCase();
  if (hay.includes(n)) return true;
  const short = n.split("(")[0].trim();
  return short.length >= 4 && hay.includes(short);
}

function scrollUntil(fn: () => boolean, max = 18): void {
  for (let i = 0; i < max; i++) {
    if (fn()) return;
    scrollDown();
    sleep(450);
  }
}

function ensureClinicalExpanded(): void {
  scrollUntil(() => xmlIncludes(xml(), "Clinical context"));
  sleep(500);
  tapByText(xml(), "Clinical context (optional)") ||
    tapByText(xml(), "Clinical context") ||
    tapTextWithScroll(xml, "Clinical context", 2);
  sleep(1200);
  if (!waitForText(() => xml(), "Patient", 8000)) {
    tapByText(xml(), "Clinical context (optional)") || tapByText(xml(), "Clinical context");
    sleep(1200);
  }
  if (!xmlIncludes(xml(), "Patient") && !xmlIncludes(xml(), "Age")) {
    throw new Error("Clinical context form did not expand");
  }
  scrollUntil(() => xmlIncludes(xml(), "Age"), 6);
}

function scrollToLabel(label: string): boolean {
  for (let i = 0; i <= 12; i++) {
    if (xmlIncludes(xml(), label)) return true;
    scrollDown();
    sleep(400);
  }
  return xmlIncludes(xml(), label);
}

function fillField(field: (typeof FILLS)[number]): void {
  if (!scrollToLabel(field.label)) {
    console.warn("label not found:", field.label);
    return;
  }
  const x = xml();
  const label =
    field.label === "H&N primary subsite" && !x.includes("H&N primary subsite")
      ? "primary subsite"
      : field.label;
  if (!tapBelowLabel(x, label) && !tapByText(x, label)) {
    console.warn("tap below failed:", field.label);
    return;
  }
  if (field.kind === "text") {
    inputAdbText(field.value);
    return;
  }
  sleep(900);
  if (!tapByText(xml(), field.value)) {
    tapTextWithScroll(xml, field.value, 4);
  }
  sleep(600);
}

function expandClinicalContext(): void {
  ensureClinicalExpanded();
}

function navigateToSetup(): void {
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

  for (let i = 0; i <= 6; i++) {
    dismiss();
    if (tapByText(xml(), FILE) || tapByText(xml(), PATIENT)) break;
    scrollDown();
    sleep(400);
  }

  for (let i = 0; i < 4; i++) scrollDown();
  tapTextWithScroll(xml, "Continue to setup", 4);
  sleep(3500);
  if (!waitForText(xml, "Plan evaluation setup", 30000)) {
    throw new Error("Setup screen timeout");
  }
}

function main(): void {
  fs.mkdirSync(PILOT1, { recursive: true });
  fs.mkdirSync(path.join(PILOT1, "figures_for_paper"), { recursive: true });

  ensureDevice();
  navigateToSetup();
  expandClinicalContext();

  for (const f of FILLS) fillField(f);
  sleep(1000);
  scrollToLabel("Concurrent chemotherapy");
  sleep(500);
  snap("08_clinical_context_filled.png", "fig10_clinical_context_filled.png");

  for (let i = 0; i < 12; i++) scrollDown();
  sleep(500);
  tapTextWithScroll(xml, "Run calculation", 6);
  if (!waitForText(xml, "Calculation Results", 300000)) {
    throw new Error("Results timeout");
  }
  sleep(2000);
  tapTextWithScroll(xml, "Clinical", 6);
  sleep(1500);
  snap("09_results_clinical_tab.png", "fig11_results_clinical_context.png");

  const summary = [
    "# Clinical context fill — RBX-TXT-001",
    "",
    `**Date:** ${new Date().toISOString()}`,
    `**DVH:** ${FILE}`,
    "",
    "## Fields entered",
    "",
    ...FILLS.map((f) => `- **${f.label}:** ${f.value}`),
    "",
    "## Screenshots",
    "",
    "- `fig10_clinical_context_filled.png` — setup screen with clinical context populated",
    "- `fig11_results_clinical_context.png` — calculation results Clinical tab",
    "",
    "## Notes",
    "",
    "Single composite DVH (70 Gy / 35 fx). Clinical context entered manually on device; covariates may adjust TCP/NTCP when toggle is ON.",
  ].join("\n");
  fs.writeFileSync(path.join(PILOT1, "CLINICAL_CONTEXT_FILL.md"), summary);

  const py = path.join(process.cwd(), "scripts", "embed_clinical_figures.py");
  if (fs.existsSync(py)) {
    spawnSync("python", [py], { encoding: "utf8", stdio: "inherit" });
  }

  console.log("Saved →", PILOT1);
}

main();
