/**
 * Autonomous mobile smoke — one composite DVH + clinical xlsx + covariates + calc + PDF.
 *
 * Usage:
 *   PILOT_PATIENT=RBX-TXT-001 npx tsx scripts/run_mobile_clinical_device_smoke.ts
 */
import fs from "fs";
import path from "path";
import { buildMobileAppReportInput } from "../lib/batch-mobile-report";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";
import {
  getMobileAppInputRoot,
  discoverMobileAppCases,
  runEngineForMobileAppCase,
} from "./mobile-app-input-suite-core";
import { ensureDevice, pushAllInputsToDownloads } from "./mobile-adb-core";
import { runPatientDeviceFlow } from "./mobile-device-flow";

const PATIENT = process.env.PILOT_PATIENT?.trim() || "RBX-TXT-001";
const CLINICAL_XLSX =
  process.env.CLINICAL_XLSX?.trim() ||
  path.join(getMobileAppInputRoot(), "radiobiocalc_clinical_input.xlsx");
const OUT_DIR = path.join(process.cwd(), "test-output", "mobile-clinical-smoke");
const UI_DEVICE = "/sdcard/rbgyanx_clinical_smoke.xml";
const UI_LOCAL = path.join(OUT_DIR, "ui_dump.xml");

type Row = { step: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };

function engineSmoke(root: string, rows: Row[]): boolean {
  const cases = discoverMobileAppCases(root);
  const meta = cases.find((c) => c.patientId === PATIENT);
  if (!meta) {
    rows.push({ step: "engine_case", status: "FAIL", detail: `No case ${PATIENT}` });
    return false;
  }
  const eng = runEngineForMobileAppCase(root, meta);
  rows.push({
    step: "engine_eval",
    status: eng.pass ? "PASS" : "FAIL",
    detail: eng.pass
      ? `TCP ${eng.tcpPct.toFixed(1)}% NTCP ${eng.ntcpPct.toFixed(1)}%`
      : eng.errors.join("; "),
  });
  if (!eng.pass) return false;

  const clinical = loadClinicalBundleFromFile(CLINICAL_XLSX);
  if (!clinical) {
    rows.push({ step: "clinical_xlsx", status: "FAIL", detail: "Missing xlsx" });
    return false;
  }
  const report = buildMobileAppReportInput(meta, { clinicalBundle: clinical });
  rows.push({
    step: "clinical_covariates",
    status: report.covariatesApplied ? "PASS" : "FAIL",
    detail: report.covariatesApplied
      ? `TCP base→adj ${((report.baseTcp ?? 0) * 100).toFixed(1)}%→${((report.tcp ?? 0) * 100).toFixed(1)}%`
      : "Covariates not applied in report builder",
  });
  rows.push({
    step: "clinical_sections",
    status: (report.clinicalSections?.length ?? 0) > 0 ? "PASS" : "FAIL",
    detail: `${report.clinicalSections?.length ?? 0} report sections`,
  });
  return report.covariatesApplied && (report.clinicalSections?.length ?? 0) > 0;
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows: Row[] = [];
  const t0 = Date.now();
  const root = getMobileAppInputRoot();

  try {
    ensureDevice();
    rows.push({ step: "adb_device", status: "PASS", detail: "connected" });
  } catch (e) {
    rows.push({
      step: "adb_device",
      status: "FAIL",
      detail: e instanceof Error ? e.message : "no device",
    });
    writeReport(rows, t0);
    process.exit(1);
  }

  const engOk = engineSmoke(root, rows);
  if (!engOk) {
    writeReport(rows, t0);
    process.exit(1);
  }

  const dl = pushAllInputsToDownloads(root);
  rows.push({ step: "push_downloads", status: "PASS", detail: `${dl} files in Downloads` });

  const { ok, rows: flowRows } = runPatientDeviceFlow({
    inputRoot: root,
    patientId: PATIENT,
    clinicalXlsx: CLINICAL_XLSX,
    uiDevicePath: UI_DEVICE,
    uiLocalPath: UI_LOCAL,
    outDir: OUT_DIR,
    pushAllInputs: false,
  });
  rows.push(...flowRows.map((r) => ({ step: r.step, status: r.status, detail: r.detail })));

  const fail = rows.some((r) => r.status === "FAIL") || !ok;
  writeReport(rows, t0);
  console.log(`\nClinical device smoke: ${fail ? "FAIL" : "PASS"}`);
  process.exit(fail ? 1 : 0);
}

function writeReport(rows: Row[], t0: number): void {
  const overall = rows.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  const report = {
    generatedAt: new Date().toISOString(),
    patient: PATIENT,
    clinicalXlsx: CLINICAL_XLSX,
    overall,
    durationMs: Date.now() - t0,
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, "SMOKE_REPORT.json"), JSON.stringify(report, null, 2));
  const md = [
    "# Mobile clinical device smoke",
    "",
    `**Result:** ${overall}`,
    `**Patient:** ${PATIENT}`,
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...rows.map((r) => `| ${r.step} | ${r.status} | ${r.detail.replace(/\|/g, "/")} |`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "SMOKE_REPORT.md"), md);
  for (const r of rows) console.log(`  ${r.status} ${r.step}: ${r.detail}`);
}

main();
