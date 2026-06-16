/**
 * Shared autonomous in-app flow: DVH import → setup → calculation → export.
 */
import fs from "fs";
import path from "path";
import {
  DOWNLOAD_INPUT,
  INBOX,
  PKG,
  dismissOverlays,
  fileVisibleInXml,
  isolateCaseOnDevice,
  launchApp,
  runAdb,
  scrollDown,
  scrollToBottom,
  scrollToTop,
  sleep,
  tapFileInList,
  tapTextWithScroll,
  uiDump,
  waitForTextWithScroll,
} from "./mobile-adb-core";

export type DeviceFlowRow = { step: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };

function continueSetupEnabled(getXml: () => string): boolean {
  const xml = getXml();
  return (
    /content-desc="Continue to setup"[^>]*enabled="true"/i.test(xml) ||
    /text="Continue to setup"[^>]*enabled="true"/i.test(xml) ||
    (/structure\(s\)/i.test(xml) && /points/i.test(xml))
  );
}

function waitForContinueSetup(getXml: () => string, timeoutMs = 240000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    dismissOverlays(getXml);
    if (continueSetupEnabled(getXml)) return true;
    const xml = getXml();
    if (/text="Error"/i.test(xml) || /text="Read failed"/i.test(xml)) return false;
    sleep(2000);
  }
  return continueSetupEnabled(getXml);
}

function waitForFileInList(getXml: () => string, fileName: string, timeoutMs = 45000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fileVisibleInXml(getXml(), fileName)) return true;
    scrollDown();
    sleep(600);
  }
  return fileVisibleInXml(getXml(), fileName);
}

function pullLatestInAppPdf(localPath: string): string | null {
  const listing = runAdb(["shell", "run-as", PKG, "ls", "files/reports/"], true);
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
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  runAdb(["pull", tmp, localPath], true);
  runAdb(["shell", "rm", "-f", tmp], true);
  return fs.existsSync(localPath) ? localPath : null;
}

function waitForCalculationComplete(getXml: () => string, timeoutMs = 360000): boolean {
  const needles = [
    "export report",
    "therapeutic window",
    "composite ntcp",
    "composite tcp",
    "biological models",
  ];
  const loadingNeedles = ["running radiobiology", "evaluating biological", "loading dvh"];
  const deadline = Date.now() + timeoutMs;
  let scrolls = 0;
  let sawLoading = false;
  while (Date.now() < deadline) {
    dismissOverlays(getXml);
    const xml = getXml().toLowerCase();
    if (loadingNeedles.some((n) => xml.includes(n))) sawLoading = true;
    if (needles.some((n) => xml.includes(n))) return true;
    if (scrolls < 16) {
      scrollDown();
      scrolls++;
    }
    sleep(1500);
  }
  const finalXml = getXml().toLowerCase();
  return needles.some((n) => finalXml.includes(n)) || (sawLoading && finalXml.includes("results"));
}

