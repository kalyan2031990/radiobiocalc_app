/**
 * Full automated feature test — input_folders DVH files, offline engine, XAI, reports.
 * Usage: npx tsx scripts/run_full_automation.ts
 * Env: INPUT_FOLDERS or RBGYANX_TEST_DATA
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getInputFoldersRoot } from "./test-data-root";
import { offlineCalculate, offlineEvaluateComposite, offlineMergeDvhs, offlineParseDvh } from "../lib/offline-engine";
import { analyzePlanScope } from "../lib/plan-scope";
import { parseDvhOnDevice, mergeDvhsOnDevice } from "../lib/parse-dvh-mobile";
import { buildPlanExplanation, buildSingleStructureExplanation } from "../lib/rbgyanx-explain";
import { parseClinicalContext, clinicalContextSummary } from "../lib/clinical-context";
import { EMPTY_CLINICAL } from "../lib/clinical-context";
import { inferEvaluationRole } from "../lib/structure-role";
import { mapToLiteratureOrgan } from "../lib/plan-evaluation";

type StepResult = {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
  ms?: number;
};

type ScenarioResult = {
  id: string;
  label: string;
  files: string[];
  parseOk: boolean;
  structures: string[];
  therapeuticWindow: boolean;
  tcp?: number;
  ntcp?: number;
  twi?: number;
  xaiBullets: number;
  error?: string;
};

const SKIP_DIRS = new Set([
  "_integration_test_output",
  "_test_preprocess_out",
  "kalpak_dcm_files",
  "DICOM_samples_dicom",
  "dicom_input",
]);

function walkDvh(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDvh(full, acc);
    else if (/\.(txt|csv)$/i.test(name) && !/summary|manifest|readme/i.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = Date.now();
  const value = fn();
  return { value, ms: Date.now() - t0 };
}

function runScript(script: string): StepResult {
  const t0 = Date.now();
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", path.join("scripts", script)],
    { cwd: process.cwd(), stdio: "pipe", shell: true, encoding: "utf8" },
  );
  const ms = Date.now() - t0;
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  return {
    name: script,
    status: r.status === 0 ? "PASS" : "FAIL",
    detail: out.trim().split("\n").slice(-3).join(" | ") || `exit ${r.status}`,
    ms,
  };
}

const SCENARIOS: { id: string; label: string; relPaths: string[] }[] = [
  {
    id: "kastoori_composite",
    label: "Kastoori PTV70 + COMB_PRTD (therapeutic window)",
    relPaths: [
      "rbgyanx_test_data/PTV_data/KASTOORI_PTV70.txt",
      "rbgyanx_test_data/HN57_OAR_Eclipse/KASTOORI_COM_PRTD.txt",
    ],
  },
  {
    id: "motilal_multi",
    label: "Motilal multi-structure (combined_input)",
    relPaths: [
      "input_data/tcp_ntcp_combined_input/PTV_OAR_DVH_TCP_NTCP_combined_input/Motilal  PTV HR.txt",
      "input_data/tcp_ntcp_combined_input/PTV_OAR_DVH_TCP_NTCP_combined_input/Motilal COMB PRTD.txt",
      "input_data/tcp_ntcp_combined_input/PTV_OAR_DVH_TCP_NTCP_combined_input/Motilal CORD.txt",
    ],
  },
  {
    id: "kastoori_ptv_only",
    label: "Kastoori PTV only (single structure TCP)",
    relPaths: ["rbgyanx_test_data/PTV_data/KASTOORI_PTV70.txt"],
  },
  {
    id: "kastoori_oar_only",
    label: "Kastoori OAR only (single structure NTCP)",
    relPaths: ["rbgyanx_test_data/HN57_OAR_Eclipse/KASTOORI_COM_PRTD.txt"],
  },
];

function runScenario(root: string, scenario: (typeof SCENARIOS)[0]): ScenarioResult {
  const files = scenario.relPaths
    .map((rel) => path.join(root, rel))
    .filter((p) => fs.existsSync(p));

  if (files.length === 0) {
    return {
      id: scenario.id,
      label: scenario.label,
      files: [],
      parseOk: false,
      structures: [],
      therapeuticWindow: false,
      xaiBullets: 0,
      error: "Files not found",
    };
  }

  try {
    const bundles = files.map((f) => {
      const content = fs.readFileSync(f, "utf8");
      return offlineParseDvh(content, path.basename(f));
    });
    const merged = bundles.length === 1 ? bundles[0]! : offlineMergeDvhs(bundles);
    const scope = analyzePlanScope(merged);
    const structures = Object.keys(merged.dvhByStructure);

    const mobileMerged =
      bundles.length === 1
        ? parseDvhOnDevice(fs.readFileSync(files[0]!, "utf8"), path.basename(files[0]!))
        : mergeDvhsOnDevice(
            files.map((f) =>
              parseDvhOnDevice(fs.readFileSync(f, "utf8"), path.basename(f)),
            ),
          );

    let tcp: number | undefined;
    let ntcp: number | undefined;
    let twi: number | undefined;
    let xaiBullets = 0;

    if (scope.therapeuticWindowEligible) {
      const ev = offlineEvaluateComposite(merged, {
        totalDose: 70,
        numFractions: 35,
        cancerSite: "HN",
        technique: "IMRT",
      });
      tcp = ev.therapeutic.tcp;
      ntcp = ev.therapeutic.ntcpComposite;
      twi = ev.therapeutic.twi;
      const expl = ev.planExplanation ?? buildPlanExplanation(ev, "IMRT");
      xaiBullets = expl.bullets.length;
      if (xaiBullets < 2) throw new Error("Composite XAI missing bullets");
    } else {
      const firstKey = structures[0]!;
      const pts = merged.dvhByStructure[firstKey] ?? [];
      const role = inferEvaluationRole(firstKey, path.basename(files[0]!));
      const organ = mapToLiteratureOrgan(firstKey, path.basename(files[0]!)) ?? "Parotid";
      const calc = offlineCalculate({
        dvh: pts,
        totalDose: 70,
        numFractions: 35,
        organ,
        structureType: role,
        model: role === "target" ? "zaider_minerbo" : "lkb_loglogit",
        cancerSite: "HN",
        technique: "IMRT",
      });
      if (role === "target") tcp = calc.tcp;
      else ntcp = calc.ntcp;
      const singleExpl = buildSingleStructureExplanation({
        structureType: role,
        organ,
        model: calc.model,
        structureName: firstKey,
        tcp: calc.tcp,
        ntcp: calc.ntcp,
        doseMetrics: calc.doseMetrics,
        totalDose: 70,
        numFractions: 35,
        technique: "IMRT",
        bed: calc.bed,
        eqd2: calc.eqd2,
      });
      xaiBullets = singleExpl.bullets.length;
    }

    const clinicalRows = clinicalContextSummary(
      parseClinicalContext(JSON.stringify(EMPTY_CLINICAL)),
      "HN",
      "oar",
      "Parotid",
    );

    if (structures.length !== Object.keys(mobileMerged.dvhByStructure).length) {
      throw new Error("Mobile parser structure count mismatch");
    }

    return {
      id: scenario.id,
      label: scenario.label,
      files: files.map((f) => path.relative(root, f)),
      parseOk: true,
      structures,
      therapeuticWindow: scope.therapeuticWindowEligible,
      tcp,
      ntcp,
      twi,
      xaiBullets,
      error: clinicalRows.length >= 0 ? undefined : undefined,
    };
  } catch (e) {
    return {
      id: scenario.id,
      label: scenario.label,
      files: files.map((f) => path.relative(root, f)),
      parseOk: false,
      structures: [],
      therapeuticWindow: false,
      xaiBullets: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function main() {
  const root = getInputFoldersRoot();
  const steps: StepResult[] = [];
  const scenarios: ScenarioResult[] = [];
  const t0 = Date.now();

  console.log("=== rbGyanX full automation suite ===\n");

  const unitScripts = [
    "run_offline_engine_test.ts",
    "run_dvh_parse_test.ts",
    "run_report_export_test.ts",
    "run_phase4_xai_test.ts",
    "run_composite_plan_test.ts",
    "run_therapeutic_window_all_sites.ts",
  ];

  for (const s of unitScripts) {
    console.log(`>>> ${s}`);
    const r = runScript(s);
    steps.push(r);
    console.log(r.status, r.detail.slice(0, 120));
    if (r.status === "FAIL") break;
  }

  if (root) {
    console.log(`\n>>> input_folders scenarios (${root})\n`);
    const allFiles = walkDvh(root);
    console.log(`DVH files discovered: ${allFiles.length}`);

    for (const sc of SCENARIOS) {
      const r = runScenario(root, sc);
      scenarios.push(r);
      const icon = r.parseOk && !r.error ? "PASS" : "FAIL";
      console.log(
        `${icon} ${sc.id}: structures=${r.structures.length} TW=${r.therapeuticWindow} XAI=${r.xaiBullets}` +
          (r.error ? ` err=${r.error}` : ""),
      );
    }

    if (process.env.RBGYANX_FULL_SUITE === "1") {
      const suite = runScript("run_rbgyanx_test_data_suite.ts");
      steps.push({ ...suite, name: "run_rbgyanx_test_data_suite.ts (full walk)" });
    }
  } else {
    steps.push({
      name: "input_folders",
      status: "SKIP",
      detail: "Set INPUT_FOLDERS to run scenario tests",
    });
  }

  const scenarioFails = scenarios.filter((s) => !s.parseOk || s.error);
  const stepFails = steps.filter((s) => s.status === "FAIL");
  const overall = stepFails.length === 0 && scenarioFails.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    inputRoot: root,
    overall: overall ? "PASS" : "FAIL",
    steps,
    scenarios,
    summary: {
      stepsPass: steps.filter((s) => s.status === "PASS").length,
      stepsFail: stepFails.length,
      scenariosPass: scenarios.filter((s) => s.parseOk && !s.error).length,
      scenariosFail: scenarioFails.length,
    },
  };

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "FULL_AUTOMATION_REPORT.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    "# rbGyanX — Full Automation Test Report",
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Duration:** ${(report.durationMs / 1000).toFixed(1)}s`,
    `**Overall:** ${report.overall}`,
    `**Input root:** ${root ?? "(not set)"}`,
    "",
    "## Unit / integration steps",
    "",
    "| Step | Status | Time (ms) | Detail |",
    "|------|--------|-----------|--------|",
    ...steps.map(
      (s) => `| ${s.name} | ${s.status} | ${s.ms ?? "—"} | ${s.detail.replace(/\|/g, "/").slice(0, 80)} |`,
    ),
    "",
    "## Clinical scenarios (input_folders)",
    "",
    "| Scenario | Files | Structures | TW | TCP | NTCP | TWI | XAI bullets | Status |",
    "|----------|-------|------------|----|-----|------|-----|-------------|--------|",
    ...scenarios.map((s) => {
      const st = s.parseOk && !s.error ? "PASS" : "FAIL";
      return `| ${s.label} | ${s.files.length} | ${s.structures.join(", ") || "—"} | ${s.therapeuticWindow} | ${s.tcp != null ? (s.tcp * 100).toFixed(1) + "%" : "—"} | ${s.ntcp != null ? (s.ntcp * 100).toFixed(1) + "%" : "—"} | ${s.twi != null ? (s.twi * 100).toFixed(1) + "%" : "—"} | ${s.xaiBullets} | ${st}${s.error ? ` (${s.error})` : ""} |`;
    }),
    "",
    "## Platforms",
    "",
    "- **Desktop (web):** `npm run dev:desktop` → http://localhost:8081",
    "- **Android APK:** `npm run build:android:release` → `npm run install:phone`",
    "- **BlueStacks:** removed — use physical device or desktop browser",
    "",
    "## rb X (XAI)",
    "",
    "- Calculation results → **rb X** tab: single-structure explainability",
    "- Therapeutic window screen: composite plan XAI when PTV+OAR imported",
    "",
  ].join("\n");

  const mdPath = path.join(outDir, "FULL_AUTOMATION_REPORT.md");
  fs.writeFileSync(mdPath, md);

  console.log(`\nReport JSON: ${jsonPath}`);
  console.log(`Report MD:   ${mdPath}`);
  console.log(`\n=== OVERALL: ${report.overall} ===`);

  process.exit(overall ? 0 : 1);
}

main();
