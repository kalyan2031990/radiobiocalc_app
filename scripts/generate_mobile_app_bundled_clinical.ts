/**
 * Bundle rbGyaX mobile pilot clinical xlsx into offline APK assets.
 */
import fs from "fs";
import path from "path";
import { loadClinicalBundleFromFile } from "../lib/clinical-xlsx-import.node";

const defaultXlsx = path.join(
  process.cwd(),
  "test-input",
  "rbGyaX_mobile_app_input",
  "radiobiocalc_clinical_input.xlsx",
);

const xlsxPath = process.env.CLINICAL_XLSX?.trim() || defaultXlsx;
const outPath = path.join(process.cwd(), "assets", "clinical", "bundled-clinical-hn57.json");

const bundle = loadClinicalBundleFromFile(xlsxPath);
if (!bundle) {
  console.error("No clinical bundle from", xlsxPath);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));
console.log("Wrote", outPath);
console.log(
  `treatment=${bundle.treatmentParams.length} ptv=${bundle.ptvSynthetic.length} templates=${bundle.hnTemplates.length}`,
);
