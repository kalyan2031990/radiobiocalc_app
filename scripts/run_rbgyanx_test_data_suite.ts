/**
 * Full mobile stack test against rbgyanx_test_data (Eclipse txt, CSV).
 * Usage: npx tsx scripts/run_rbgyanx_test_data_suite.ts
 */

import fs from "fs";
import path from "path";
import { parseCSVDVH } from "../server/data-handler";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { mapToLiteratureOrgan } from "../lib/plan-evaluation";
import { calculateNTCP_LKB_LogLogit } from "../server/radiobiology";

const ROOT =
  process.env.RBGYANX_TEST_DATA ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\rbgyanx_test_data";

const SKIP_DIRS = new Set([
  "_integration_test_output",
  "_test_preprocess_out",
  "kalpak_dcm_files",
  "DICOM_samples_dicom",
  "clinical_data",
]);

type Row = {
  file: string;
  rel: string;
  structure: string;
  organ: string | null;
  role: "target" | "oar";
  points: number;
  model: string;
  tcp?: number;
  ntcp?: number;
  error?: string;
};

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (
      /\.(txt|csv)$/i.test(name) &&
      !name.startsWith(".") &&
      !/summary|manifest|report|readme/i.test(name)
    ) {
      acc.push(full);
    }
  }
  return acc;
}

function runOne(filePath: string): Row {
  const rel = path.relative(ROOT, filePath);
  const base = path.basename(filePath);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseCSVDVH(content, base);
    const structure = parsed.structures[0]?.name ?? "Unknown";
    const dvh =
      parsed.dvhByStructure[structure] ??
      Object.values(parsed.dvhByStructure)[0] ??
      [];
    let lit = mapToLiteratureOrgan(structure, base);
    if (!lit) lit = mapToLiteratureOrgan(base.replace(/\.[^.]+$/, ""), base);
    const isTarget =
      parsed.structures[0]?.type === "target" ||
      /ptv|gtv|ctv|itv/i.test(structure);
    const role = isTarget ? "target" : "oar";
    if (!lit) {
      return {
        file: base,
        rel,
        structure,
        organ: null,
        role,
        points: dvh.length,
        model: "—",
        error: "Unmapped structure",
      };
    }

    const maxD = Math.max(...dvh.map((p) => p.dose), 0);
    const totalDose = isTarget ? Math.max(maxD * 0.98, 50) : maxD > 40 ? 54 : maxD || 54;
    const fractions = totalDose > 55 ? 35 : totalDose > 30 ? 15 : 5;
    const model =
      role === "target" ? "zaider_minerbo" : "lkb_loglogit";
    const params = getOrganParameters(lit, model);
    if (!params) {
      return {
        file: base,
        rel,
        structure,
        organ: lit,
        role,
        points: dvh.length,
        model,
        error: "No literature parameters",
      };
    }

    const result = performCalculation(
      {
        dvh,
        totalDose,
        numFractions: fractions,
        organ: lit,
        structureType: role,
        model: model as "zaider_minerbo" | "lkb_loglogit",
        cancerSite: "HN",
        technique: fractions <= 5 ? "SBRT" : "IMRT",
        targetType: /gtv/i.test(structure) ? "GTV" : "PTV",
      },
      params
    );

    return {
      file: base,
      rel,
      structure,
      organ: lit,
      role,
      points: dvh.length,
      model,
      tcp: result.tcp,
      ntcp: result.ntcp,
    };
  } catch (e) {
    return {
      file: base,
      rel,
      structure: "—",
      organ: null,
      role: "oar",
      points: 0,
      model: "—",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function main() {
  console.log("=== rbGyanX mobile — rbgyanx_test_data suite ===\n");
  console.log(`Root: ${ROOT}\n`);

  const files = walk(ROOT);
  console.log(`DVH files found: ${files.length}\n`);

  const rows = files.map(runOne);
  const parsed = rows.filter((r) => !r.error);
  const failed = rows.filter((r) => r.error);
  const unmapped = failed.filter((r) => r.error?.includes("Unmapped"));
  const parseFail = failed.filter((r) => !r.error?.includes("Unmapped"));

  console.log(`Calculated: ${parsed.length}`);
  console.log(`Failed: ${failed.length} (unmapped: ${unmapped.length}, parse/other: ${parseFail.length})`);

  const ref = calculateNTCP_LKB_LogLogit(26.5, 28.4, 1);
  console.log(`LKB reference check: ${ref.toFixed(6)}\n`);

  if (parsed.length > 0) {
    const t = parsed.find((r) => r.tcp != null && r.tcp > 0);
    const n = parsed.find((r) => r.ntcp != null && r.ntcp > 0 && r.ntcp < 1);
    if (t) {
      console.log(
        `Sample TCP: ${t.file} → ${((t.tcp ?? 0) * 100).toFixed(1)}% (${t.organ})`
      );
    }
    if (n) {
      console.log(
        `Sample NTCP: ${n.file} → ${((n.ntcp ?? 0) * 100).toFixed(1)}% (${n.organ})`
      );
    }
  }

  if (parseFail.length > 0) {
    console.log("\nParse/other errors (first 8):");
    for (const r of parseFail.slice(0, 8)) {
      console.log(`  ${r.rel}: ${r.error}`);
    }
  }

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "rbgyanx_test_data_report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        root: ROOT,
        totalFiles: files.length,
        calculated: parsed.length,
        failed: failed.length,
        unmapped: unmapped.length,
        rows,
      },
      null,
      2
    )
  );
  console.log(`\nReport: ${reportPath}`);

  if (parseFail.length > 0) process.exit(1);
}

main();
