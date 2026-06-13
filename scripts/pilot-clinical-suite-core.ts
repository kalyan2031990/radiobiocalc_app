/**
 * Pilot clinical validation — case discovery, inconsistency analysis, engine runs.
 */
import fs from "fs";
import path from "path";
import { parseEclipseTxt } from "../server/data-handler";
import { loadClinicalBundles } from "../lib/clinical-xlsx-import.node";
import { lookupClinicalRecord } from "../lib/clinical-xlsx-core";
import {
  offlineParseDvh,
  offlineMergeDvhs,
  offlineCalculate,
  offlineEvaluateComposite,
} from "../lib/offline-engine";
import { analyzePlanScope } from "../lib/plan-scope";
import { applyClinicalModifiers } from "../lib/clinical-modifiers";
import { classifyStructure } from "../lib/structure-nomenclature";

export type PilotCase = {
  patientId: string;
  ptvFile: string;
  oarFile: string;
  oarOrgan: string;
  clinicalSource: string;
  clinicalSynthetic: boolean;
  clinicalAdequate: boolean;
  age?: number;
  totalDoseGy: number;
  fractions: number;
  prescribedGyFromHeader?: number;
};

export type InconsistencyItem = {
  id: string;
  severity: "info" | "warn" | "fail";
  message: string;
  detail?: string;
};

export type EngineCaseResult = {
  patientId: string;
  pass: boolean;
  structures: string[];
  therapeuticEligible: boolean;
  tcpPct: number;
  ntcpPct: number;
  twiPct: number;
  tcpOfflinePct: number;
  ntcpOfflinePct: number;
  parserMaxDoseDeltaGy: number;
  clinicalSynthetic: boolean;
  doseUsedGy: number;
  fractionsUsed: number;
  errors: string[];
};

function patientIdFromFile(name: string): string {
  return name.replace(/_PTV\.txt$/i, "").replace(/_Parotid\.txt$/i, "").replace(/\.txt$/i, "").split("_")[0] ?? name;
}

function readPrescribedGy(content: string): number | undefined {
  const m = content.match(/Prescribed dose \[cGy\]:\s*([\d.]+)/i);
  if (!m) return undefined;
  return parseFloat(m[1]!) / 100;
}

export function discoverPilotCases(root: string): PilotCase[] {
  const ptvDir = path.join(root, "PTV_DVH_txt_data_14pt");
  const oarParotid = path.join(root, "OAR_DVH_txt_data", "parotid");
  const clinicalDir = path.join(root, "clinical_input");
  const bundle = loadClinicalBundles(clinicalDir);

  if (!fs.existsSync(ptvDir)) return [];

  const ptvFiles = fs.readdirSync(ptvDir).filter((f) => /_PTV\.txt$/i.test(f));
  const cases: PilotCase[] = [];

  for (const ptvName of ptvFiles.sort()) {
    const patientId = patientIdFromFile(ptvName);
    const oarName = `${patientId}_Parotid.txt`;
    const oarPath = path.join(oarParotid, oarName);
    if (!fs.existsSync(oarPath)) continue;

    const ptvContent = fs.readFileSync(path.join(ptvDir, ptvName), "utf8");
    const prescribed = readPrescribedGy(ptvContent);

    let clinicalSource = "none";
    let clinicalSynthetic = true;
    let clinicalAdequate = false;
    let age: number | undefined;
    let totalDoseGy = prescribed ?? 66;
    let fractions = 33;

    if (bundle) {
      const rec = lookupClinicalRecord(bundle, patientId, "Parotid", false);
      clinicalSource = rec.dataSource;
      clinicalSynthetic = rec.syntheticFlag;
      clinicalAdequate = rec.adequateForCorrelation;
      age = rec.age;
      if (rec.totalDoseGy > 0) totalDoseGy = rec.totalDoseGy;
      if (rec.fractions > 0) fractions = rec.fractions;
    }

    cases.push({
      patientId,
      ptvFile: path.join("PTV_DVH_txt_data_14pt", ptvName),
      oarFile: path.join("OAR_DVH_txt_data", "parotid", oarName),
      oarOrgan: "Parotid",
      clinicalSource,
      clinicalSynthetic,
      clinicalAdequate,
      age,
      totalDoseGy,
      fractions,
      prescribedGyFromHeader: prescribed,
    });
  }

  return cases;
}

