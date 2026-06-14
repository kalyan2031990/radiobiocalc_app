/**
 * Autonomous all-17 device run — push inputs, import each DVH in-app, calculate, export.
 *
 * Usage: npx tsx scripts/run_mobile_all_17_device.ts
 */
import fs from "fs";
import path from "path";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
  runEngineForMobileAppCase,
} from "./mobile-app-input-suite-core";
import { ensureDevice, pushAllInputsToDownloads, runAdb } from "./mobile-adb-core";
import { runPatientDeviceFlow } from "./mobile-device-flow";

const OUT_DIR = path.join(process.cwd(), "test-output", "mobile-all-17-device");
const UI_DEVICE = "/sdcard/rbgyanx_all17_ui.xml";
const UI_LOCAL = path.join(OUT_DIR, "ui_dump_latest.xml");
const CLINICAL_XLSX =
  process.env.CLINICAL_XLSX?.trim() ||
  path.join(getMobileAppInputRoot(), "radiobiocalc_clinical_input.xlsx");

type CaseRow = {
  patientId: string;
  engine: "PASS" | "FAIL";
  device: "PASS" | "FAIL";
  detail: string;
};

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const root = getMobileAppInputRoot();
  const clinical = loadClinicalBundleFromFile(CLINICAL_XLSX);
  const cases = discoverMobileAppCases(root);
  const t0 = Date.now();
  const summary: CaseRow[] = [];

  try {
    ensureDevice();
    console.log("Device connected.");
  } catch (e) {
    console.error(e instanceof Error ? e.message : "No device");
    process.exit(1);
  }

  console.log(`Pushing all inputs to Downloads for manual access...`);
  const dlCount = pushAllInputsToDownloads(root);
  console.log(`Downloads folder: ${dlCount} files at /sdcard/Download/rbGyaX_mobile_app_input/`);

  // Verify inbox push
  const verify = runAdb(["shell", "ls", "-1", `/sdcard/Android/data/com.rbgyanx.radiobiocalc/files/rbgyanx_inbox/`], true);
  console.log(`Inbox before push: ${verify.split(/\s+/).filter(Boolean).length} files`);

  for (let i = 0; i < cases.length; i++) {
    const meta = cases[i];
    console.log(`\n=== [${i + 1}/${cases.length}] ${meta.patientId} ===`);

    const eng = runEngineForMobileAppCase(root, meta);
    if (!eng.pass) {
      summary.push({
        patientId: meta.patientId,
        engine: "FAIL",
        device: "FAIL",
        detail: eng.errors.join("; "),
      });
      console.log(`  SKIP device — engine FAIL`);
      continue;
    }

    if (clinical) {
      const report = buildMobileAppReportInput(meta, { clinicalBundle: clinical });
      if (!report.covariatesApplied && meta.patientId.startsWith("RBX-TXT")) {
        console.log(`  Note: covariates not applied for ${meta.patientId} in report builder`);
      }
    }

    const { ok, rows } = runPatientDeviceFlow({
      inputRoot: root,
      patientId: meta.patientId,
      clinicalXlsx: CLINICAL_XLSX,
      uiDevicePath: UI_DEVICE,
      uiLocalPath: UI_LOCAL,
      outDir: OUT_DIR,
      pushAllInputs: i === 0,
    });

    for (const r of rows) console.log(`  ${r.status} ${r.step}: ${r.detail}`);

    summary.push({
      patientId: meta.patientId,
      engine: "PASS",
      device: ok ? "PASS" : "FAIL",
      detail: rows.find((r) => r.status === "FAIL")?.detail ?? "complete",
    });

    if (!ok) {
      console.log(`  FAIL at ${meta.patientId} — continuing with next case`);
    }

    runAdb(["shell", "am", "force-stop", "com.rbgyanx.radiobiocalc"], true);
    fs.writeFileSync(
      path.join(OUT_DIR, `${meta.patientId}_FLOW.json`),
      JSON.stringify({ patientId: meta.patientId, ok, rows }, null, 2),
    );
  }

  console.log(`\nRestoring full Downloads folder for manual access...`);
  pushAllInputsToDownloads(root);

  const enginePass = summary.filter((s) => s.engine === "PASS").length;
  const devicePass = summary.filter((s) => s.device === "PASS").length;
  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    inputRoot: root,
    clinicalXlsx: CLINICAL_XLSX,
    enginePass,
    devicePass,
    total: cases.length,
    summary,
  };
  fs.writeFileSync(path.join(OUT_DIR, "ALL_17_DEVICE_REPORT.json"), JSON.stringify(report, null, 2));

  const md = [
    "# All-17 mobile device run",
    "",
    `**Engine:** ${enginePass}/${cases.length} PASS`,
    `**Device UI:** ${devicePass}/${cases.length} PASS`,
    "",
    "| Patient | Engine | Device | Detail |",
    "|---------|--------|--------|--------|",
    ...summary.map(
      (s) => `| ${s.patientId} | ${s.engine} | ${s.device} | ${s.detail.replace(/\|/g, "/")} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "ALL_17_DEVICE_REPORT.md"), md);

  console.log(`\n=== DONE: engine ${enginePass}/${cases.length}, device ${devicePass}/${cases.length} ===`);
  console.log(`Report: ${OUT_DIR}`);
  process.exit(devicePass === cases.length && enginePass === cases.length ? 0 : 1);
}

main();
