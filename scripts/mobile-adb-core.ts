/**
 * Shared adb + UI automation helpers for mobile device scripts.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export const PKG = "com.rbgyanx.radiobiocalc";
export const INBOX = `/sdcard/Android/data/${PKG}/files/rbgyanx_inbox`;
export const DOWNLOAD_INPUT = "/sdcard/Download/rbGyaX_mobile_app_input/";

export function adb(): string {
  return path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
}

export function runAdb(args: string[], ignoreExit = false): string {
  const r = spawnSync(adb(), args, { encoding: "utf8", stdio: "pipe" });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  if (r.status !== 0 && !ignoreExit) throw new Error(out || `adb exit ${r.status}`);
  return out;
}

export function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function ensureDevice(): void {
  const out = runAdb(["devices"], false);
  if (!/device$/m.test(out)) throw new Error(`No adb device: ${out}`);
}

export function launchApp(): void {
  runAdb(["shell", "am", "force-stop", PKG], true);
  sleep(500);
  runAdb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"], true);
  sleep(3500);
}

export function scrollDown(): void {
  runAdb(["shell", "input", "swipe", "540", "1700", "540", "700", "350"], true);
  sleep(600);
}

export function scrollUp(): void {
  runAdb(["shell", "input", "swipe", "540", "700", "540", "1700", "350"], true);
  sleep(600);
}

export function uiDump(devicePath: string, localPath: string): string {
  runAdb(["shell", "uiautomator", "dump", devicePath], true);
  sleep(450);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  runAdb(["pull", devicePath, localPath], true);
  return fs.existsSync(localPath) ? fs.readFileSync(localPath, "utf8") : "";
}

export function tapByText(xml: string, text: string, partial = true): boolean {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = partial
    ? [
        new RegExp(`text="[^"]*${escaped}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
        new RegExp(`content-desc="[^"]*${escaped}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
      ]
    : [new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i")];
  for (const re of patterns) {
    const m = xml.match(re);
    if (!m) continue;
    const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
    const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
    runAdb(["shell", "input", "tap", String(x), String(y)], true);
    sleep(700);
    return true;
  }
  return false;
}

export function waitForText(
  getXml: () => string,
  text: string,
  timeoutMs = 90000,
): boolean {
  const needle = text.toLowerCase();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = getXml();
    tapByText(xml, "OK") || tapByText(xml, "ALLOW");
    if (xml.toLowerCase().includes(needle)) return true;
    sleep(1200);
  }
  return getXml().toLowerCase().includes(needle);
}

export function tapTextWithScroll(
  getXml: () => string,
  text: string,
  maxScrolls = 8,
): boolean {
  for (let i = 0; i <= maxScrolls; i++) {
    const xml = getXml();
    tapByText(xml, "OK") || tapByText(xml, "ALLOW");
    if (tapByText(xml, text)) return true;
    if (i < maxScrolls) scrollDown();
  }
  return false;
}

export function fileVisibleInXml(xml: string, fileName: string): boolean {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (!m) continue;
    const w = Number(m[3]) - Number(m[1]);
    const h = Number(m[4]) - Number(m[2]);
    if (w > 10 && h > 10) return true;
  }
  return false;
}

export function tapFileInList(getXml: () => string, fileName: string, maxScrolls = 24): boolean {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tapRe = new RegExp(
    `content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    "i",
  );
  for (let i = 0; i <= maxScrolls; i++) {
    dismissOverlays(getXml);
    const xml = getXml();
    if (!fileVisibleInXml(xml, fileName)) {
      if (i < maxScrolls) scrollDown();
      sleep(500);
      continue;
    }
    const m = xml.match(tapRe) ?? xml.match(
      new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
    );
    if (!m) continue;
    const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
    const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
    runAdb(["shell", "input", "tap", String(x), String(y)], true);
    sleep(1200);
    return true;
  }
  return false;
}

export function grantAppPermissions(): void {
  const perms = [
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
  ];
  for (const perm of perms) {
    runAdb(["shell", "pm", "grant", PKG, perm], true);
  }
}

export function triggerMediaScan(target: string): void {
  const uri = target.startsWith("file://") ? target : `file://${target}`;
  runAdb(
    [
      "shell",
      "am",
      "broadcast",
      "-a",
      "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
      "-d",
      uri,
    ],
    true,
  );
  sleep(600);
}

export function scrollToTop(steps = 8): void {
  for (let i = 0; i < steps; i++) scrollUp();
  sleep(500);
}

export function clearDownloadInput(): void {
  runAdb(["shell", "rm", "-rf", DOWNLOAD_INPUT], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
}

/** Only one case + optional xlsx visible to the app (reliable automation taps). */
export function isolateCaseOnDevice(
  dvhFilePath: string,
  clinicalXlsx?: string,
): void {
  const fileName = path.basename(dvhFilePath);
  if (!fs.existsSync(dvhFilePath)) {
    throw new Error(`DVH file not found: ${dvhFilePath}`);
  }
  clearInbox();
  clearDownloadInput();
  grantAppPermissions();
  runAdb(["push", dvhFilePath, `${INBOX}/${fileName}`], true);
  runAdb(["push", dvhFilePath, `${DOWNLOAD_INPUT}${fileName}`], true);
  triggerMediaScan(`${INBOX}/${fileName}`);
  triggerMediaScan(`${DOWNLOAD_INPUT}${fileName}`);
  if (clinicalXlsx && fs.existsSync(clinicalXlsx)) {
    const xlsxName = path.basename(clinicalXlsx);
    runAdb(["push", clinicalXlsx, `${INBOX}/${xlsxName}`], true);
    runAdb(["push", clinicalXlsx, `${DOWNLOAD_INPUT}${xlsxName}`], true);
    triggerMediaScan(`${INBOX}/${xlsxName}`);
    triggerMediaScan(`${DOWNLOAD_INPUT}${xlsxName}`);
  }
  triggerMediaScan("/storage/emulated/0/Download/rbGyaX_mobile_app_input");
  triggerMediaScan("/storage/emulated/0/Download");
  sleep(4000);
}

