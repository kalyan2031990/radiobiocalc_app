/**
 * Manuscript-grade numerical export — radbiocalc_input (163 txt + DICOM + clinical xlsx).
 * Includes covariate-adjusted TCP/NTCP and toxicity correlation (observed vs synthetic flagged).
 *
 * Usage: INPUT_FOLDERS=C:\...\radbiocalc_input npx tsx scripts/run_manuscript_export.ts
 */
import fs from "fs";
import path from "path";
import { parseCSVDVH } from "../server/data-handler";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { mapToLiteratureOrgan } from "../lib/plan-evaluation";
import { offlineEvaluateComposite } from "../lib/offline-engine";
import { parseDicomDvhFiles } from "../lib/dicom-dvh-native";
import { classifyStructure } from "../lib/structure-nomenclature";
import { loadClinicalBundles } from "../lib/clinical-xlsx-import.node";
import { lookupClinicalRecord } from "../lib/clinical-xlsx-import";
import {
  applyManuscriptCovariates,
  pearsonR,
  spearmanR,
} from "../lib/manuscript-covariates";
import { getInputFoldersRoot } from "./test-data-root";

type Row = {
  patientId: string;
  file: string;
  organFolder: string;
  structure: string;
  literatureOrgan: string | null;
  role: string;
  meanDoseGy: number;
  maxDoseGy: number;
  minDoseGy?: number;
  gEUD: number;
  totalDoseGy: number;
  fractions: number;
  model: string;
  tcp?: number;
  ntcp?: number;
  tcpAdjusted?: number;
  ntcpAdjusted?: number;
  clinicalAge?: number;
  clinicalSex?: string;
  clinicalChemo?: string;
  clinicalSmoking?: string;
  clinicalTechnique?: string;
  clinicalTotalDoseGy?: number;
  clinicalFractions?: number;
  toxicityObserved?: number;
  clinicalDataSource?: string;
  clinicalSyntheticFlag?: boolean;
  clinicalAdequateForCorrelation?: boolean;
  covariateFactors?: string;
  error?: string;
};

function walkTxt(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkTxt(full, acc);
    else if (/\.txt$/i.test(name)) acc.push(full);
  }
  return acc;
}

function rxFromHeader(studyDate?: string): number | undefined {
  if (!studyDate?.startsWith("Rx")) return undefined;
  const n = parseFloat(studyDate.slice(2));
  return Number.isNaN(n) ? undefined : n;
}

function meanMaxFromDvh(dvh: { dose: number; volume: number }[]) {
  if (!dvh.length) return { mean: 0, max: 0, min: 0 };
  let vol = 0;
  let mean = 0;
  for (let i = 1; i < dvh.length; i++) {
    const dv = Math.max(0, dvh[i - 1]!.volume - dvh[i]!.volume);
    mean += dvh[i]!.dose * dv;
    vol += dv;
  }
  const doses = dvh.map((p) => p.dose);
  return {
    mean: vol > 0 ? mean / vol : 0,
    max: Math.max(...doses),
    min: Math.min(...doses.filter((d) => d > 0)),
  };
}

