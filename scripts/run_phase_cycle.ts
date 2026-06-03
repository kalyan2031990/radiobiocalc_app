/**
 * Run automated test cycle: Phase 2a → clinical → composite → therapeutic → rbgyanx suite.
 */
import { spawnSync } from "child_process";
import path from "path";

const root = process.cwd();
const tsx = path.join(root, "node_modules", ".bin", "tsx");
const run = (script: string) => {
  console.log(`\n>>> ${script}\n`);
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", path.join("scripts", script)],
    { cwd: root, stdio: "inherit", shell: true },
  );
  return r.status === 0;
};

const steps = [
  "run_phase2a_test.ts",
  "run_phase2b_test.ts",
  "run_clinical_consistency_test.ts",
  "run_composite_plan_test.ts",
  "run_therapeutic_window_all_sites.ts",
  "run_multi_site_smoke.ts",
];

async function main() {
  console.log("=== rbGyanX automated phase cycle ===");
  let ok = true;
  for (const s of steps) {
    if (!run(s)) {
      ok = false;
      console.error(`\nCycle stopped at ${s}`);
      break;
    }
  }
  if (ok) {
    run("run_plan_indices_clinical_test.ts");
    run("run_phase4_xai_test.ts");
    console.log("\n=== Optional full suite (may take several minutes) ===");
    const runFull = process.env.RBGYANX_FULL_SUITE === "1";
    if (runFull) {
      ok = run("run_rbgyanx_test_data_suite.ts");
    } else {
      console.log("Set RBGYANX_FULL_SUITE=1 to include rbgyanx_test_data suite.");
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
