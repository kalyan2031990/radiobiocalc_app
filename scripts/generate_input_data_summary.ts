/**
 * Input data inventory — radbiocalc_input → test-output/input_data_summary.csv
 */
import fs from "fs";
import path from "path";
import { getInputFoldersRoot } from "./test-data-root";

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  const rows: string[][] = [
    [
      "category",
      "subfolder",
      "file_count",
      "unique_patients",
      "notes",
    ],
  ];

  const add = (category: string, sub: string, files: string[], note: string) => {
    const ids = new Set<string>();
    for (const f of files) {
      const base = path.basename(f);
      const m = base.match(/(\d{4}-\d+)/);
      if (m) ids.add(m[1]!);
    }
    rows.push([category, sub, String(files.length), String(ids.size || files.length), note]);
  };

  const oarRoot = path.join(root, "OAR_DVH_txt_data");
  const ptvRoot = path.join(root, "PTV_DVH_txt_data_14pt");
  const dicomRoot = path.join(root, "DICOM_input_data_1pt");
  const clinRoot = path.join(root, "clinical_input");

  if (fs.existsSync(oarRoot)) {
    for (const organ of fs.readdirSync(oarRoot)) {
      const dir = path.join(oarRoot, organ);
      if (!fs.statSync(dir).isDirectory()) continue;
      add("OAR_DVH_txt", organ, walk(dir).filter((f) => /\.txt$/i.test(f)), "Eclipse OAR");
    }
  }
  if (fs.existsSync(ptvRoot)) {
    add(
      "PTV_DVH_txt",
      "PTV_DVH_txt_data_14pt",
      fs.readdirSync(ptvRoot).filter((f) => /\.txt$/i.test(f)).map((f) => path.join(ptvRoot, f)),
      "Eclipse PTV targets",
    );
  }
  if (fs.existsSync(dicomRoot)) {
    add(
      "DICOM",
      "DICOM_input_data_1pt",
      fs.readdirSync(dicomRoot).map((f) => path.join(dicomRoot, f)),
      "RTDOSE/STRUCT/PLAN",
    );
  }
  if (fs.existsSync(clinRoot)) {
    const xlsx = fs.readdirSync(clinRoot).filter((f) => f.endsWith(".xlsx"));
    rows.push(["clinical_xlsx", "clinical_input", String(xlsx.length), "—", xlsx.join("; ")]);
  }

  const allTxt = walk(oarRoot).concat(walk(ptvRoot)).filter((f) => /\.txt$/i.test(f));
  const allIds = new Set<string>();
  for (const f of allTxt) {
    const m = path.basename(f).match(/(\d{4}-\d+)/);
    if (m) allIds.add(m[1]!);
  }
  rows.push(["TOTAL", "all", String(allTxt.length), String(allIds.size), root]);

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, "input_data_summary.csv");
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  fs.writeFileSync(csvPath, csv);
  console.log(`Wrote ${csvPath} (${rows.length - 1} rows)`);
}

main();
