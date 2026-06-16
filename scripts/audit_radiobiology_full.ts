/**
 * Full radiobiology audit — 17 composite DVHs vs engine reference.
 * Reports prescription mismatch impact (70 vs header Rx), plan indices, all models.
 */
import fs from "fs";
import path from "path";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
  resolveCompositeDvhDir,
  runEngineForMobileAppCase,
  type EngineCaseResult,
} from "./mobile-app-input-suite-core";
import { offlineParseDvh, offlineCalculate } from "../lib/offline-engine";
import { computeTargetPlanIndices } from "../lib/plan-dosimetric-indices";
import { classifyStructure } from "../lib/structure-nomenclature";
import { getOrganParameters, type RadiobiologyModelId } from "../server/parameters";
import { inferTargetTypeFromName } from "../lib/infer-target-type";

const MODELS: RadiobiologyModelId[] = [
  "lkb_loglogit",
  "lkb_probit",
  "poisson",
  "zaider_minerbo",
  "poisson_dvh",
];

const OUT_DIR =
  process.env.AUDIT_OUT?.trim() ||
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\rbGyanX_mobile_paper\\radbiocalc_app_input_output\\rbGyanX_v1.0.0_validation_output";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function auditPrescriptionMismatch(root: string): string {
  const dvhDir = resolveCompositeDvhDir(root);
  const file = path.join(dvhDir, "RBX-TXT-001_composite_DVH.txt");
  const content = fs.readFileSync(file, "utf8");
  const bundle = offlineParseDvh(content, "RBX-TXT-001_composite_DVH.txt");
  const ptv = bundle.structures.find((s) => s.type === "target")?.name ?? "PTV 66";
  const dvh = bundle.dvhByStructure[ptv] ?? [];
  const rx = 66;
  const wrong = 70;
  const fx = 33;
  const correct = computeTargetPlanIndices(dvh, rx, {
    totalDoseGy: rx,
    numFractions: fx,
    technique: "IMRT",
    cancerSite: "HN",
  });
  const withWrong = computeTargetPlanIndices(dvh, wrong, {
    totalDoseGy: wrong,
    numFractions: fx,
    technique: "IMRT",
    cancerSite: "HN",
  });
  const lines = [
    "## Prescription mismatch audit (RBX-TXT-001)",
    "",
    "DVH header prescribes **66.0 Gy**. App setup previously defaulted to **70 Gy**, which skews TCI/CI/V100.",
    "",
    "| Metric | Correct (66 Gy Rx) | Wrong (70 Gy Rx) | Δ |",
    "|--------|-------------------:|-----------------:|--:|",
    `| TCI% | ${correct.tciPercent.toFixed(1)} | ${withWrong.tciPercent.toFixed(1)} | ${(withWrong.tciPercent - correct.tciPercent).toFixed(1)} |`,
    `| CI RTOG | ${correct.ciRtog != null ? correct.ciRtog.toFixed(3) : "N/A"} | ${withWrong.ciRtog != null ? withWrong.ciRtog.toFixed(3) : "N/A"} | — |`,
    `| HI (ICRU-83) | ${correct.hiIcru83.toFixed(3)} | ${withWrong.hiIcru83.toFixed(3)} | ${(withWrong.hiIcru83 - correct.hiIcru83).toFixed(3)} |`,
    `| D95 (Gy) | ${correct.d95.toFixed(1)} | ${withWrong.d95.toFixed(1)} | — |`,
    `| V100% Rx | ${correct.v100Rx.toFixed(1)}% | ${withWrong.v100Rx.toFixed(1)}% | ${(withWrong.v100Rx - correct.v100Rx).toFixed(1)} |`,
    "",
  ];
  return lines.join("\n");
}

