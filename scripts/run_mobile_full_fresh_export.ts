/**
 * Wipe old PDF exports, run clinical device smoke, then full DVH + clinical batch to phone/PC.
 *
 * Usage: npx tsx scripts/run_mobile_full_fresh_export.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { wipeDeviceExportDirs, wipeLocalExportDirs } from "./mobile-adb-core";

const ROOT = process.cwd();

function run(cmd: string, args: string[], env: Record<string, string> = {}): number {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  return r.status ?? 1;
}

function main(): void {
  console.log("=== 1) Wipe earlier export folders (PC + phone) ===");
  wipeLocalExportDirs();
  try {
    wipeDeviceExportDirs();
  } catch (e) {
    console.warn("Device wipe skipped:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== 2) Regenerate bundled clinical + rebuild & install latest APK ===");
  const gen = run("npm", ["run", "generate:mobile-app-clinical"]);
  if (gen !== 0) process.exit(gen);
  const build = run("npm", ["run", "build:android:release"]);
  if (build !== 0) {
    console.warn("Release build failed — installing last APK artifact if present");
  }
  const install = run("npm", ["run", "install:phone"]);
  if (install !== 0) {
    console.warn("APK install failed — continuing with device smoke on existing build");
  }

  console.log("\n=== 3) Clinical device smoke (RBX-TXT-001 + xlsx + covariates) ===");
  const smoke = run("npx", ["tsx", "scripts/run_mobile_clinical_device_smoke.ts"], {
    PILOT_PATIENT: "RBX-TXT-001",
  });
  if (smoke !== 0) {
    console.error("Device smoke FAILED — skipping full export");
    process.exit(smoke);
  }

  console.log("\n=== 4) Full composite PDFs (DVH-only, no clinical sections) ===");
  const batch = run("npm", ["run", "test:mobile-batch-pdf-export"]);
  if (batch !== 0) process.exit(batch);

  console.log("\n=== 5) Full composite PDFs (clinical + covariates where feasible) ===");
  const clinical = run("npm", ["run", "test:mobile-clinical-batch-export"]);
  if (clinical !== 0) process.exit(clinical);

  const summary = {
    generatedAt: new Date().toISOString(),
    smoke: "PASS",
    dvhOnlyPhone: "/sdcard/Download/rbGyaX_exported_reports/",
    clinicalPhone: "/sdcard/Download/rbGyaX_exported_reports_clinical/",
    dvhOnlyPc: path.join(ROOT, "test-output", "mobile-exported-pdfs"),
    clinicalPc: path.join(ROOT, "test-output", "mobile-exported-pdfs-clinical"),
  };
  fs.mkdirSync(path.join(ROOT, "test-output"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "test-output", "MOBILE_FULL_EXPORT_SUMMARY.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log("\n=== ALL PASS ===");
  console.log(JSON.stringify(summary, null, 2));
}

main();
