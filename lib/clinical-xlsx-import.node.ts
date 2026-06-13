/**
 * Node-only: load clinical xlsx from a directory (scripts / CI).
 */
import fs from "fs";
import path from "path";
import { buildClinicalBundleFromXlsxFiles } from "./clinical-xlsx-parse";
import type { ClinicalBundle } from "./clinical-xlsx-core";

export function loadClinicalBundles(clinicalDir: string): ClinicalBundle | null {
  if (!fs.existsSync(clinicalDir)) return null;
  const files = fs
    .readdirSync(clinicalDir)
    .filter((f) => f.endsWith(".xlsx"))
    .map((f) => ({
      fileName: f,
      bytes: fs.readFileSync(path.join(clinicalDir, f)).buffer as ArrayBuffer,
    }));
  if (!files.length) return null;
  return buildClinicalBundleFromXlsxFiles(files);
}

/** Load a single clinical workbook (mobile pilot xlsx). */
export function loadClinicalBundleFromFile(xlsxPath: string): ClinicalBundle | null {
  if (!fs.existsSync(xlsxPath)) return null;
  const bytes = fs.readFileSync(xlsxPath).buffer as ArrayBuffer;
  return buildClinicalBundleFromXlsxFiles([
    { fileName: path.basename(xlsxPath), bytes },
  ]);
}