function structureModelTable(
  root: string,
  patientId: string,
  doseGy: number,
  fractions: number,
): string {
  const dvhDir = resolveCompositeDvhDir(root);
  const file = fs
    .readdirSync(dvhDir)
    .find((f) => f.toUpperCase().startsWith(patientId.toUpperCase()));
  if (!file) return "";
  const content = fs.readFileSync(path.join(dvhDir, file), "utf8");
  const bundle = offlineParseDvh(content, file);
  const rows: string[] = [
    `### ${patientId} — per-structure models (${doseGy} Gy / ${fractions} fx)`,
    "",
    "| Structure | Role | Model | Value |",
    "|-----------|------|-------|------:|",
  ];
  for (const s of bundle.structures) {
    const dvh = bundle.dvhByStructure[s.name] ?? [];
    if (!dvh.length) continue;
    const cls = classifyStructure(s.name, "");
    const organ = cls.literatureOrgan ?? cls.normalizedName;
    const targetType = inferTargetTypeFromName(s.name);
    for (const model of MODELS) {
      if (!getOrganParameters(organ, model)) continue;
      if (s.type === "target" && (model === "lkb_probit" || model === "poisson")) continue;
      const calc = offlineCalculate({
        dvh,
        totalDose: doseGy,
        numFractions: fractions,
        organ,
        structureType: s.type,
        model,
        cancerSite: "HN",
        technique: "IMRT",
        targetType,
        prescriptionGy: doseGy,
      });
      const val = s.type === "target" ? calc.tcp : calc.ntcp;
      if (val == null || !Number.isFinite(val)) continue;
      rows.push(
        `| ${s.name} | ${s.type} | ${model} | ${pct(val)} |`,
      );
    }
  }
  rows.push("");
  return rows.join("\n");
}

function main() {
  const root = getMobileAppInputRoot();
  const cases = discoverMobileAppCases(root);
  const results: EngineCaseResult[] = cases.map((c) =>
    runEngineForMobileAppCase(root, c),
  );
  const pass = results.filter((r) => r.pass).length;

  const lines: string[] = [
    "# rbGyanX radiobiology full audit",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Input:** ${root}`,
    `**Cases:** ${results.length} (${pass}/${results.length} engine PASS)`,
    "",
    auditPrescriptionMismatch(root),
    "## Composite plan results (engine)",
    "",
    "| Patient | TCP% | NTCP% | TWI% | TCI% | D95 | Dose | Fx |",
    "|---------|-----:|------:|-----:|-----:|----:|-----:|---:|",
  ];

  for (const r of results) {
    lines.push(
      `| ${r.patientId} | ${r.tcpPct.toFixed(1)} | ${r.ntcpPct.toFixed(1)} | ${r.twiPct.toFixed(1)} | ${r.tciPercent?.toFixed(1) ?? "—"} | ${r.d95Gy?.toFixed(1) ?? "—"} | ${r.doseUsedGy} | ${r.fractionsUsed} |`,
    );
  }

  lines.push("", "## Sample: all models per structure (RBX-TXT-001)", "");
  const meta = cases.find((c) => c.patientId === "RBX-TXT-001");
  if (meta) {
    lines.push(structureModelTable(root, "RBX-TXT-001", meta.totalDoseGy, meta.fractions));
  }

  lines.push("## Findings", "");
  lines.push(
    "- **CI/HI/TCI** depend on prescription Gy from DVH header — not on user-entered dose if they differ.",
  );
  lines.push(
    "- **UI** now defaults setup dose/fx from DVH header and shows all TCP/NTCP models on Biological tab.",
  );
  lines.push(
    "- **Composite evaluation** infers GTV/CTV/PTV from structure name for TCP models.",
  );
  lines.push(
    "- **Clinical covariates** apply log-odds shifts (age, sex, chemo, smoking, ECOG, organ dose slope); Clinical tab shows factors and Δ.",
  );

  const outPath = path.join(OUT_DIR, "04_RADIOBIOLOGY_AUDIT.md");
  const auditCopy = path.join(OUT_DIR, "engine_results_audit.md");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const body = lines.join("\n");
  fs.writeFileSync(outPath, body, "utf8");
  fs.writeFileSync(auditCopy, body, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Engine: ${pass}/${results.length} PASS`);
  if (pass < results.length) {
    for (const r of results.filter((x) => !x.pass)) {
      console.error(`${r.patientId} FAIL:`, r.errors.join("; "));
    }
    process.exit(1);
  }
}

main();
