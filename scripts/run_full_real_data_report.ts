/**
 * Consolidated real-data report — inventory + validation + manuscript export.
 * Usage: INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/run_full_real_data_report.ts
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getInputFoldersRoot } from "./test-data-root";

const OUT = path.join(process.cwd(), "test-output");

function run(script: string): { ok: boolean; tail: string } {
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", path.join("scripts", script)],
    {
      cwd: process.cwd(),
      shell: true,
      encoding: "utf8",
      env: { ...process.env, INPUT_FOLDERS: getInputFoldersRoot() ?? process.env.INPUT_FOLDERS ?? "" },
    },
  );
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  return { ok: r.status === 0, tail: out.split("\n").slice(-6).join("\n") };
}

function readJson<T>(name: string): T | null {
  const p = path.join(OUT, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  console.log("=== Full real-data pipeline ===\n");
  const steps: { name: string; ok: boolean; detail: string }[] = [];

  for (const s of ["generate_input_data_summary.ts", "run_real_data_suite.ts", "run_manuscript_export.ts"]) {
    console.log(`>>> ${s}`);
    const r = run(s);
    steps.push({ name: s, ok: r.ok, detail: r.tail });
    console.log(r.tail, "\n");
  }

  const real = readJson<{
    overall: string;
    txtPass: number;
    txtTotal: number;
    dicomPass: boolean;
    dicomStructures: string[];
    dicomFractions?: number;
    compositePass: boolean;
    covariateOk: boolean;
  }>("REAL_DATA_REPORT.json");

  const clinical = readJson<{
    tcpSummary: { base_tcp_pct: { mean: number }; adjusted_tcp_pct: { mean: number } };
    organNtcpSummary: { organ: string; ntcp_base_pct: { mean: number; n: number }; ntcp_adjusted_pct: { mean: number } }[];
    toxicityCorrelations: Record<string, { toxicityRate: number; pearson_ntcp: number | null }>;
    clinicalInventory: { matchedObserved: number; syntheticImputed: number };
  }>("MANUSCRIPT_CLINICAL_SUMMARY.json");

  const inventory = fs.existsSync(path.join(OUT, "input_data_summary.csv"))
    ? fs.readFileSync(path.join(OUT, "input_data_summary.csv"), "utf8").trim().split("\n")
    : [];

  const overall = steps.every((s) => s.ok) && real?.overall === "PASS" ? "PASS" : "FAIL";

  const md = [
    "# Full real-data test report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Input root:** ${root}`,
    `**Overall:** ${overall}`,
    "",
    "## Pipeline steps",
    "",
    "| Step | Status |",
    "|------|--------|",
    ...steps.map((s) => `| ${s.name} | ${s.ok ? "PASS" : "FAIL"} |`),
    "",
    "## Input inventory (`input_data_summary.csv`)",
    "",
    "```csv",
    ...inventory,
    "```",
    "",
    "## DVH parse validation",
    "",
    real
      ? [
          `| Metric | Result |`,
          `|--------|--------|`,
          `| Eclipse .txt | ${real.txtPass}/${real.txtTotal} parsed |`,
          `| DICOM | ${real.dicomStructures?.length ?? 0} structures, ${real.dicomFractions ?? "—"} fx (${real.dicomPass ? "PASS" : "FAIL"}) |`,
          `| Composite therapeutic window | ${real.compositePass ? "PASS" : "FAIL"} |`,
          `| Covariate OFF unchanged | ${real.covariateOk ? "PASS" : "FAIL"} |`,
        ].join("\n")
      : "_REAL_DATA_REPORT.json missing_",
    "",
    "## Manuscript numerical export",
    "",
    clinical
      ? [
          `| Endpoint | n | Mean base | Mean adjusted |`,
          `|----------|--:|----------:|--------------:|`,
          `| TCP (PTV) | 14 | ${clinical.tcpSummary.base_tcp_pct.mean.toFixed(2)}% | ${clinical.tcpSummary.adjusted_tcp_pct.mean.toFixed(2)}% |`,
          ...clinical.organNtcpSummary.map(
            (o) =>
              `| NTCP ${o.organ} | ${o.ntcp_base_pct.n} | ${o.ntcp_base_pct.mean.toFixed(2)}% | ${o.ntcp_adjusted_pct.mean.toFixed(2)}% |`,
          ),
          "",
          `Clinical matches: ${clinical.clinicalInventory.matchedObserved} observed + ${clinical.clinicalInventory.syntheticImputed} synthetic PTV rows`,
          "",
          "### Toxicity correlation (Pearson NTCP vs grade 2+)",
          "",
          ...Object.entries(clinical.toxicityCorrelations)
            .filter(([k]) => k.endsWith("_base"))
            .map(([k, v]) => `- **${k.replace("_base", "")}:** tox ${(v.toxicityRate * 100).toFixed(1)}%, r=${v.pearson_ntcp?.toFixed(3) ?? "—"}`),
        ].join("\n")
      : "_MANUSCRIPT_CLINICAL_SUMMARY.json missing_",
    "",
    "## Output files",
    "",
    "- `test-output/input_data_summary.csv`",
    "- `test-output/REAL_DATA_REPORT.md` / `.json`",
    "- `test-output/MANUSCRIPT_NUMERICAL.csv` (all per-structure rows)",
    "- `test-output/MANUSCRIPT_NUMERICAL.json`",
    "- `test-output/MANUSCRIPT_CLINICAL_SUMMARY.json`",
    "",
    "## Mobile note",
    "",
    "Engine validation uses the same offline parsers as the APK. Import patient `.txt` files via **Import plan DVH** on device; the feature-tour demo requires a saved DVH session (fixed in `lib/feature-tour.ts`).",
  ].join("\n");

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "REAL_DATA_FULL_REPORT.md"), md);
  fs.writeFileSync(
    path.join(OUT, "REAL_DATA_FULL_REPORT.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), root, overall, steps, real, clinical }, null, 2),
  );

  console.log(`\n=== OVERALL: ${overall} ===`);
  console.log("Report: test-output/REAL_DATA_FULL_REPORT.md");
  process.exit(overall === "PASS" ? 0 : 1);
}

main();
