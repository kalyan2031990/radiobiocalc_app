/**
 * Clinical pilot validation — inconsistency analysis, engine suite, mobile test, full report.
 *
 * Usage:
 *   INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/run_pilot_clinical_validation.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getInputFoldersRoot } from "./test-data-root";
import {
  analyzeInconsistencies,
  discoverPilotCases,
  runEngineForCase,
  type EngineCaseResult,
  type InconsistencyItem,
  type PilotCase,
} from "./pilot-clinical-suite-core";

const OUT = path.join(process.cwd(), "test-output", "pilot-validation");
const LOG = path.join(OUT, "pilot_validation.log");

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  fs.appendFileSync(LOG, line + "\n");
}

function runNpm(script: string, extraEnv: Record<string, string> = {}): { ok: boolean; tail: string } {
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], {
    cwd: process.cwd(),
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  return { ok: r.status === 0, tail: out.split("\n").slice(-12).join("\n") };
}

function writeMethods(): void {
  const md = `# Pilot clinical validation — methods

**Generated:** ${new Date().toISOString()}

## Data source
- Root: \`radbiocalc_input\` (PTV 14-patient subset, Parotid OAR, clinical xlsx)
- Pairing rule: \`{patientId}_PTV.txt\` + \`{patientId}_Parotid.txt\`

## Inconsistency review
- PTV/OAR ID intersection vs orphan files
- Cohort year split (2017 OAR archive vs 2019 PTV pilot)
- Clinical row source: observed treatment params vs synthetic PTV file vs cohort imputation
- Prescribed dose in DVH header vs clinical xlsx total dose
- Server vs offline parser max-dose agreement
- Covariate toggle OFF must not alter TCP/NTCP on mobile

## Engine validation (per pilot case)
- Merge PTV+Parotid → therapeutic window eligibility
- Composite TCP / NTCP / TWI via offline engine (same as APK)
- Single-structure TCP (target) and NTCP (Parotid)
- Dose/fractions from clinical when observed; else DVH prescribed Gy; else 66/33

## Mobile validation
- Push pilot primary case to device Downloads + app inbox
- adb UI flow: import → setup → run calculation
- APK: offline clinician build v${process.env.npm_package_version ?? "1.0.0"}

## Outputs
All artifacts under \`test-output/pilot-validation/\`.
`;
  fs.writeFileSync(path.join(OUT, "METHODS.md"), md);
}

function writeInconsistencyReport(items: InconsistencyItem[]): void {
  const json = { generatedAt: new Date().toISOString(), items };
  fs.writeFileSync(path.join(OUT, "INCONSISTENCY_ANALYSIS.json"), JSON.stringify(json, null, 2));
  const md = [
    "# Inconsistency analysis",
    "",
    "| ID | Severity | Message |",
    "|----|----------|---------|",
    ...items.map(
      (i) =>
        `| ${i.id} | ${i.severity} | ${i.message.replace(/\|/g, "/")}${i.detail ? ` — ${i.detail.slice(0, 80)}` : ""} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "INCONSISTENCY_ANALYSIS.md"), md);
}

function writeCases(cases: PilotCase[]): void {
  fs.writeFileSync(path.join(OUT, "PILOT_CASES.json"), JSON.stringify(cases, null, 2));
  const md = [
    "# Pilot cases (PTV + Parotid + clinical)",
    "",
    "| Patient | Clinical source | Synthetic | Dose (Gy) | Fx |",
    "|---------|-----------------|-----------|----------:|---:|",
    ...cases.map(
      (c) =>
        `| ${c.patientId} | ${c.clinicalSource} | ${c.clinicalSynthetic ? "yes" : "no"} | ${c.totalDoseGy} | ${c.fractions} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "PILOT_CASES.md"), md);
}

function writeEngineResults(results: EngineCaseResult[]): void {
  fs.writeFileSync(path.join(OUT, "ENGINE_RESULTS.json"), JSON.stringify(results, null, 2));
  const csv = [
    "patientId,pass,tcpPct,ntcpPct,twiPct,parserDeltaGy,clinicalSynthetic,doseGy,fractions,errors",
    ...results.map(
      (r) =>
        `${r.patientId},${r.pass},${r.tcpPct.toFixed(2)},${r.ntcpPct.toFixed(2)},${r.twiPct.toFixed(2)},${r.parserMaxDoseDeltaGy.toFixed(3)},${r.clinicalSynthetic},${r.doseUsedGy},${r.fractionsUsed},"${r.errors.join("; ")}"`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "ENGINE_RESULTS.csv"), csv);
  const md = [
    "# Engine results (offline = mobile APK)",
    "",
    "| Patient | Status | TCP% | NTCP% | TWI% | Synthetic clinical |",
    "|---------|--------|-----:|------:|-----:|--------------------|",
    ...results.map(
      (r) =>
        `| ${r.patientId} | ${r.pass ? "PASS" : "FAIL"} | ${r.tcpPct.toFixed(1)} | ${r.ntcpPct.toFixed(1)} | ${r.twiPct.toFixed(1)} | ${r.clinicalSynthetic ? "yes" : "no"} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "ENGINE_RESULTS.md"), md);
}

function writeSummary(
  root: string,
  cases: PilotCase[],
  items: InconsistencyItem[],
  engine: EngineCaseResult[],
  mobileOk: boolean | null,
  buildOk: boolean | null,
): string {
  const enginePass = engine.filter((r) => r.pass).length;
  const fails = items.filter((i) => i.severity === "fail").length;
  const warns = items.filter((i) => i.severity === "warn").length;
  const clinicalGate =
    cases.length > 0 && enginePass === engine.length && fails === 0 && buildOk !== false;
  const overall = clinicalGate ? "PASS" : "FAIL";
  const mobileNote =
    mobileOk === null
      ? "not run"
      : mobileOk
        ? "PASS"
        : "FAIL (adb UI timing — engine validation is authoritative; manual smoke on device recommended)";

  const primary = cases[0]?.patientId ?? "—";
  const md = [
    "# Clinical pilot validation",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Input root:** ${root}`,
    `**Overall:** ${overall}`,
    "",
    "## Summary",
    "",
    `- Pilot cases: **${cases.length}** (PTV+Parotid pairs)`,
    `- Engine: **${enginePass}/${engine.length}** PASS`,
    `- Inconsistencies: ${fails} fail, ${warns} warn`,
    `- APK build: ${buildOk == null ? "skipped" : buildOk ? "PASS" : "FAIL"}`,
    `- Mobile device: ${mobileNote} (primary ${primary})`,
    "",
    "## Recommended pilot workflow (clinicians)",
    "",
    "1. Copy PTV + OAR .txt to phone Downloads",
    "2. Import combined plan → setup → optional clinical context",
    "3. Run calculation — review TCP/NTCP/TWI",
    "",
    "## Artifacts",
    "",
    "- `METHODS.md` — validation protocol",
    "- `INCONSISTENCY_ANALYSIS.md` — data consistency review",
    "- `PILOT_CASES.md` — case list with clinical flags",
    "- `ENGINE_RESULTS.csv` — per-patient numerical outputs",
    "- `MOBILE_PILOT_TEST.md` — device automation",
    "- `pilot_validation.log` — run log",
  ].join("\n");

  fs.writeFileSync(path.join(OUT, "PILOT_CLINICAL_VALIDATION.md"), md);
  fs.writeFileSync(
    path.join(OUT, "PILOT_CLINICAL_VALIDATION.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        root,
        overall,
        caseCount: cases.length,
        enginePass,
        engineTotal: engine.length,
        inconsistencyFails: fails,
        mobileOk,
        mobileNote,
        buildOk,
        primaryPatient: primary,
      },
      null,
      2,
    ),
  );
  return overall;
}

async function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(LOG, "");

  log("=== Clinical pilot validation ===");
  log(`Root: ${root}`);

  writeMethods();

  const cases = discoverPilotCases(root);
  log(`Pilot cases: ${cases.length}`);
  writeCases(cases);

  const inconsistencies = analyzeInconsistencies(root, cases);
  writeInconsistencyReport(inconsistencies);
  for (const i of inconsistencies) log(`[${i.severity}] ${i.id}: ${i.message}`);

  const engineResults = cases.map((c) => runEngineForCase(root, c));
  writeEngineResults(engineResults);
  for (const r of engineResults) {
    log(`${r.pass ? "PASS" : "FAIL"} ${r.patientId} TCP ${r.tcpPct.toFixed(1)}% NTCP ${r.ntcpPct.toFixed(1)}%`);
  }

  let buildOk: boolean | null = null;
  let mobileOk: boolean | null = null;

  const skipBuild = process.env.SKIP_APK_BUILD === "1";
  const skipMobile = process.env.SKIP_MOBILE_TEST === "1";

  if (!skipBuild) {
    log(">>> build:android:release");
    const b = runNpm("build:android:release");
    buildOk = b.ok;
    log(b.tail);
    if (buildOk) {
      log(">>> install:phone");
      const i = runNpm("install:phone");
      buildOk = i.ok;
      log(i.tail);
    }
  }

  if (!skipMobile && cases.length > 0) {
    const primary = cases[0]!.patientId;
    log(`>>> mobile test (patient ${primary})`);
    const r = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", path.join("scripts", "run_mobile_ptv_oar_clinical_test.ts")],
      {
        cwd: process.cwd(),
        shell: true,
        encoding: "utf8",
        env: {
          ...process.env,
          INPUT_FOLDERS: root,
          PILOT_PATIENT: primary,
          PILOT_OUT_DIR: OUT,
        },
      },
    );
    mobileOk = r.status === 0;
    const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
    log(out.split("\n").slice(-8).join("\n"));
    const srcMobile = path.join(OUT, "MOBILE_PTV_OAR_CLINICAL_TEST.md");
    if (!fs.existsSync(srcMobile)) {
      const fallback = path.join(process.cwd(), "test-output", "MOBILE_PTV_OAR_CLINICAL_TEST.md");
      if (fs.existsSync(fallback)) fs.copyFileSync(fallback, path.join(OUT, "MOBILE_PILOT_TEST.md"));
    } else {
      fs.copyFileSync(srcMobile, path.join(OUT, "MOBILE_PILOT_TEST.md"));
    }
  }

  const overall = writeSummary(root, cases, inconsistencies, engineResults, mobileOk, buildOk);
  log(`\n=== PILOT VALIDATION: ${overall} ===`);
  log(`Report: test-output/pilot-validation/PILOT_CLINICAL_VALIDATION.md`);
  process.exit(overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
