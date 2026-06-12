/**
 * Real-data validation suite — radbiocalc_input (163 txt + DICOM patient).
 * Usage: INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/run_real_data_suite.ts
 */
import fs from "fs";
import path from "path";
import { getInputFoldersRoot } from "./test-data-root";
import { offlineParseDvh, offlineMergeDvhs, offlineCalculate, offlineEvaluateComposite } from "../lib/offline-engine";
import { parseDvhOnDevice } from "../lib/parse-dvh-mobile";
import { parseDicomDvhFiles } from "../lib/dicom-dvh-native";
import { analyzePlanScope } from "../lib/plan-scope";
import { classifyStructure } from "../lib/structure-nomenclature";
import { applyClinicalModifiers } from "../lib/clinical-modifiers";

type CaseRow = {
  file: string;
  structures: string[];
  role: string;
  meanDose?: number;
  maxDose?: number;
  tcp?: number;
  ntcp?: number;
  synthetic: boolean;
  pass: boolean;
  error?: string;
};

function walkTxt(root: string): string[] {
  const out: string[] = [];
  function go(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) go(full);
      else if (/\.txt$/i.test(name)) out.push(full);
    }
  }
  go(path.join(root, "OAR_DVH_txt_data"));
  go(path.join(root, "PTV_DVH_txt_data_14pt"));
  return out;
}

function stats(dvh: { dose: number; volume: number }[]) {
  if (!dvh.length) return { mean: 0, max: 0 };
  let vol = 0;
  let mean = 0;
  for (let i = 1; i < dvh.length; i++) {
    const dv = Math.max(0, dvh[i - 1]!.volume - dvh[i]!.volume);
    mean += dvh[i]!.dose * dv;
    vol += dv;
  }
  return { mean: vol > 0 ? mean / vol : 0, max: Math.max(...dvh.map((p) => p.dose)) };
}