function runFile(
  filePath: string,
  root: string,
  clinicalBundle: ReturnType<typeof loadClinicalBundles>,
): Row {
  const rel = path.relative(root, filePath);
  const organFolder = path.dirname(rel).split(path.sep).pop() ?? "—";
  const base = path.basename(filePath);
  const patientId = base.replace(/_PTV\.txt$/i, "").replace(/\.txt$/i, "").split("_")[0] ?? base;

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseCSVDVH(content, base);
    const structure = parsed.structures[0]?.name ?? "Unknown";
    const dvh =
      parsed.dvhByStructure[structure] ?? Object.values(parsed.dvhByStructure)[0] ?? [];
    const lit = mapToLiteratureOrgan(structure);
    const role = classifyStructure(structure, base).role;
    const dm = meanMaxFromDvh(dvh);
    const maxD = dm.max;
    const isTarget = role === "target" || /ptv/i.test(structure) || /ptv/i.test(base);
    const rx = rxFromHeader(parsed.patientInfo.studyDate);
    const totalDoseGy = isTarget
      ? Math.max(rx ?? 0, maxD * 0.98) || 70
      : (rx ?? (maxD > 50 ? 54 : maxD)) || 54;
    const fractions = isTarget ? 35 : 30;
    const model = "lkb_loglogit";

    const clinical = clinicalBundle
      ? lookupClinicalRecord(clinicalBundle, parsed.patientInfo.patientId || patientId, organFolder, isTarget)
      : null;

    if (clinical && !clinical.syntheticFlag) {
      if (clinical.totalDoseGy > 0) {
        /* prefer clinical prescription when observed */
      }
    }

    if (!lit) {
      return {
        patientId,
        file: rel,
        organFolder,
        structure,
        literatureOrgan: null,
        role,
        meanDoseGy: dm.mean,
        maxDoseGy: dm.max,
        minDoseGy: dm.min,
        gEUD: 0,
        totalDoseGy,
        fractions,
        model,
        error: "No literature organ mapping",
      };
    }

    const params = getOrganParameters(lit, model);
    if (!params) {
      return {
        patientId,
        file: rel,
        organFolder,
        structure,
        literatureOrgan: lit,
        role,
        meanDoseGy: dm.mean,
        maxDoseGy: dm.max,
        gEUD: 0,
        totalDoseGy,
        fractions,
        model,
        error: `No parameters for ${lit}`,
      };
    }

    const rxGy = clinical && !clinical.syntheticFlag ? clinical.totalDoseGy : totalDoseGy;
    const rxFx = clinical && !clinical.syntheticFlag ? clinical.fractions : fractions;

    const result = performCalculation(
      {
        dvh,
        totalDose: rxGy,
        numFractions: rxFx,
        organ: lit,
        structureType: isTarget ? "target" : "oar",
        model,
      },
      params,
    );

    const cov = clinical
      ? applyManuscriptCovariates(result.tcp, result.ntcp, clinical, lit)
      : null;

    return {
      patientId: parsed.patientInfo.patientId || patientId,
      file: rel,
      organFolder,
      structure,
      literatureOrgan: lit,
      role,
      meanDoseGy: result.doseMetrics.meanDose,
      maxDoseGy: dm.max,
      minDoseGy: dm.min,
      gEUD: result.doseMetrics.gEUD,
      totalDoseGy: rxGy,
      fractions: rxFx,
      model,
      tcp: result.tcp,
      ntcp: result.ntcp,
      tcpAdjusted: cov?.adjustedTcp,
      ntcpAdjusted: cov?.adjustedNtcp,
      clinicalAge: clinical?.age,
      clinicalSex: clinical?.sex,
      clinicalChemo: clinical?.chemo,
      clinicalSmoking: clinical?.smoking,
      clinicalTechnique: clinical?.technique,
      clinicalTotalDoseGy: clinical?.totalDoseGy,
      clinicalFractions: clinical?.fractions,
      toxicityObserved: clinical?.toxicity,
      clinicalDataSource: clinical?.dataSource,
      clinicalSyntheticFlag: clinical?.syntheticFlag,
      clinicalAdequateForCorrelation: clinical?.adequateForCorrelation,
      covariateFactors: cov?.factorsApplied.join("; "),
    };
  } catch (e) {
    return {
      patientId,
      file: rel,
      organFolder,
      structure: "—",
      literatureOrgan: null,
      role: "—",
      meanDoseGy: 0,
      maxDoseGy: 0,
      gEUD: 0,
      totalDoseGy: 0,
      fractions: 0,
      model: "lkb_loglogit",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function summaryStats(values: number[]) {
  if (!values.length) return { n: 0, mean: 0, sd: 0, min: 0, max: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { n: values.length, mean, sd, min: sorted[0]!, max: sorted[sorted.length - 1]!, median };
}

function toxicityCorrelation(rows: Row[], organFolder: string, useAdjusted: boolean) {
  const subset = rows.filter(
    (r) =>
      r.organFolder === organFolder &&
      r.ntcp != null &&
      r.toxicityObserved != null &&
      r.clinicalAdequateForCorrelation === true,
  );
  if (subset.length < 5) return null;
  const tox = subset.map((r) => r.toxicityObserved!);
  const ntcp = subset.map((r) =>
    (useAdjusted ? (r.ntcpAdjusted ?? r.ntcp)! : r.ntcp!) * 100,
  );
  const geud = subset.map((r) => r.gEUD);
  return {
    n: subset.length,
    organ: organFolder,
    endpoint: "grade2plus_toxicity",
    pearson_ntcp: pearsonR(ntcp, tox),
    spearman_ntcp: spearmanR(ntcp, tox),
    pearson_geud_tox: pearsonR(geud, tox),
    meanNtcp: summaryStats(ntcp),
    toxicityRate: tox.filter((t) => t === 1).length / tox.length,
    adjusted: useAdjusted,
  };
}

function toCsv(rows: Row[]): string {
  const headers = [
    "patientId",
    "organFolder",
    "structure",
    "literatureOrgan",
    "role",
    "meanDoseGy",
    "maxDoseGy",
    "gEUD",
    "totalDoseGy",
    "fractions",
    "tcp_pct",
    "tcp_adjusted_pct",
    "ntcp_pct",
    "ntcp_adjusted_pct",
    "age",
    "sex",
    "chemo",
    "smoking",
    "technique",
    "clinical_totalDoseGy",
    "clinical_fractions",
    "toxicity_observed",
    "clinical_data_source",
    "clinical_synthetic_flag",
    "clinical_adequate_for_correlation",
    "covariate_factors",
    "file",
    "error",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.patientId,
        r.organFolder,
        `"${r.structure.replace(/"/g, '""')}"`,
        r.literatureOrgan ?? "",
        r.role,
        r.meanDoseGy.toFixed(4),
        r.maxDoseGy.toFixed(4),
        r.gEUD.toFixed(4),
        r.totalDoseGy.toFixed(2),
        r.fractions,
        r.tcp != null ? (r.tcp * 100).toFixed(4) : "",
        r.tcpAdjusted != null ? (r.tcpAdjusted * 100).toFixed(4) : "",
        r.ntcp != null ? (r.ntcp * 100).toFixed(4) : "",
        r.ntcpAdjusted != null ? (r.ntcpAdjusted * 100).toFixed(4) : "",
        r.clinicalAge ?? "",
        r.clinicalSex ?? "",
        r.clinicalChemo ?? "",
        r.clinicalSmoking ?? "",
        r.clinicalTechnique ?? "",
        r.clinicalTotalDoseGy ?? "",
        r.clinicalFractions ?? "",
        r.toxicityObserved ?? "",
        r.clinicalDataSource ?? "",
        r.clinicalSyntheticFlag === true ? "1" : r.clinicalSyntheticFlag === false ? "0" : "",
        r.clinicalAdequateForCorrelation === true ? "1" : r.clinicalAdequateForCorrelation === false ? "0" : "",
        `"${(r.covariateFactors ?? "").replace(/"/g, '""')}"`,
        `"${r.file.replace(/"/g, '""')}"`,
        r.error ?? "",
      ].join(","),
    );
  }
  return lines.join("\n");
}

function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  const clinicalDir = path.join(root, "clinical_input");
  const clinicalBundle = loadClinicalBundles(clinicalDir);

  const txtFiles = [
    ...walkTxt(path.join(root, "OAR_DVH_txt_data")),
    ...walkTxt(path.join(root, "PTV_DVH_txt_data_14pt")),
  ];
  const rows = txtFiles.map((f) => runFile(f, root, clinicalBundle));
  const ok = rows.filter((r) => !r.error);
  const tcpRows = ok.filter((r) => r.tcp != null);
  const ntcpRows = ok.filter((r) => r.ntcp != null);

  const observedClinical = ok.filter((r) => r.clinicalSyntheticFlag === false);
  const syntheticClinical = ok.filter((r) => r.clinicalSyntheticFlag === true);

  const byOrgan: Record<string, { ntcp: number[]; ntcpAdj: number[]; meanDose: number[]; gEUD: number[] }> = {};
  for (const r of ntcpRows) {
    const key = r.organFolder;
    byOrgan[key] ??= { ntcp: [], ntcpAdj: [], meanDose: [], gEUD: [] };
    byOrgan[key]!.ntcp.push((r.ntcp ?? 0) * 100);
    byOrgan[key]!.ntcpAdj.push((r.ntcpAdjusted ?? r.ntcp ?? 0) * 100);
    byOrgan[key]!.meanDose.push(r.meanDoseGy);
    byOrgan[key]!.gEUD.push(r.gEUD);
  }

  const organSummary = Object.entries(byOrgan).map(([organ, v]) => ({
    organ,
    ntcp_base_pct: summaryStats(v.ntcp),
    ntcp_adjusted_pct: summaryStats(v.ntcpAdj),
    meanDoseGy: summaryStats(v.meanDose),
    gEUD: summaryStats(v.gEUD),
  }));

  const tcpBase = summaryStats(tcpRows.map((r) => (r.tcp ?? 0) * 100));
  const tcpAdj = summaryStats(tcpRows.map((r) => (r.tcpAdjusted ?? r.tcp ?? 0) * 100));

  const correlations = {
    parotid_base: toxicityCorrelation(ntcpRows, "parotid", false),
    parotid_adjusted: toxicityCorrelation(ntcpRows, "parotid", true),
    laryanx_base: toxicityCorrelation(ntcpRows, "laryanx", false),
    laryanx_adjusted: toxicityCorrelation(ntcpRows, "laryanx", true),
    spinalcord_base: toxicityCorrelation(ntcpRows, "spinalcord", false),
    spinalcord_adjusted: toxicityCorrelation(ntcpRows, "spinalcord", true),
  };

  let dicom: Record<string, unknown> = { pass: false };
  const dicomDir = path.join(root, "DICOM_input_data_1pt");
  if (fs.existsSync(dicomDir)) {
    const dcms = fs.readdirSync(dicomDir).filter((f) => f.endsWith(".dcm") || /^R/.test(f));
    const parsed = parseDicomDvhFiles(
      dcms.map((name) => ({
        fileName: name,
        bytes: fs.readFileSync(path.join(dicomDir, name)).buffer,
      })),
    );
    const ev = offlineEvaluateComposite(parsed.bundle, {
      totalDose: 60,
      numFractions: 30,
      cancerSite: "LUNG",
      technique: "IMRT",
    });
    dicom = {
      pass: true,
      structures: parsed.structures.length,
      fractions: parsed.numFractions,
      structureList: parsed.structures.map((s) => ({
        name: s.name,
        role: s.role,
        maxDoseGy: s.maxDoseGy,
        meanDoseGy: s.meanDoseGy,
      })),
      composite: {
        tcp_pct: ev.therapeutic.tcp * 100,
        ntcp_pct: ev.therapeutic.ntcp != null ? ev.therapeutic.ntcp * 100 : null,
        twi_pct: ev.therapeutic.twi * 100,
      },
    };
  }

  const clinicalInventory = clinicalBundle
    ? {
        treatmentParamsRows: clinicalBundle.treatmentParams.length,
        ptvSyntheticRows: clinicalBundle.ptvSynthetic.length,
        hnTemplateRows: clinicalBundle.hnTemplates.length,
        cohortStats: clinicalBundle.cohortStats,
        matchedObserved: observedClinical.length,
        syntheticImputed: syntheticClinical.length,
      }
    : null;

  const report = {
    generatedAt: new Date().toISOString(),
    root,
    model: "LKB log-logistic + exploratory log-odds covariate adjustment",
    covariateNote:
      "Adjusted TCP/NTCP use age, sex, chemo, smoking, ECOG, organ-specific dose slopes (manuscript export layer).",
    dataset: {
      txtTotal: txtFiles.length,
      calculated: ok.length,
      failed: rows.length - ok.length,
      ptvTcp: tcpRows.length,
      oarNtcp: ntcpRows.length,
      clinicalInventory,
    },
    tcpSummary: {
      base_tcp_pct: tcpBase,
      adjusted_tcp_pct: tcpAdj,
    },
    organNtcpSummary: organSummary,
    toxicityCorrelations: correlations,
    dicom,
    rows,
  };

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "MANUSCRIPT_NUMERICAL.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "MANUSCRIPT_NUMERICAL.csv"), toCsv(rows));
  fs.writeFileSync(
    path.join(outDir, "MANUSCRIPT_CLINICAL_SUMMARY.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        clinicalInventory,
        tcpSummary: report.tcpSummary,
        organNtcpSummary: organSummary,
        toxicityCorrelations: correlations,
      },
      null,
      2,
    ),
  );

  console.log("=== Manuscript export (clinical covariates) ===");
  console.log(`Root: ${root}`);
  console.log(`DVH: ${txtFiles.length} | Calculated: ${ok.length}`);
  if (clinicalInventory) {
    console.log(
      `Clinical: ${clinicalInventory.matchedObserved} observed + ${clinicalInventory.syntheticImputed} synthetic-flagged`,
    );
  }

  console.log(`\n--- TCP (n=${tcpRows.length}) ---`);
  console.log(
    `Base: mean=${tcpBase.mean.toFixed(2)}% → Adjusted: mean=${tcpAdj.mean.toFixed(2)}%`,
  );

  console.log("\n--- NTCP by organ (base → adjusted mean) ---");
  for (const o of organSummary) {
    console.log(
      `${o.organ}: ${o.ntcp_base_pct.mean.toFixed(2)}% → ${o.ntcp_adjusted_pct.mean.toFixed(2)}% (n=${o.ntcp_base_pct.n})`,
    );
  }

  console.log("\n--- Toxicity vs NTCP (observed clinical only) ---");
  for (const [key, c] of Object.entries(correlations)) {
    if (!c) {
      console.log(`${key}: insufficient observed pairs`);
      continue;
    }
    console.log(
      `${key}: n=${c.n} toxRate=${(c.toxicityRate * 100).toFixed(1)}% r_NTCP=${c.pearson_ntcp?.toFixed(3) ?? "—"} r_gEUD=${c.pearson_geud_tox?.toFixed(3) ?? "—"}`,
    );
  }

  console.log(`\nCSV: test-output/MANUSCRIPT_NUMERICAL.csv`);
  console.log(`JSON: test-output/MANUSCRIPT_NUMERICAL.json`);
  console.log(`Clinical summary: test-output/MANUSCRIPT_CLINICAL_SUMMARY.json`);
}

main();
