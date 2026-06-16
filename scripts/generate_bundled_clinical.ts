/**
 * Generate bundled clinical JSON for offline APK from radbiocalc_input xlsx files.
 * Usage: INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/generate_bundled_clinical.ts
 */
import fs from "fs";
import path from "path";
import { loadClinicalBundles } from "../lib/clinical-xlsx-import.node";

import { getRadbiocalcInputRoot } from "./test-data-root";

const root = process.env.INPUT_FOLDERS?.trim() || getRadbiocalcInputRoot() || "";
const clinicalDir = path.join(root, "clinical_input");
const outPath = path.join(process.cwd(), "assets", "clinical", "bundled-clinical-hn57.json");

const bundle = loadClinicalBundles(clinicalDir);
if (!bundle) {
  console.error("No clinical xlsx in", clinicalDir);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));
console.log("Wrote", outPath);
console.log(
  `treatment=${bundle.treatmentParams.length} ptv=${bundle.ptvSynthetic.length} templates=${bundle.hnTemplates.length}`,
);
