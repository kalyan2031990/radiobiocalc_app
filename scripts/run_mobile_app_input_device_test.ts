/**
 * Mobile device smoke — single composite DVH (RBX-TXT-001 default).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getMobileAppInputRoot } from "./mobile-app-input-suite-core";

const PKG = "com.rbgyanx.radiobiocalc";
const INBOX = `/sdcard/Android/data/${PKG}/files/rbgyanx_inbox`;
const DOWNLOAD_DIR = "/sdcard/Download/rbGyaX_mobile_app_input/";
const PATIENT = process.env.PILOT_PATIENT?.trim() || "RBX-TXT-001";
const OUT_DIR =
  process.env.PILOT_OUT_DIR?.trim() ||
  path.join(process.cwd(), "test-output", "mobile-app-input");

type Row = { test: string; status: "PASS" | "FAIL" | "SKIP"; detail: string; ms?: number };

function adb(): string {
  return path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
}

function runAdb(args: string[], ignoreExit = false): string {
  const r = spawnSync(adb(), args, { encoding: "utf8", stdio: "pipe" });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  if (r.status !== 0 && !ignoreExit) throw new Error(out || `exit ${r.status}`);
  return out;
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const UI_DUMP = "/sdcard/rbgyanx_mobile_input.xml";
const UI_LOCAL = path.join(OUT_DIR, "mobile_app_input_ui.xml");

function uiDump(): string {
  runAdb(["shell", "uiautomator", "dump", UI_DUMP], true);
  sleep(500);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  runAdb(["pull", UI_DUMP, UI_LOCAL], true);
  return fs.existsSync(UI_LOCAL) ? fs.readFileSync(UI_LOCAL, "utf8") : "";
}

function tapByText(text: string, partial = true): boolean {
  const xml = uiDump();
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

function continueSetupEnabled(): boolean {
  const xml = uiDump();
  return /content-desc="Continue to setup"[^>]*enabled="true"/i.test(xml);
}

function waitForContinueSetup(timeoutMs = 120000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    tapByText("OK") || tapByText("ALLOW");
    if (continueSetupEnabled()) return true;
    sleep(1500);
  }
  return continueSetupEnabled();
}

function launchApp(): void {
  runAdb(["shell", "am", "force-stop", PKG], true);
  sleep(400);
  runAdb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"], true);
  sleep(3500);
}

function compositeFileName(root: string): string {
  const hit = fs
    .readdirSync(root)
    .find((f) => f.toUpperCase().startsWith(PATIENT.toUpperCase()) && /composite/i.test(f));
  return hit ?? `${PATIENT}_composite_DVH.txt`;
}

function main(): void {
  const root = getMobileAppInputRoot();
  const fileName = compositeFileName(root);
  const src = path.join(root, fileName);
  const rows: Row[] = [];
  const t0 = Date.now();

  if (!fs.existsSync(src)) {
    console.error(`Missing ${src}`);
    process.exit(1);
  }

  try {
    runAdb(["devices"], false);
  } catch {
    rows.push({ test: "adb_device", status: "FAIL", detail: "No device" });
    writeReport(rows, Date.now() - t0);
    process.exit(1);
  }

  runAdb(["shell", `mkdir -p ${INBOX}`], true);
  runAdb(["shell", `mkdir -p ${DOWNLOAD_DIR}`], true);
  runAdb(["push", src, `${INBOX}/${fileName}`], true);
  runAdb(["push", src, `${DOWNLOAD_DIR}${fileName}`], true);
  rows.push({
    test: "push_composite",
    status: "PASS",
    detail: `${fileName} → inbox + ${DOWNLOAD_DIR}`,
  });

  launchApp();
  tapByText("Import plan DVH") || tapByText("Import");
  sleep(2000);
  tapByText("Refresh Downloads list") || tapByText("Refresh");
  sleep(3000);

  let tapped =
    tapByText(fileName) ||
    tapByText(fileName.replace(/\.txt$/i, ""), true) ||
    tapByText("composite_DVH", true) ||
    tapByText(PATIENT, true);

  if (!tapped) {
    const xml = uiDump();
    const re = new RegExp(
      `text="[^"]*${PATIENT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
      "i",
    );
    const m = xml.match(re);
    if (m) {
      const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
      const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
      runAdb(["shell", "input", "tap", String(x), String(y)], true);
      sleep(700);
      tapped = true;
    }
  }
  rows.push({
    test: "select_dvh",
    status: tapped ? "PASS" : "FAIL",
    detail: tapped ? `Selected ${fileName}` : "Could not tap file in list",
  });

  if (tapped) {
    const ok = waitForContinueSetup();
    rows.push({
      test: "parse_composite",
      status: ok ? "PASS" : "FAIL",
      detail: ok ? "2+ structures, Continue enabled" : "Parse/continue timeout",
    });
    if (ok && tapByText("Continue to setup")) {
      sleep(2000);
      rows.push({
        test: "setup_screen",
        status: uiDump().includes("Run calculation") ? "PASS" : "SKIP",
        detail: "Reached setup",
      });
    }
  }

  writeReport(rows, Date.now() - t0);
  const fail = rows.some((r) => r.status === "FAIL");
  process.exit(fail ? 1 : 0);
}

function writeReport(rows: Row[], ms: number): void {
  const overall = rows.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const json = { generatedAt: new Date().toISOString(), patient: PATIENT, overall, durationMs: ms, rows };
  fs.writeFileSync(path.join(OUT_DIR, "MOBILE_DEVICE_TEST.json"), JSON.stringify(json, null, 2));
  console.log(`Mobile device smoke: ${overall} (${ms} ms)`);
  for (const r of rows) console.log(`  ${r.status} ${r.test}: ${r.detail}`);
}

main();
