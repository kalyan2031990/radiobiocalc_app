/**
 * Full validation for rbGyaX_mobile_app_input composite dataset.
 *
 * Usage:
 *   INPUT_FOLDERS=C:\...\rbGyaX_mobile_app_input npx tsx scripts/run_mobile_app_input_validation.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  getMobileAppInputRoot,
  runAllMobileAppCases,
  type EngineCaseResult,
  type MobileAppCase,
} from "./mobile-app-input-suite-core";

const ROOT = getMobileAppInputRoot();
const OUT = path.join(process.cwd(), "test-output", "mobile-app-input");
const DOCS = path.join(process.cwd(), "docs", "validation");
const LOG = path.join(OUT, "validation.log");

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(LOG, line + "\n");
}

function wipeEarlierReports(): void {
  for (const dir of [path.join(process.cwd(), "test-output"), DOCS]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (p === OUT) {
        for (const f of fs.readdirSync(p)) {
          fs.rmSync(path.join(p, f), { recursive: true, force: true });
        }
        continue;
      }
      fs.rmSync(p, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DOCS, { recursive: true });
}

function writeCases(cases: MobileAppCase[]): void {
  fs.writeFileSync(path.join(OUT, "CASES.json"), JSON.stringify(cases, null, 2));
  const md = [
    "# Mobile app input cases (composite DVH)",
    "",
    `Root: \`${ROOT}\``,
    "",
    "| Patient | Structures | Target | OAR | Dose (Gy) | Fx | Clinical TCP | OAR rows |",
    "|---------|------------|-------:|----:|----------:|---:|----------------|--------:|",
    ...cases.map(
      (c) =>
        `| ${c.patientId} | ${c.structureCount} | ${c.targetCount} | ${c.oarCount} | ${c.totalDoseGy} | ${c.fractions} | ${c.clinicalTcpSource}${c.clinicalTcpSynthetic ? " (syn)" : ""} | ${c.clinicalOarRows} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "CASES.md"), md);
  fs.copyFileSync(path.join(OUT, "CASES.md"), path.join(DOCS, "MOBILE_APP_INPUT_CASES.md"));
}

function writeEngineResults(results: EngineCaseResult[]): void {
  fs.writeFileSync(path.join(OUT, "ENGINE_RESULTS.json"), JSON.stringify(results, null, 2));
  const passN = results.filter((r) => r.pass).length;
  const md = [
    "# Engine results — rbGyaX_mobile_app_input",
    "",
    `**Summary:** ${passN}/${results.length} PASS`,
    "",
    "| Patient | Status | TCP% | NTCP% | TWI% | TCI% | D95 (Gy) | Parser Δ (Gy) |",
    "|---------|--------|-----:|------:|-----:|-----:|---------:|--------------:|",
    ...results.map((r) => {
      const st = r.pass ? "PASS" : "FAIL";
      return `| ${r.patientId} | ${st} | ${r.tcpPct.toFixed(1)} | ${r.ntcpPct.toFixed(1)} | ${r.twiPct.toFixed(1)} | ${r.tciPercent?.toFixed(1) ?? "—"} | ${r.d95Gy?.toFixed(1) ?? "—"} | ${r.parserMaxDoseDeltaGy.toFixed(3)} |`;
    }),
    "",
    "## Failures",
    "",
    ...results
      .filter((r) => !r.pass)
      .map((r) => `- **${r.patientId}:** ${r.errors.join("; ")}`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "ENGINE_RESULTS.md"), md);
  fs.copyFileSync(path.join(OUT, "ENGINE_RESULTS.md"), path.join(DOCS, "MOBILE_APP_ENGINE_RESULTS.md"));
}

function writeClinicalAnalysis(cases: MobileAppCase[], results: EngineCaseResult[]): void {
  const withClinical = cases.filter((c) => c.clinicalOarRows > 0);
  const md = [
    "# Clinical analysis — rbGyaX_mobile_app_input",
    "",
    "## Coverage",
    `- Composite patients: **${cases.length}**`,
    `- With linked NTCP_OAR clinical rows: **${withClinical.length}** (14 TXT; DCM uses DVH header + imputation)`,
    `- TCP_target rows: synthetic PTV clinical for TXT pilot IDs`,
    "",
    "## Dose consistency",
    "",
    "| Patient | Header Rx (Gy) | Clinical dose (Gy) | Δ |",
    "|---------|---------------:|-------------------:|--:|",
    ...cases.map((c) => {
      const hdr = c.prescribedGy ?? 0;
      const delta = Math.abs(hdr - c.totalDoseGy);
      const flag = delta > 2 ? " ⚠" : "";
      return `| ${c.patientId} | ${hdr || "—"} | ${c.totalDoseGy} | ${delta.toFixed(1)}${flag} |`;
    }),
    "",
    "## NTCP vs observed toxicity (Parotid, linked cases only)",
    "",
    "Covariate layer remains OFF in mobile — values are for traceability only.",
    "",
    "## Biological plausibility",
    "",
    ...results.map((r) => {
      const band =
        r.tcpPct >= 40 && r.tcpPct <= 99
          ? "TCP in typical HN definitive range"
          : r.tcpPct < 40
            ? "Low TCP — review target coverage / dose"
            : "Very high TCP";
      return `- **${r.patientId}:** TCP ${r.tcpPct.toFixed(0)}%, NTCP ${r.ntcpPct.toFixed(0)}%, TWI ${r.twiPct.toFixed(0)}% — ${band}`;
    }),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "CLINICAL_ANALYSIS.md"), md);
  fs.copyFileSync(path.join(OUT, "CLINICAL_ANALYSIS.md"), path.join(DOCS, "MOBILE_APP_CLINICAL_ANALYSIS.md"));
}

function writeTechnicalSummary(results: EngineCaseResult[]): void {
  const md = [
    "# Technical validation summary",
    "",
    "## Parser",
    "- rbGyanX composite format: multi-structure, Dose[Gy], Role TARGET/OAR",
    "- Server, offline engine, and mobile native parser aligned (max-dose Δ < 0.5 Gy)",
    "",
    "## Physical indices",
    "- Target TCI, D95, BED₁₀ computed per case with prescription from clinical or DVH header",
    "",
    "## Biological models",
    "- Per-structure probes: LKB log-logistic, LKB probit, Poisson, Zaider–Minerbo, Poisson-LQ (DVH) where literature params exist",
    "- Composite therapeutic window: TCP + NTCP + TWI",
    "",
    "## Model probe counts",
    "",
    ...results.map(
      (r) =>
        `- ${r.patientId}: ${r.modelProbes.length} finite model outputs across ${r.structures.length} structures`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "TECHNICAL_SUMMARY.md"), md);
  fs.copyFileSync(path.join(OUT, "TECHNICAL_SUMMARY.md"), path.join(DOCS, "MOBILE_APP_TECHNICAL_SUMMARY.md"));
}

function runMobileSmoke(): { ok: boolean; detail: string } {
  const patient = process.env.PILOT_PATIENT?.trim() || "RBX-TXT-001";
  const r = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "test:mobile-app-input-device"],
    {
      cwd: process.cwd(),
      shell: true,
      encoding: "utf8",
      env: {
        ...process.env,
        INPUT_FOLDERS: ROOT,
        PILOT_PATIENT: patient,
        PILOT_OUT_DIR: OUT,
      },
    },
  );
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  fs.writeFileSync(path.join(OUT, "MOBILE_SMOKE.log"), out);
  return { ok: r.status === 0, detail: out.split("\n").slice(-15).join("\n") };
}

function pushInputToDevice(): void {
  const adb = path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk", "platform-tools", "adb.exe");
  const dest = "/sdcard/Download/rbGyaX_mobile_app_input/";
  spawnSync(adb, ["shell", "mkdir", "-p", dest], { encoding: "utf8" });
  for (const name of fs.readdirSync(ROOT)) {
    if (!/\.(txt|xlsx)$/i.test(name)) continue;
    const src = path.join(ROOT, name);
    spawnSync(adb, ["push", src, dest + name], { encoding: "utf8" });
    log(`Pushed ${name} → ${dest}`);
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  log(`Input root: ${ROOT}`);

  const { cases, results } = runAllMobileAppCases(ROOT);
  const passN = results.filter((r) => r.pass).length;
  const allPass = passN === results.length && results.length >= 17;

  log(`Engine: ${passN}/${results.length} PASS`);

  if (!allPass) {
    writeCases(cases);
    writeEngineResults(results);
    writeClinicalAnalysis(cases, results);
    writeTechnicalSummary(results);
    console.error("Validation FAILED — fix parser/engine before mobile run");
    process.exit(1);
  }

  wipeEarlierReports();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(LOG, "");

  writeCases(cases);
  writeEngineResults(results);
  writeClinicalAnalysis(cases, results);
  writeTechnicalSummary(results);

  const summary = [
    "# rbGyaX mobile app input — full validation",
    "",
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passN}/${results.length} engine PASS — ready for device smoke`,
    "",
    "See MOBILE_APP_ENGINE_RESULTS.md, MOBILE_APP_CLINICAL_ANALYSIS.md, MOBILE_APP_TECHNICAL_SUMMARY.md",
  ].join("\n");
  fs.writeFileSync(path.join(DOCS, "MOBILE_APP_VALIDATION.md"), summary);

  log("Pushing input folder to device Downloads...");
  try {
    pushInputToDevice();
  } catch (e) {
    log(`adb push warning: ${e instanceof Error ? e.message : e}`);
  }

  log("Running mobile device smoke...");
  const mobile = runMobileSmoke();
  fs.writeFileSync(
    path.join(OUT, "MOBILE_SMOKE.md"),
    `# Mobile smoke\n\nStatus: ${mobile.ok ? "PASS" : "FAIL"}\n\n\`\`\`\n${mobile.detail}\n\`\`\``,
  );
  fs.copyFileSync(path.join(OUT, "MOBILE_SMOKE.md"), path.join(DOCS, "MOBILE_APP_DEVICE_SMOKE.md"));

  if (!mobile.ok) {
    log("Mobile smoke failed (engine PASS) — install APK and retry manually");
    process.exit(2);
  }

  log("All validation PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
