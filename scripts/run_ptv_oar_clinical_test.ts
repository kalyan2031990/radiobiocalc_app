/**
 * PTV + OAR + clinical validation — real patient pair from radbiocalc_input.
 */
import fs from "fs";
import path from "path";
import { getInputFoldersRoot } from "./test-data-root";
import {
  offlineParseDvh,
  offlineMergeDvhs,
  offlineCalculate,
  offlineEvaluateComposite,
} from "../lib/offline-engine";
import { lookupClinicalForPlan } from "../lib/clinical-data-service";
import { applyClinicalModifiers } from "../lib/clinical-modifiers";
import { analyzePlanScope } from "../lib/plan-scope";

const PATIENT = "2019-1934";

async function main() {
  const root = getInputFoldersRoot();
  if (!root) {
    console.error("Set INPUT_FOLDERS");
    process.exit(1);
  }

  const ptv = path.join(root, "PTV_DVH_txt_data_14pt", `${PATIENT}_PTV.txt`);
  const oar = path.join(root, "OAR_DVH_txt_data", "parotid", `${PATIENT}_Parotid.txt`);

  const rows: { step: string; ok: boolean; detail: string }[] = [];

  if (!fs.existsSync(ptv) || !fs.existsSync(oar)) {
    console.error("Missing PTV or OAR file for", PATIENT);
    process.exit(1);
  }

  let merged;
  try {
    merged = offlineMergeDvhs([
      offlineParseDvh(fs.readFileSync(ptv, "utf8"), path.basename(ptv)),
      offlineParseDvh(fs.readFileSync(oar, "utf8"), path.basename(oar)),
    ]);
    const keys = Object.keys(merged.dvhByStructure);
    rows.push({
      step: "parse_merge",
      ok: keys.length >= 2,
      detail: `${keys.length} structures: ${keys.join(", ")}`,
    });
  } catch (e) {
    rows.push({ step: "parse_merge", ok: false, detail: String(e) });
    writeReport(root, rows, null);
    process.exit(1);
  }

  const scope = analyzePlanScope(merged);
  rows.push({
    step: "therapeutic_window_eligible",
    ok: scope.therapeuticWindowEligible,
    detail: scope.therapeuticWindowEligible ? "PTV+OAR detected" : "missing pair",
  });

  let composite;
  try {
    composite = offlineEvaluateComposite(merged, {
      totalDose: 66,
      numFractions: 33,
      cancerSite: "HN",
      technique: "VMAT",
      fileHint: PATIENT,
    });
    const tw = composite.therapeutic;
    rows.push({
      step: "composite_eval",
      ok: Number.isFinite(tw.tcp) && Number.isFinite(tw.ntcpComposite),
      detail: `TCP ${(tw.tcp * 100).toFixed(1)}% · NTCP ${(tw.ntcpComposite * 100).toFixed(1)}% · TWI ${(tw.twi * 100).toFixed(1)}%`,
    });
  } catch (e) {
    rows.push({ step: "composite_eval", ok: false, detail: String(e) });
  }

  const oarKey = Object.keys(merged.dvhByStructure).find((k) => /parot/i.test(k))!;
  const ptvKey = Object.keys(merged.dvhByStructure).find((k) => /ptv/i.test(k))!;

  let ntcp = 0;
  let tcp = 0;
  try {
    const oarPts = merged.dvhByStructure[oarKey] ?? [];
    const ptvPts = merged.dvhByStructure[ptvKey] ?? [];
    ntcp = offlineCalculate({
      dvh: oarPts,
      totalDose: 66,
      numFractions: 33,
      organ: "Parotid",
      structureType: "oar",
      model: "lkb_loglogit",
    }).ntcp;
    tcp = offlineCalculate({
      dvh: ptvPts,
      totalDose: 66,
      numFractions: 33,
      organ: "PTV",
      structureType: "target",
      model: "lkb_loglogit",
    }).tcp;
    rows.push({
      step: "single_structure_calc",
      ok: Number.isFinite(tcp) && Number.isFinite(ntcp),
      detail: `TCP ${(tcp * 100).toFixed(2)}% · NTCP ${(ntcp * 100).toFixed(2)}%`,
    });
  } catch (e) {
    rows.push({ step: "single_structure_calc", ok: false, detail: String(e) });
  }

  let clinicalLookup;
  try {
    clinicalLookup = await lookupClinicalForPlan(PATIENT, "Parotid", false);
    rows.push({
      step: "clinical_lookup",
      ok: clinicalLookup.hasAnySource,
      detail: clinicalLookup.hasAnySource
        ? `age ${clinicalLookup.record.age} · tox ${clinicalLookup.record.toxicity ?? "—"} · synthetic ${clinicalLookup.record.syntheticFlag ?? false}`
        : "no match",
    });
  } catch (e) {
    rows.push({ step: "clinical_lookup", ok: false, detail: String(e) });
  }

  if (clinicalLookup?.hasAnySource) {
    const rec = clinicalLookup.record;
    const adj = applyClinicalModifiers(tcp, ntcp, "HN", true, {
      age: rec.age,
      sex: rec.sex,
      chemo: rec.chemo,
      smoking: rec.smoking,
    });
    rows.push({
      step: "clinical_covariates",
      ok: Number.isFinite(adj.tcp) && Number.isFinite(adj.ntcp),
      detail: `adjusted TCP ${(adj.tcp * 100).toFixed(2)}% · NTCP ${(adj.ntcp * 100).toFixed(2)}%`,
    });
  }

  const overall = rows.every((r) => r.ok) ? "PASS" : "FAIL";
  writeReport(root, rows, overall);
  console.log(`\n=== PTV+OAR+Clinical: ${overall} ===`);
  for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.step}: ${r.detail}`);
  process.exit(overall === "PASS" ? 0 : 1);
}

function writeReport(root: string, rows: { step: string; ok: boolean; detail: string }[], overall: string | null) {
  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const json = {
    generatedAt: new Date().toISOString(),
    patient: PATIENT,
    ptvFile: `${PATIENT}_PTV.txt`,
    oarFile: `${PATIENT}_Parotid.txt`,
    inputRoot: root,
    overall: overall ?? "FAIL",
    rows,
  };
  fs.writeFileSync(path.join(outDir, "PTV_OAR_CLINICAL_TEST.json"), JSON.stringify(json, null, 2));
  const md = [
    "# PTV + OAR + Clinical test",
    "",
    `**Patient:** ${PATIENT}`,
    `**Overall:** ${json.overall}`,
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...rows.map((r) => `| ${r.step} | ${r.ok ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`),
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "PTV_OAR_CLINICAL_TEST.md"), md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