export function analyzeInconsistencies(root: string, cases: PilotCase[]): InconsistencyItem[] {
  const items: InconsistencyItem[] = [];
  const ptvDir = path.join(root, "PTV_DVH_txt_data_14pt");
  const oarParotid = path.join(root, "OAR_DVH_txt_data", "parotid");
  const clinicalDir = path.join(root, "clinical_input");
  const bundle = loadClinicalBundles(clinicalDir);

  const ptvIds = new Set(
    fs.existsSync(ptvDir)
      ? fs.readdirSync(ptvDir).filter((f) => /_PTV\.txt$/i.test(f)).map(patientIdFromFile)
      : [],
  );
  const parotidIds = new Set(
    fs.existsSync(oarParotid)
      ? fs
          .readdirSync(oarParotid)
          .filter((f) => /_Parotid\.txt$/i.test(f))
          .map(patientIdFromFile)
      : [],
  );

  const ptvOnly = [...ptvIds].filter((id) => !parotidIds.has(id));
  const parotidOnly = [...parotidIds].filter((id) => !ptvIds.has(id));

  if (ptvOnly.length) {
    items.push({
      id: "ptv_without_parotid",
      severity: "warn",
      message: `${ptvOnly.length} PTV patient(s) have no matching Parotid OAR file`,
      detail: ptvOnly.slice(0, 8).join(", "),
    });
  }

  const parotid2017 = [...parotidIds].filter((id) => id.startsWith("2017")).length;
  const ptv2019 = [...ptvIds].filter((id) => id.startsWith("2019")).length;
  if (parotid2017 > 0 && ptv2019 > 0) {
    items.push({
      id: "cohort_year_split",
      severity: "info",
      message: "OAR Parotid cohort (2017) is larger than PTV pilot set (2019)",
      detail: `${parotid2017} parotid vs ${ptv2019} PTV — pilot pairs use intersecting IDs only`,
    });
  }

  if (parotidOnly.length > 20) {
    items.push({
      id: "oar_without_ptv",
      severity: "info",
      message: `${parotidOnly.length} Parotid files have no PTV in pilot folder`,
      detail: "Expected — full OAR archive exceeds 14-PTV manuscript subset",
    });
  }

  const syntheticCount = cases.filter((c) => c.clinicalSynthetic).length;
  const observedCount = cases.length - syntheticCount;
  items.push({
    id: "clinical_source_mix",
    severity: syntheticCount === cases.length ? "warn" : "info",
    message: `Clinical: ${observedCount} observed + ${syntheticCount} synthetic/imputed`,
    detail: cases
      .map((c) => `${c.patientId}:${c.clinicalSource}${c.clinicalSynthetic ? " (synthetic)" : ""}`)
      .join("; "),
  });

  for (const c of cases) {
    if (
      c.prescribedGyFromHeader != null &&
      Math.abs(c.prescribedGyFromHeader - c.totalDoseGy) > 2
    ) {
      items.push({
        id: `dose_header_vs_clinical_${c.patientId}`,
        severity: "warn",
        message: `${c.patientId}: prescribed ${c.prescribedGyFromHeader} Gy vs clinical ${c.totalDoseGy} Gy`,
        detail: "Use clinical xlsx dose for pilot when observed; header Rx for cross-check",
      });
    }
  }

  if (bundle) {
    const covOff = applyClinicalModifiers(0.5, 0.2, "HN", false, { age: 60 });
    const covOn = applyClinicalModifiers(0.5, 0.2, "HN", true, { age: 60 });
    items.push({
      id: "covariate_toggle_off",
      severity: covOff.tcp === 0.5 && covOff.ntcp === 0.2 ? "info" : "fail",
      message:
        covOff.tcp === 0.5
          ? "Covariate OFF leaves TCP/NTCP unchanged (mobile default)"
          : "Covariate OFF incorrectly changes TCP/NTCP",
      detail: `OFF tcp=${covOff.tcp} ntcp=${covOff.ntcp}; ON tcp=${covOn.tcp}`,
    });
  }

  if (cases.length === 0) {
    items.push({
      id: "no_pilot_pairs",
      severity: "fail",
      message: "No PTV+Parotid pairs found for pilot validation",
    });
  }

  return items;
}

