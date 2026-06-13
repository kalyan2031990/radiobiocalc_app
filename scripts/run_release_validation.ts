/**
 * Release validation — build APK, run all tests, Android adb smoke, consolidated report.
 *
 * Usage:
 *   INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/run_release_validation.ts
 *   SKIP_APK_BUILD=1  — skip gradle (use existing APK)
 */
import fs from "fs";
import path from "path";
import { spawnSync, execSync } from "child_process";
import { getInputFoldersRoot } from "./test-data-root";
import { mobileBootSelfTest } from "../lib/mobile-boot-selftest";
import { offlineEngineSelfTest } from "../lib/offline-engine";

type Row = { area: string; test: string; status: "PASS" | "FAIL" | "SKIP"; detail: string; ms?: number };

const PKG = "com.rbgyanx.radiobiocalc";
const APK = path.join(
  process.cwd(),
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

function runStep(name: string, fn: () => void): Row {
  const t0 = Date.now();
  try {
    fn();
    return { area: "self", test: name, status: "PASS", detail: "ok", ms: Date.now() - t0 };
  } catch (e) {
    return {
      area: "self",
      test: name,
      status: "FAIL",
      detail: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    };
  }
}

function runScript(area: string, script: string, extraEnv: Record<string, string> = {}): Row {
  const t0 = Date.now();
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", path.join("scripts", script)],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: true,
      encoding: "utf8",
      env: {
        ...process.env,
        INPUT_FOLDERS: getInputFoldersRoot() ?? process.env.INPUT_FOLDERS ?? "",
        ...extraEnv,
      },
    },
  );
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  const last = out.split("\n").slice(-4).join(" | ");
  return {
    area,
    test: script,
    status: r.status === 0 ? "PASS" : "FAIL",
    detail: last || `exit ${r.status}`,
    ms: Date.now() - t0,
  };
}

function runNpm(area: string, script: string): Row {
  const t0 = Date.now();
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
    encoding: "utf8",
    env: process.env,
  });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  return {
    area,
    test: `npm run ${script}`,
    status: r.status === 0 ? "PASS" : "FAIL",
    detail: out.split("\n").slice(-3).join(" | ") || `exit ${r.status}`,
    ms: Date.now() - t0,
  };
}

function adbPath(): string {
  return path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
}

