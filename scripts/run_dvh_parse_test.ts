/**
 * DVH parse test (v1.2.0 — portable).
 *
 * Always exercises the repo-bundled sample (samples/input/) through both the
 * offline engine parser and the native mobile parser, plus merge + plan-scope
 * analysis. Legacy machine-specific datasets run only when present (they live
 * outside the repo); their absence is reported as SKIP, never a crash.
 */
import fs from "fs";
import path from "path";
import { offlineMergeDvhs, offlineParseDvh } from "../lib/offline-engine";
import { analyzePlanScope } from "../lib/plan-scope";
import { mergeDvhsOnDevice, parseDvhOnDevice } from "../lib/parse-dvh-mobile";

const REPO_SAMPLE = path.join(
  __dirname,
  "..",
  "samples",
  "input",
  "RBX-TXT-001_composite_DVH.txt",
);

const LEGACY_SETS: { label: string; paths: string[] }[] = [
  {
    label: "Legacy 3-file pick",
    paths: [
      String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\PTV_data\KASTOORI_PTV70.txt`,
      String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\PTV_data\Motilal  PTV HR.txt`,
      String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\HN57_OAR_Eclipse\KASTOORI_COM_PRTD.txt`,
    ],
  },
];

function testSet(label: string, paths: string[]) {
  console.log(`\n=== ${label} (${paths.length} files) ===`);
  const bundles = [];
  for (const p of paths) {
    const content = fs.readFileSync(p, "utf8");
    const name = path.basename(p);
    try {
      const b = offlineParseDvh(content, name);
      const pts = Object.values(b.dvhByStructure).reduce((n, arr) => n + arr.length, 0);
      console.log(`OK ${name}: ${Object.keys(b.dvhByStructure).join(", ")} (${pts} pts)`);
      bundles.push(b);
    } catch (e) {
      console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }
  const merged = offlineMergeDvhs(bundles);
  const scope = analyzePlanScope(merged);
  const json = JSON.stringify(merged);
  console.log(
    `MERGE OK: ${scope.structureCount} structures, therapeutic=${scope.therapeuticWindowEligible}, json=${(json.length / 1024).toFixed(1)} KB`,
  );
}

function testNativeMobile(label: string, paths: string[]) {
  console.log(`\n=== ${label} (native mobile parser) ===`);
  const bundles = [];
  for (const p of paths) {
    const content = fs.readFileSync(p, "utf8");
    const name = path.basename(p);
    const b = parseDvhOnDevice(content, name);
    const pts = Object.values(b.dvhByStructure).reduce((n, arr) => n + arr.length, 0);
    console.log(`OK ${name}: ${Object.keys(b.dvhByStructure).join(", ")} (${pts} pts)`);
    bundles.push(b);
  }
  if (bundles.length > 1) {
    mergeDvhsOnDevice(bundles);
    console.log(`MERGE OK: ${bundles.length} files`);
  }
}

// ── Repo-bundled sample (always runs) ───────────────────────────────────────
if (!fs.existsSync(REPO_SAMPLE)) {
  console.error(`FAIL: bundled sample missing: ${REPO_SAMPLE}`);
  process.exit(1);
}
testSet("Repo bundled sample", [REPO_SAMPLE]);
testNativeMobile("Repo bundled sample", [REPO_SAMPLE]);

// ── Legacy machine-specific sets (optional) ─────────────────────────────────
for (const set of LEGACY_SETS) {
  const present = set.paths.filter((p) => fs.existsSync(p));
  if (present.length >= 2) {
    testSet(set.label, present);
    testNativeMobile(set.label, present);
  } else {
    console.log(`\nSKIP ${set.label}: legacy files not present on this machine`);
  }
}

console.log("\nAll DVH parse tests passed.");