export function runEngineForCase(root: string, pilot: PilotCase): EngineCaseResult {
  const errors: string[] = [];
  const ptvPath = path.join(root, pilot.ptvFile);
  const oarPath = path.join(root, pilot.oarFile);

  try {
    const ptvContent = fs.readFileSync(ptvPath, "utf8");
    const oarContent = fs.readFileSync(oarPath, "utf8");

    const serverPtv = parseEclipseTxt(ptvContent, path.basename(ptvPath));
    const offlinePtv = offlineParseDvh(ptvContent, path.basename(ptvPath));
    const serverKey = Object.keys(serverPtv.dvhByStructure)[0]!;
    const offlineKey = Object.keys(offlinePtv.dvhByStructure)[0]!;
    const serverMax = Math.max(...(serverPtv.dvhByStructure[serverKey] ?? []).map((p) => p.dose), 0);
    const offlineMax = Math.max(...(offlinePtv.dvhByStructure[offlineKey] ?? []).map((p) => p.dose), 0);
    const parserMaxDoseDeltaGy = Math.abs(serverMax - offlineMax);

    const merged = offlineMergeDvhs([
      offlineParseDvh(ptvContent, path.basename(ptvPath)),
      offlineParseDvh(oarContent, path.basename(oarPath)),
    ]);
    const keys = Object.keys(merged.dvhByStructure);
    const scope = analyzePlanScope(merged);

    const composite = offlineEvaluateComposite(merged, {
      totalDose: pilot.totalDoseGy,
      numFractions: pilot.fractions,
      cancerSite: "HN",
      technique: "VMAT",
      fileHint: pilot.patientId,
    });

    const oarKey = keys.find((k) => /parot/i.test(k))!;
    const ptvKey = keys.find((k) => /ptv/i.test(k))!;
    const ntcpOff = offlineCalculate({
      dvh: merged.dvhByStructure[oarKey] ?? [],
      totalDose: pilot.totalDoseGy,
      numFractions: pilot.fractions,
      organ: "Parotid",
      structureType: "oar",
      model: "lkb_loglogit",
    }).ntcp;
    const tcpOff = offlineCalculate({
      dvh: merged.dvhByStructure[ptvKey] ?? [],
      totalDose: pilot.totalDoseGy,
      numFractions: pilot.fractions,
      organ: "PTV",
      structureType: "target",
      model: "lkb_loglogit",
    }).tcp;

    const role = classifyStructure(oarKey, path.basename(oarPath)).role;
    if (role !== "oar") errors.push(`OAR misclassified as ${role}`);

    const pass =
      scope.therapeuticWindowEligible &&
      Number.isFinite(composite.therapeutic.tcp) &&
      Number.isFinite(composite.therapeutic.ntcpComposite) &&
      parserMaxDoseDeltaGy < 0.5;

    return {
      patientId: pilot.patientId,
      pass,
      structures: keys,
      therapeuticEligible: scope.therapeuticWindowEligible,
      tcpPct: composite.therapeutic.tcp * 100,
      ntcpPct: composite.therapeutic.ntcpComposite * 100,
      twiPct: composite.therapeutic.twi * 100,
      tcpOfflinePct: tcpOff * 100,
      ntcpOfflinePct: ntcpOff * 100,
      parserMaxDoseDeltaGy,
      clinicalSynthetic: pilot.clinicalSynthetic,
      doseUsedGy: pilot.totalDoseGy,
      fractionsUsed: pilot.fractions,
      errors,
    };
  } catch (e) {
    return {
      patientId: pilot.patientId,
      pass: false,
      structures: [],
      therapeuticEligible: false,
      tcpPct: 0,
      ntcpPct: 0,
      twiPct: 0,
      tcpOfflinePct: 0,
      ntcpOfflinePct: 0,
      parserMaxDoseDeltaGy: 0,
      clinicalSynthetic: pilot.clinicalSynthetic,
      doseUsedGy: pilot.totalDoseGy,
      fractionsUsed: pilot.fractions,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}
