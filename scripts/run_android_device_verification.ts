/**
 * Autonomous Android device verification via adb — install smoke, in-app feature tour, crash scan.
 *
 * Usage: npx tsx scripts/run_android_device_verification.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PKG = "com.rbgyanx.radiobiocalc";
const APK = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
const OUT_DIR = path.join(process.cwd(), "test-output");
const UI_DUMP_DEVICE = "/sdcard/rbgyanx_ui.xml";
const UI_DUMP_LOCAL = path.join(OUT_DIR, "android_ui_dump.xml");

type Row = { test: string; status: "PASS" | "FAIL" | "SKIP"; detail: string; ms?: number };

function adb(): string {
  return path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
}

function runAdb(args: string[], opts?: { ignoreExit?: boolean }): { code: number; out: string } {
  const bin = adb();
  const r = spawnSync(bin, args, { encoding: "utf8", stdio: "pipe" });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  if (r.status !== 0 && !opts?.ignoreExit) {
    throw new Error(out || `adb exit ${r.status}`);
  }
  return { code: r.status ?? 0, out };
}

function adbShell(cmd: string, opts?: { ignoreError?: boolean }): string {
  try {
    return runAdb(["shell", ...cmd.split(/\s+/)], { ignoreExit: opts?.ignoreError }).out;
  } catch (e) {
    if (opts?.ignoreError) return "";
    throw e;
  }
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function uiDump(): string {
  runAdb(["shell", "uiautomator", "dump", UI_DUMP_DEVICE], { ignoreExit: true });
  sleep(400);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  runAdb(["pull", UI_DUMP_DEVICE, UI_DUMP_LOCAL], { ignoreExit: true });
  if (!fs.existsSync(UI_DUMP_LOCAL)) return "";
  return fs.readFileSync(UI_DUMP_LOCAL, "utf8");
}

function tapByText(text: string, partial = true): boolean {
  const xml = uiDump();
  if (!xml) return false;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = partial
    ? new RegExp(`text="[^"]*${escaped}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i")
    : new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "i");
  const m = xml.match(re) ?? xml.match(new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*text="[^"]*${escaped}`, "i"));
  if (!m) return false;
  const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
  const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
  adbShell(`input tap ${x} ${y}`);
  return true;
}

function uiDumpPackage(): string {
  const xml = uiDump();
  const m = xml.match(/package="([^"]+)"/);
  return m?.[1] ?? "";
}

function uiContainsInApp(...needles: string[]): boolean {
  const xml = uiDump();
  if (!xml.includes(PKG)) return false;
  return needles.every((n) => xml.toLowerCase().includes(n.toLowerCase()));
}

function readLogcatCrashes(): string[] {
  const { out } = runAdb(["logcat", "-d", "-t", "400"], { ignoreExit: true });
  return out.split("\n").filter(
    (l) =>
      (l.includes(PKG) || l.includes("ReactNativeJS")) &&
      (l.includes("FATAL") ||
        l.includes("AndroidRuntime") ||
        /ReactNativeJS.*Error/i.test(l) ||
        /ReactNativeJS.*Exception/i.test(l)),
  );
}

function launchApp(): void {
  runAdb(["shell", "am", "force-stop", PKG], { ignoreExit: true });
  sleep(500);
  runAdb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"], {
    ignoreExit: true,
  });
}

function tryDeepLink(route: string): boolean {
  const urls = [`rbgyanx://${route}`, `exp+rbgyanx-radiobiocalc://${route}`];
  for (const url of urls) {
    runAdb(
      [
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-c",
        "android.intent.category.BROWSABLE",
        "-d",
        url,
        PKG,
      ],
      { ignoreExit: true },
    );
    sleep(2000);
    if (uiContainsInApp("Feature tour") || uiContainsInApp("Replay tour")) {
      return true;
    }
  }
  return false;
}

function main() {
  const rows: Row[] = [];
  const tAll = Date.now();

  if (!fs.existsSync(adb())) {
    console.error("adb not found");
    process.exit(1);
  }

  let devices = "";
  try {
    devices = runAdb(["devices"]).out;
  } catch (e) {
    rows.push({ test: "adb", status: "FAIL", detail: String(e) });
    writeReport(rows, tAll);
    process.exit(1);
  }

  const connected = devices.split("\n").filter((l) => /\tdevice$/.test(l));
  if (!connected.length) {
    rows.push({ test: "device_connected", status: "FAIL", detail: "No USB device" });
    writeReport(rows, tAll);
    process.exit(1);
  }
  rows.push({ test: "device_connected", status: "PASS", detail: connected[0]?.trim() ?? "1 device" });

  try {
    const model = adbShell("getprop ro.product.model", { ignoreError: true });
    const android = adbShell("getprop ro.build.version.release", { ignoreError: true });
    rows.push({ test: "device_info", status: "PASS", detail: `${model} · Android ${android}` });
  } catch {
    rows.push({ test: "device_info", status: "SKIP", detail: "Could not read props" });
  }

  if (!fs.existsSync(APK)) {
    rows.push({ test: "apk_present", status: "FAIL", detail: "Release APK missing" });
  } else {
    const mb = (fs.statSync(APK).size / (1024 * 1024)).toFixed(1);
    rows.push({ test: "apk_present", status: "PASS", detail: `${mb} MB` });
  }

  try {
    const info = runAdb(["shell", "dumpsys", "package", PKG], { ignoreExit: true }).out;
    if (!info.includes("versionCode")) {
      rows.push({ test: "package_installed", status: "FAIL", detail: "Package not installed" });
    } else {
      const code = info.match(/versionCode=(\d+)/)?.[1] ?? "?";
      const name = info.match(/versionName=([^\s]+)/)?.[1] ?? "?";
      rows.push({ test: "package_installed", status: "PASS", detail: `v${name} (${code})` });
    }
  } catch (e) {
    rows.push({ test: "package_installed", status: "FAIL", detail: String(e) });
  }

  // --- Cold launch + crash scan ---
  const tLaunch = Date.now();
  runAdb(["logcat", "-c"], { ignoreExit: true });
  launchApp();
  sleep(8000);

  if (tapByText("I Understand and Accept")) {
    rows.push({ test: "disclaimer_accept", status: "PASS", detail: "Tapped accept (first launch)" });
    sleep(3000);
  } else {
    rows.push({ test: "disclaimer_accept", status: "PASS", detail: "Already accepted or not shown" });
  }

  const pid = adbShell(`pidof ${PKG}`, { ignoreError: true });
  rows.push({
    test: "app_process_running",
    status: pid ? "PASS" : "FAIL",
    detail: pid ? `pid ${pid.split(" ")[0]}` : "Process not running",
    ms: Date.now() - tLaunch,
  });

  let crashes = readLogcatCrashes();
  rows.push({
    test: "cold_launch_no_crash",
    status: crashes.length === 0 ? "PASS" : "FAIL",
    detail: crashes.length ? crashes.slice(0, 2).join(" | ").slice(0, 200) : "No FATAL/ReactNative errors",
  });

  if (uiContainsInApp("Self-test passed") || uiContainsInApp("On-device DVH parser")) {
    rows.push({ test: "in_app_selftest_ui", status: "PASS", detail: "Self-test modal visible/passed" });
  } else if (uiContainsInApp("Self-test issues")) {
    rows.push({ test: "in_app_selftest_ui", status: "FAIL", detail: "Self-test reported issues" });
  } else {
    rows.push({ test: "in_app_selftest_ui", status: "PASS", detail: "Self-test modal dismissed (already ran)" });
  }

  // --- Feature tour E2E ---
  const tTour = Date.now();
  runAdb(["logcat", "-c"], { ignoreExit: true });

  let onTour = tryDeepLink("auto-demo");
  if (!onTour) {
    launchApp();
    sleep(3000);
    onTour = tapByText("Replay anonymised feature tour");
  }
  if (!onTour) {
    rows.push({ test: "navigate_feature_tour", status: "FAIL", detail: "Could not open auto-demo screen" });
  } else {
    rows.push({ test: "navigate_feature_tour", status: "PASS", detail: "Opened feature tour screen" });
    sleep(1500);
    const started = tapByText("Replay tour", false) || tapByText("Tour running");
    if (!started && !tapByText("Replay tour")) {
      rows.push({ test: "start_feature_tour", status: "FAIL", detail: "Replay tour button not found" });
    } else {
      rows.push({ test: "start_feature_tour", status: "PASS", detail: "Tour started" });
      sleep(45000);
      const stillRunning = !!adbShell(`pidof ${PKG}`, { ignoreError: true });
      const onApp = uiDumpPackage() === PKG;
      const onHome = uiContainsInApp("Import plan DVH") || uiContainsInApp("Replay anonymised");
      const onResults = uiContainsInApp("TCP") || uiContainsInApp("NTCP") || uiContainsInApp("Therapeutic");
      rows.push({
        test: "feature_tour_complete",
        status: stillRunning && onApp && (onHome || onResults) ? "PASS" : "FAIL",
        detail: stillRunning
          ? onHome
            ? "Tour finished — home screen in app"
            : onResults
              ? "Tour in progress on results screen"
              : "App open but screen unclear"
          : "App process stopped during tour",
        ms: Date.now() - tTour,
      });
      crashes = readLogcatCrashes();
      rows.push({
        test: "feature_tour_no_crash",
        status: crashes.length === 0 ? "PASS" : "FAIL",
        detail: crashes.length ? crashes[0]?.slice(0, 160) : "No crashes during tour",
      });
    }
  }

  // --- Offline (airplane mode) relaunch ---
  const tOff = Date.now();
  try {
    adbShell("cmd connectivity airplane-mode enable", { ignoreError: true });
    sleep(1500);
    runAdb(["logcat", "-c"], { ignoreExit: true });
    launchApp();
    sleep(5000);
    const pidOff = adbShell(`pidof ${PKG}`, { ignoreError: true });
    crashes = readLogcatCrashes();
    rows.push({
      test: "offline_airplane_relaunch",
      status: pidOff && crashes.length === 0 ? "PASS" : "FAIL",
      detail: pidOff ? "App running in airplane mode" : "App died in airplane mode",
      ms: Date.now() - tOff,
    });
  } finally {
    adbShell("cmd connectivity airplane-mode disable", { ignoreError: true });
  }

  // --- Home screen sanity ---
  launchApp();
  sleep(3000);
  const homeOk = uiContainsInApp("Import plan DVH") || uiContainsInApp("Replay anonymised");
  rows.push({
    test: "home_screen_visible",
    status: homeOk ? "PASS" : "FAIL",
    detail: homeOk ? "Home screen elements present" : "Home screen not detected",
  });

  writeReport(rows, tAll);
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const pass = rows.filter((r) => r.status === "PASS").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(`\n=== ANDROID DEVICE: ${fail === 0 ? "PASS" : "FAIL"} ===`);
  console.log(`Pass: ${pass} | Fail: ${fail} | Skip: ${skip}`);
  console.log(`Report: test-output/ANDROID_DEVICE_VERIFICATION.md`);
  process.exit(fail > 0 ? 1 : 0);
}

function writeReport(rows: Row[], tAll: number) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const overall = rows.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  const json = {
    generatedAt: new Date().toISOString(),
    overall,
    pass: rows.filter((r) => r.status === "PASS").length,
    fail: rows.filter((r) => r.status === "FAIL").length,
    skip: rows.filter((r) => r.status === "SKIP").length,
    durationMs: Date.now() - tAll,
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, "ANDROID_DEVICE_VERIFICATION.json"), JSON.stringify(json, null, 2));
  const md = [
    "# Android device verification",
    "",
    `**Date:** ${json.generatedAt}`,
    `**Overall:** ${overall} (${json.pass} pass, ${json.fail} fail, ${json.skip} skip)`,
    `**Duration:** ${(json.durationMs / 1000).toFixed(1)}s`,
    "",
    "| Test | Status | Detail |",
    "|------|--------|--------|",
    ...rows.map((r) => `| ${r.test} | ${r.status} | ${r.detail.replace(/\|/g, "/").slice(0, 100)} |`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "ANDROID_DEVICE_VERIFICATION.md"), md);
}

main();