function androidSmoke(): Row[] {
  const rows: Row[] = [];
  const adb = adbPath();
  if (!fs.existsSync(adb)) {
    rows.push({
      area: "android_smoke",
      test: "adb",
      status: "SKIP",
      detail: "adb not found",
    });
    return rows;
  }

  let devices = "";
  try {
    devices = execSync(`"${adb}" devices`, { encoding: "utf8" });
  } catch (e) {
    rows.push({
      area: "android_smoke",
      test: "adb devices",
      status: "FAIL",
      detail: e instanceof Error ? e.message : String(e),
    });
    return rows;
  }

  const connected = devices.split("\n").filter((l) => /\tdevice$/.test(l));
  if (!connected.length) {
    rows.push({
      area: "android_smoke",
      test: "device_connected",
      status: "SKIP",
      detail: "No USB device — enable USB debugging and accept RSA prompt",
    });
    return rows;
  }

  rows.push({
    area: "android_smoke",
    test: "device_connected",
    status: "PASS",
    detail: connected[0]?.trim() ?? "1 device",
  });

  if (!fs.existsSync(APK)) {
    rows.push({
      area: "android_smoke",
      test: "apk_install",
      status: "SKIP",
      detail: `APK missing: ${APK}`,
    });
    return rows;
  }

  const t0 = Date.now();
  try {
    execSync(`"${adb}" uninstall ${PKG}`, { stdio: "ignore" });
  } catch {
    /* first install */
  }
  try {
    execSync(`"${adb}" install -r "${APK}"`, { encoding: "utf8", stdio: "pipe" });
    const mb = (fs.statSync(APK).size / (1024 * 1024)).toFixed(1);
    rows.push({
      area: "android_smoke",
      test: "apk_install",
      status: "PASS",
      detail: `${mb} MB installed`,
      ms: Date.now() - t0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    rows.push({
      area: "android_smoke",
      test: "apk_install",
      status: "FAIL",
      detail: msg.slice(0, 200),
      ms: Date.now() - t0,
    });
    return rows;
  }

  try {
    const ver = execSync(`"${adb}" shell dumpsys package ${PKG}`, { encoding: "utf8" });
    const code = ver.match(/versionCode=(\d+)/)?.[1] ?? "?";
    const name = ver.match(/versionName=([^\s]+)/)?.[1] ?? "?";
    rows.push({
      area: "android_smoke",
      test: "package_version",
      status: "PASS",
      detail: `versionName=${name} versionCode=${code}`,
    });
  } catch {
    rows.push({
      area: "android_smoke",
      test: "package_version",
      status: "FAIL",
      detail: "Could not read package info",
    });
  }

  try {
    execSync(
      `"${adb}" shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`,
      { stdio: "ignore" },
    );
    rows.push({
      area: "android_smoke",
      test: "app_launch",
      status: "PASS",
      detail: "Launcher activity started",
    });
  } catch {
    rows.push({
      area: "android_smoke",
      test: "app_launch",
      status: "FAIL",
      detail: "monkey launch failed",
    });
  }

  return rows;
}

function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  console.log("=== rbGyanX release validation ===\n");
  const rows: Row[] = [];

  rows.push(runScript("inventory", "generate_input_data_summary.ts"));

  rows.push(
    runStep("mobile_boot_selftest", () => {
      const r = mobileBootSelfTest();
      if (!r.ok) throw new Error(r.detail);
    }),
  );
  rows.push(
    runStep("offline_engine_selftest", () => {
      const r = offlineEngineSelfTest();
      if (!r.ok) throw new Error(r.detail);
    }),
  );

  const scriptTests = [
    "run_offline_engine_test.ts",
    "run_report_export_test.ts",
    "run_dvh_parse_test.ts",
    "check-no-phi-logs.ts",
    "run_real_data_suite.ts",
    "run_manuscript_export.ts",
    "run_ptv_oar_clinical_test.ts",
    "run_pilot_clinical_validation.ts",
  ];
  for (const s of scriptTests) {
    const area =
      s.includes("real") || s.includes("manuscript") || s.includes("pilot") || s.includes("ptv_oar")
        ? "real_data"
        : "self";
    const extra =
      s === "run_pilot_clinical_validation.ts"
        ? { SKIP_APK_BUILD: "1", SKIP_MOBILE_TEST: "1" }
        : {};
    rows.push(runScript(area, s, extra));
  }

  rows.push(runNpm("self", "test"));

  if (process.env.SKIP_APK_BUILD !== "1") {
    const t0 = Date.now();
    console.log("\n>>> Building release APK (gradle)…\n");
    const r = spawnSync("npm.cmd", ["run", "build:android:release"], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });
    rows.push({
      area: "build",
      test: "build:android:release",
      status: r.status === 0 ? "PASS" : "FAIL",
      detail: r.status === 0 ? (fs.existsSync(APK) ? path.basename(APK) : "gradle ok") : `exit ${r.status}`,
      ms: Date.now() - t0,
    });
  } else {
    rows.push({
      area: "build",
      test: "build:android:release",
      status: fs.existsSync(APK) ? "PASS" : "SKIP",
      detail: fs.existsSync(APK) ? "Using existing APK" : "APK not found",
    });
  }

  rows.push(...androidSmoke());

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  const overall = fail === 0 ? "PASS" : "FAIL";

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });

  const json = {
    generatedAt: new Date().toISOString(),
    inputRoot: root,
    overall,
    pass,
    fail,
    skip,
    rows,
  };
  fs.writeFileSync(path.join(outDir, "RELEASE_VALIDATION.json"), JSON.stringify(json, null, 2));

  const md = [
    "# Release validation report",
    "",
    `**Date:** ${json.generatedAt}`,
    `**Overall:** ${overall} (${pass} pass, ${fail} fail, ${skip} skip)`,
    `**Input:** ${root}`,
    "",
    "| Area | Test | Status | Detail |",
    "|------|------|--------|--------|",
    ...rows.map(
      (r) => `| ${r.area} | ${r.test} | ${r.status} | ${r.detail.replace(/\|/g, "/").slice(0, 120)} |`,
    ),
    "",
    "See also: `input_data_summary.csv`, `MANUSCRIPT_NUMERICAL.csv`",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "RELEASE_VALIDATION.md"), md);

  console.log(`\n=== OVERALL: ${overall} ===`);
  console.log(`Pass: ${pass} | Fail: ${fail} | Skip: ${skip}`);
  console.log(`Report: test-output/RELEASE_VALIDATION.md`);
  console.log(`JSON: test-output/RELEASE_VALIDATION.json`);

  process.exit(fail > 0 ? 1 : 0);
}

main();