export function clearInbox(): void {
  runAdb(["shell", "rm", "-rf", INBOX], true);
  runAdb(["shell", "mkdir", "-p", INBOX], true);
}

/** Push all files to Downloads subfolder (visible in Files app). */
export function pushAllInputsToDownloads(inputRoot: string): number {
  const files = fs
    .readdirSync(inputRoot)
    .filter((n) => /\.(txt|xlsx)$/i.test(n))
    .sort();
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  grantAppPermissions();
  for (const name of files) {
    runAdb(["push", path.join(inputRoot, name), `${DOWNLOAD_INPUT}${name}`], true);
  }
  triggerMediaScan("/storage/emulated/0/Download/rbGyaX_mobile_app_input");
  return files.length;
}

/** Push all composite DVH + clinical xlsx to app inbox and Downloads subfolder. */
export function pushMobileAppInputsToDevice(inputRoot: string): { pushed: number; files: string[] } {
  const files = fs
    .readdirSync(inputRoot)
    .filter((n) => /\.(txt|xlsx)$/i.test(n))
    .sort();
  runAdb(["shell", "mkdir", "-p", INBOX], true);
  runAdb(["shell", "mkdir", "-p", DOWNLOAD_INPUT], true);
  grantAppPermissions();
  for (const name of files) {
    const src = path.join(inputRoot, name);
    runAdb(["push", src, `${INBOX}/${name}`], true);
    runAdb(["push", src, `${DOWNLOAD_INPUT}${name}`], true);
  }
  triggerMediaScan("/storage/emulated/0/Download/rbGyaX_mobile_app_input");
  triggerMediaScan("/storage/emulated/0/Download");
  return { pushed: files.length, files };
}

export function dismissOverlays(getXml: () => string): void {
  const xml = getXml();
  tapByText(xml, "I Understand") ||
    tapByText(xml, "Accept") ||
    tapByText(xml, "OK") ||
    tapByText(xml, "ALLOW") ||
    tapByText(xml, "While using the app");
}

export function scrollToBottom(steps = 10): void {
  for (let i = 0; i < steps; i++) scrollDown();
  sleep(800);
}

export function waitForTextWithScroll(
  getXml: () => string,
  text: string,
  timeoutMs = 90000,
  maxScrolls = 12,
): boolean {
  const needle = text.toLowerCase();
  const deadline = Date.now() + timeoutMs;
  let scrolls = 0;
  while (Date.now() < deadline) {
    dismissOverlays(getXml);
    const xml = getXml();
    if (xml.toLowerCase().includes(needle)) return true;
    if (tapByText(xml, text)) return true;
    if (scrolls < maxScrolls) {
      scrollDown();
      scrolls++;
    }
    sleep(1200);
  }
  return getXml().toLowerCase().includes(needle);
}

export function wipeDeviceExportDirs(): void {
  for (const dir of [
    "/sdcard/Download/rbGyaX_exported_reports/",
    "/sdcard/Download/rbGyaX_exported_reports_clinical/",
  ]) {
    runAdb(["shell", "rm", "-rf", dir], true);
    runAdb(["shell", "mkdir", "-p", dir], true);
  }
}

export function wipeLocalExportDirs(): void {
  const root = path.join(process.cwd(), "test-output");
  for (const name of ["mobile-exported-pdfs", "mobile-exported-pdfs-clinical"]) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  }
}

/** PNG screenshot from device display. */
export function captureScreenshot(localPath: string, devicePath = "/sdcard/rbgyanx_screen.png"): boolean {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  runAdb(["shell", "screencap", "-p", devicePath], true);
  sleep(400);
  runAdb(["pull", devicePath, localPath], true);
  runAdb(["shell", "rm", "-f", devicePath], true);
  return fs.existsSync(localPath) && fs.statSync(localPath).size > 1000;
}

/** Tap center of label row, offset down to hit input/dropdown below. */
export function tapBelowLabel(xml: string, label: string, offsetY = 88): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
    new RegExp(`text="[^"]*${escaped}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i"),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (!m) continue;
    const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
    const y = Math.floor((Number(m[2]) + Number(m[4])) / 2) + offsetY;
    runAdb(["shell", "input", "tap", String(x), String(y)], true);
    sleep(700);
    return true;
  }
  return false;
}

export function inputAdbText(text: string): void {
  const safe = text.replace(/ /g, "%s").replace(/['"`$\\(){}[\]|;&<>]/g, "");
  if (!safe) return;
  runAdb(["shell", "input", "text", safe], true);
  sleep(400);
}