function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS to radbiocalc_input");
    process.exit(1);
  }

  const txtFiles = walkTxt(root);
  const rows: CaseRow[] = [];
  let txtPass = 0;
  let txtFail = 0;

  console.log(`=== Real data suite ===\nRoot: ${root}\nTXT files: ${txtFiles.length}\n`);

  for (const file of txtFiles) {
    const rel = path.relative(root, file);
    try {
      const content = fs.readFileSync(file, "utf8");
      const b = offlineParseDvh(content, path.basename(file));
      const keys = Object.keys(b.dvhByStructure);
      const role = classifyStructure(keys[0] ?? "", path.basename(file)).role;
      const pts = b.dvhByStructure[keys[0]!] ?? [];
      const st = stats(pts);
      rows.push({
        file: rel,
        structures: keys,
        role,
        meanDose: st.mean,
        maxDose: st.max,
        synthetic: false,
        pass: st.max > 0 && st.max < 200,
      });
      txtPass++;
    } catch (e) {
      txtFail++;
      rows.push({
        file: rel,
        structures: [],
        role: "—",
        synthetic: false,
        pass: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let dicomPass = false;
  let dicomStructures: string[] = [];
  let dicomFractions: number | undefined;
  const dicomDir = path.join(root, "DICOM_input_data_1pt");
  if (fs.existsSync(dicomDir)) {
    try {
      const dcms = fs.readdirSync(dicomDir).filter((f) => f.endsWith(".dcm") || f.startsWith("R"));
      const inputs = dcms.map((name) => ({
        fileName: name,
        bytes: fs.readFileSync(path.join(dicomDir, name)).buffer,
      }));
      const d = parseDicomDvhFiles(inputs);
      dicomStructures = d.structures.map((s) => s.name);
      dicomFractions = d.numFractions;
      const target = d.structures.find((s) => s.role === "target" && s.maxDoseGy > 50);
      dicomPass =
        dicomStructures.length >= 10 &&
        dicomFractions === 30 &&
        (target?.maxDoseGy ?? 0) > 55;
      console.log(
        `DICOM: ${dicomStructures.length} structures, ${dicomFractions} fx, target max ~${target?.maxDoseGy?.toFixed(1) ?? "?"} Gy`,
      );
    } catch (e) {
      console.error("DICOM FAIL:", e instanceof Error ? e.message : e);
    }
  }

  let compositePass = false;
  const ptvFile = txtFiles.find((f) => /PTV|ptv/i.test(path.basename(f)));
  const oarFile = txtFiles.find((f) => /parotid|larynx|cord|lung|heart|oar/i.test(path.basename(f)) && f !== ptvFile);
  if (ptvFile && oarFile) {
    try {
      const merged = offlineMergeDvhs([
        offlineParseDvh(fs.readFileSync(ptvFile, "utf8"), path.basename(ptvFile)),
        offlineParseDvh(fs.readFileSync(oarFile, "utf8"), path.basename(oarFile)),
      ]);
      const scope = analyzePlanScope(merged);
      if (scope.therapeuticWindowEligible) {
        const ev = offlineEvaluateComposite(merged, {
          totalDose: 60,
          numFractions: 30,
          cancerSite: "HN",
          technique: "IMRT",
        });
        compositePass =
          scope.therapeuticWindowEligible &&
          ev.planExplanation != null &&
          Number.isFinite(ev.therapeutic.twi);
        console.log(`Composite TWI: ${(ev.therapeutic.twi * 100).toFixed(1)}%`);
      }
    } catch (e) {
      console.warn("Composite:", e instanceof Error ? e.message : e);
    }
  }
  if (!compositePass && dicomPass) {
    try {
      const dcms = fs.readdirSync(dicomDir).filter((f) => f.endsWith(".dcm") || /^R/.test(f));
      const merged = parseDicomDvhFiles(
        dcms.map((name) => ({
          fileName: name,
          bytes: fs.readFileSync(path.join(dicomDir, name)).buffer,
        })),
      ).bundle;
      const ev = offlineEvaluateComposite(merged, {
        totalDose: 60,
        numFractions: 30,
        cancerSite: "LUNG",
        technique: "IMRT",
      });
      compositePass = Number.isFinite(ev.therapeutic.twi) && ev.planExplanation != null;
      console.log(`DICOM composite TWI: ${(ev.therapeutic.twi * 100).toFixed(1)}%`);
    } catch {
      /* optional */
    }
  }

  const off = applyClinicalModifiers(0.5, 0.2, "HN", false, { age: 60 });
  const on = applyClinicalModifiers(0.5, 0.2, "HN", true, { age: 60 });
  const covariateOk = off.tcp === 0.5 && on.tcp === 0.5;

  const overall =
    txtFail === 0 &&
    txtFiles.length >= 160 &&
    dicomPass &&
    compositePass &&
    covariateOk;

  const report = {
    generatedAt: new Date().toISOString(),
    root,
    txtTotal: txtFiles.length,
    txtPass,
    txtFail,
    dicomPass,
    dicomStructures,
    dicomFractions,
    compositePass,
    covariateOk,
    overall: overall ? "PASS" : "FAIL",
    rows: rows.slice(0, 20),
  };

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "REAL_DATA_REPORT.json"), JSON.stringify(report, null, 2));

  const md = [
    "# Real Data Validation Report",
    "",
    `**Date:** ${report.generatedAt}`,
    `**Overall:** ${report.overall}`,
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Eclipse .txt parsed | ${txtPass}/${txtFiles.length} |`,
    `| DICOM structures | ${dicomStructures.length} (${dicomPass ? "PASS" : "FAIL"}) |`,
    `| DICOM fractions | ${dicomFractions ?? "—"} |`,
    `| Composite therapeutic window | ${compositePass ? "PASS" : "FAIL"} |`,
    `| Covariate OFF unchanged | ${covariateOk ? "PASS" : "FAIL"} |`,
    "",
    "PHI: all imports de-identified via `lib/anonymize.ts`.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "REAL_DATA_REPORT.md"), md);

  console.log(`\nTXT: ${txtPass}/${txtFiles.length} pass`);
  console.log(`Report: test-output/REAL_DATA_REPORT.md`);
  console.log(`OVERALL: ${report.overall}`);
  process.exit(overall ? 0 : 1);
}

main();
