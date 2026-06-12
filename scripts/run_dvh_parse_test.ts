import fs from "fs";
import path from "path";
import { offlineMergeDvhs, offlineParseDvh } from "../lib/offline-engine";
import { analyzePlanScope } from "../lib/plan-scope";
import { mergeDvhsOnDevice, parseDvhOnDevice } from "../lib/parse-dvh-mobile";

const files = [
  String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\PTV_data\KASTOORI_PTV70.txt`,
  String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\PTV_data\Motilal  PTV HR.txt`,
  String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\HN57_OAR_Eclipse\KASTOORI_COM_PRTD.txt`,
];

const combinedDir = String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\input_data\tcp_ntcp_combined_input\PTV_OAR_DVH_TCP_NTCP_combined_input`;

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

testSet("User 3-file pick", files);

const kastooriCombined = [
  files[0],
  files[2],
  path.join(combinedDir, "KASTOORI_COM_PRTD.txt"),
].filter((p) => fs.existsSync(p));

if (kastooriCombined.length >= 2) {
  testSet("Kastoori PTV + OAR same patient", kastooriCombined);
}

const sampleCombined = fs
  .readdirSync(combinedDir)
  .filter((f) => f.endsWith(".txt") && f.toUpperCase().includes("MOTILAL"))
  .slice(0, 4)
  .map((f) => path.join(combinedDir, f));

if (sampleCombined.length) {
  testSet("Motilal samples from combined_input", sampleCombined);
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

testNativeMobile("Kastoori native", [
  String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\PTV_data\KASTOORI_PTV70.txt`,
  String.raw`C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data\HN57_OAR_Eclipse\KASTOORI_COM_PRTD.txt`,
]);

console.log("\nAll DVH parse tests passed.");