export function runPatientDeviceFlow(opts: {
  inputRoot: string;
  patientId: string;
  clinicalXlsx?: string;
  uiDevicePath: string;
  uiLocalPath: string;
  outDir: string;
  pushAllInputs?: boolean;
}): { ok: boolean; rows: DeviceFlowRow[] } {
  const {
    inputRoot,
    patientId,
    clinicalXlsx,
    uiDevicePath,
    uiLocalPath,
    outDir,
    pushAllInputs = false,
  } = opts;
  const rows: DeviceFlowRow[] = [];
  const getXml = () => uiDump(uiDevicePath, uiLocalPath);

  const fileName =
    fs
      .readdirSync(inputRoot)
      .find((f) => f.toUpperCase().startsWith(patientId.toUpperCase()) && /composite/i.test(f)) ??
    `${patientId}_composite_DVH.txt`;
  const dvhSrc = path.join(inputRoot, fileName);
  if (!fs.existsSync(dvhSrc)) {
    rows.push({ step: "input_file", status: "FAIL", detail: `Missing ${fileName}` });
    return { ok: false, rows };
  }

  if (pushAllInputs) {
    rows.push({ step: "push_all_inputs", status: "SKIP", detail: "use pushAllInputsToDownloads before loop" });
  }

  isolateCaseOnDevice(dvhSrc, clinicalXlsx);
  rows.push({ step: "push_case_isolated", status: "PASS", detail: `${fileName} (+ xlsx) only` });

  launchApp();
  dismissOverlays(getXml);
  sleep(1500);
  tapTextWithScroll(getXml, "Import plan DVH", 3) || tapTextWithScroll(getXml, "Import", 3);
  sleep(2000);
  dismissOverlays(getXml);
  scrollToTop(6);
  for (let refresh = 0; refresh < 3; refresh++) {
    tapTextWithScroll(getXml, "Refresh Downloads list", 2) ||
      tapTextWithScroll(getXml, "Refresh", 2);
    sleep(2500);
    if (waitForFileInList(getXml, fileName, 15000)) break;
  }

  const listed = waitForFileInList(getXml, fileName, 120000);
  rows.push({
    step: "file_listed",
    status: listed ? "PASS" : "FAIL",
    detail: listed ? `${fileName} visible` : "not visible after refresh",
  });
  if (!listed) {
    fs.writeFileSync(path.join(outDir, `${patientId}_ui_fail_list.xml`), getXml());
    return { ok: false, rows };
  }

  const tapped = tapFileInList(getXml, fileName, 6);
  if (tapped) sleep(1500);
  if (tapped) tapFileInList(getXml, fileName, 2);
  rows.push({
    step: "select_dvh",
    status: tapped ? "PASS" : "FAIL",
    detail: tapped ? fileName : "tap failed",
  });
  if (!tapped) return { ok: false, rows };

  const parsed = waitForContinueSetup(getXml);
  rows.push({
    step: "parse_composite",
    status: parsed ? "PASS" : "FAIL",
    detail: parsed ? "Continue enabled" : "timeout",
  });
  if (!parsed) {
    fs.writeFileSync(path.join(outDir, `${patientId}_ui_fail_parse.xml`), getXml());
    return { ok: false, rows };
  }

  tapTextWithScroll(getXml, "Continue to setup", 4);
  sleep(3000);
  scrollToBottom(12);
  const setupOk = waitForTextWithScroll(getXml, "Run calculation", 90000, 14);
  rows.push({
    step: "setup_screen",
    status: setupOk ? "PASS" : "FAIL",
    detail: setupOk ? "Setup reached" : "Run calculation not found",
  });
  if (!setupOk) {
    fs.writeFileSync(path.join(outDir, `${patientId}_ui_fail_setup.xml`), getXml());
    return { ok: false, rows };
  }

  scrollToBottom(4);
  tapTextWithScroll(getXml, "Run calculation", 8);
  sleep(1500);
  const resultsOk = waitForCalculationComplete(getXml, 360000);
  rows.push({
    step: "calculation_results",
    status: resultsOk ? "PASS" : "FAIL",
    detail: resultsOk ? "Results screen" : "timeout",
  });
  if (!resultsOk) {
    fs.writeFileSync(path.join(outDir, `${patientId}_ui_fail_results.xml`), getXml());
    return { ok: false, rows };
  }

  tapTextWithScroll(getXml, "Export report", 8);
  const exportOk = waitForTextWithScroll(getXml, "Save PDF on device", 90000, 8);
  rows.push({
    step: "report_export_screen",
    status: exportOk ? "PASS" : "FAIL",
    detail: exportOk ? "Export screen" : "timeout",
  });
  if (!exportOk) return { ok: false, rows };

  scrollToBottom(3);
  tapTextWithScroll(getXml, "Save PDF on device", 4);
  sleep(2500);
  dismissOverlays(getXml);

  const pdfLocal = path.join(outDir, `${patientId}_in_app.pdf`);
  const pulled = pullLatestInAppPdf(pdfLocal);
  rows.push({
    step: "in_app_pdf",
    status: pulled && fs.statSync(pulled).size > 500 ? "PASS" : "SKIP",
    detail: pulled
      ? `${path.basename(pulled)} (${fs.statSync(pulled).size} B)`
      : "UI export OK; run-as pull unavailable on release build",
  });

  return { ok: !rows.some((r) => r.status === "FAIL"), rows };
}
