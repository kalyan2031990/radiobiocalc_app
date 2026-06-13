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
