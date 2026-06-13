/**
 * rbGyaX_mobile_app_input validation — composite DVH + clinical xlsx.
 */
import fs from "fs";
import path from "path";
import { parseCompositeDvh } from "../server/data-handler";
import { loadClinicalBundles } from "../lib/clinical-xlsx-import.node";
import { lookupClinicalRecord } from "../lib/clinical-xlsx-core";
import {
  offlineParseDvh,
  offlineCalculate,
  offlineEvaluateComposite,
} from "../lib/offline-engine";
import { parseDvhOnDevice } from "../lib/parse-dvh-mobile";
import { analyzePlanScope } from "../lib/plan-scope";
import { classifyStructure } from "../lib/structure-nomenclature";
import { computeTargetPlanIndices } from "../lib/plan-dosimetric-indices";
import { calculateBED } from "../server/radiobiology";
import { getOrganParameters, type RadiobiologyModelId } from "../server/parameters";

export type MobileAppCase = {
  patientId: string;
  fileName: string;
  filePath: string;
  structureCount: number;
  targetCount: number;
  oarCount: number;
  prescribedGy?: number;
  prescribedFx?: number;
  totalDoseGy: number;
  fractions: number;
  clinicalTcpSource: string;
  clinicalTcpSynthetic: boolean;
  clinicalOarRows: number;
};

export type ModelProbe = {
  structure: string;
  organ: string;
  role: "target" | "oar";
  model: RadiobiologyModelId;
  value: number;
  kind: "tcp" | "ntcp";
};

export type EngineCaseResult = {
  patientId: string;
  pass: boolean;
  structures: string[];
  therapeuticEligible: boolean;
  tcpPct: number;
  ntcpPct: number;
  twiPct: number;
  parserMaxDoseDeltaGy: number;
  mobileNativeStructures: number;
  tciPercent?: number;
  d95Gy?: number;
  bedGy2?: number;
  doseUsedGy: number;
  fractionsUsed: number;
  modelProbes: ModelProbe[];
  errors: string[];
};

const MODELS: RadiobiologyModelId[] = [
  "lkb_loglogit",
  "lkb_probit",
  "poisson",
  "zaider_minerbo",
  "poisson_dvh",
];

function readPrescribedGy(content: string): number | undefined {
  const m = content.match(/Prescribed\s*dose\s*:\s*([\d.]+)\s*Gy/i);
  if (m) return parseFloat(m[1]);
  const cgy = content.match(/Prescribed dose \[cGy\]:\s*([\d.]+)/i);
  if (cgy) return parseFloat(cgy[1]) / 100;
  return undefined;
}

function readPrescribedFx(content: string): number | undefined {
  const m = content.match(/Prescribed\s*fx\s*:\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function inferDoseGyFromStructures(names: string[]): number | undefined {
  for (const name of names) {
    const m =
      name.match(/ptv\s*(\d+(?:\.\d+)?)\s*gy/i) ||
      name.match(/ptv\s*(\d+(?:\.\d+)?)/i) ||
      name.match(/(\d+(?:\.\d+)?)\s*gy/i);
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 40 && v <= 80) return v;
    }
  }
  return undefined;
}

function snapPrescriptionGy(maxDose: number): number {
  const presets = [46, 50, 54, 60, 66, 70, 72];
  let best = presets[0]!;
  for (const p of presets) {
    if (Math.abs(p - maxDose * 0.95) < Math.abs(best - maxDose * 0.95)) best = p;
  }
  return best;
}

function inferDoseGyFromTargetDvh(
  parsed: ReturnType<typeof offlineParseDvh>,
): number | undefined {
  const target =
    parsed.structures.find((s) => s.type === "target" && /ptv/i.test(s.name)) ??
    parsed.structures.find((s) => s.type === "target");
  if (!target) return undefined;
  const max = maxDose(parsed.dvhByStructure[target.name] ?? []);
  return max >= 40 ? snapPrescriptionGy(max) : undefined;
}

function patientIdFromCompositeName(name: string): string {
  const m = name.match(/^(RBX-(?:TXT|DCM)-\d+)/i);
  return m ? m[1].toUpperCase() : name.replace(/_composite_DVH\.txt$/i, "");
}

export function getMobileAppInputRoot(): string {
  const env = process.env.INPUT_FOLDERS?.trim();
  if (env && fs.existsSync(env)) {
    if (/rbGyaX_mobile_app_input/i.test(env)) return env;
    const nested = path.join(env, "rbGyaX_mobile_app_input");
    if (fs.existsSync(nested)) return nested;
    return env;
  }
  const fallback =
    "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\radbiocalc_input\\rbGyaX_mobile_app_input";
  if (fs.existsSync(fallback)) return fallback;
  throw new Error("Set INPUT_FOLDERS to rbGyaX_mobile_app_input directory");
}

export function discoverMobileAppCases(root: string): MobileAppCase[] {
  const bundle = loadClinicalBundles(root);
  const files = fs
    .readdirSync(root)
    .filter((f) => /_composite_DVH\.txt$/i.test(f))
    .sort();

  return files.map((fileName) => {
    const filePath = path.join(root, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    const patientId = patientIdFromCompositeName(fileName);
    const prescribedGy = readPrescribedGy(content);
    const prescribedFx = readPrescribedFx(content);

    let totalDoseGy = prescribedGy ?? 66;
    let fractions = prescribedFx ?? 33;
    let clinicalTcpSource = "none";
    let clinicalTcpSynthetic = true;
    let clinicalOarRows = 0;

    const parsed = offlineParseDvh(content, fileName);
    const targets = parsed.structures.filter((s) => s.type === "target").length;
    const oars = parsed.structures.filter((s) => s.type === "oar").length;
    const inferredGy =
      inferDoseGyFromStructures(parsed.structures.map((s) => s.name)) ??
      inferDoseGyFromTargetDvh(parsed);

    if (bundle) {
      const tcpRec = lookupClinicalRecord(bundle, patientId, "PTV", true);
      clinicalTcpSource = tcpRec.dataSource;
      clinicalTcpSynthetic = tcpRec.syntheticFlag;
      clinicalOarRows = bundle.treatmentParams.filter((r) => r.patientId === patientId).length;
      const hasTcpRow = bundle.ptvSynthetic.some((r) => r.patientId === patientId);
      if (hasTcpRow && tcpRec.totalDoseGy > 0) totalDoseGy = tcpRec.totalDoseGy;
      if (hasTcpRow && tcpRec.fractions > 0) fractions = tcpRec.fractions;
    }

    if (prescribedGy != null) totalDoseGy = prescribedGy;
    else if (inferredGy != null) totalDoseGy = inferredGy;

    return {
      patientId,
      fileName,
      filePath,
      structureCount: parsed.structures.length,
      targetCount: targets,
      oarCount: oars,
      prescribedGy,
      prescribedFx,
      totalDoseGy,
      fractions,
      clinicalTcpSource,
      clinicalTcpSynthetic,
      clinicalOarRows,
    };
  });
}

function maxDose(dvh: { dose: number }[]): number {
  let m = 0;
  for (const p of dvh) if (p.dose > m) m = p.dose;
  return m;
}

function probeModels(
  bundle: ReturnType<typeof offlineParseDvh>,
  doseGy: number,
  fractions: number,
): ModelProbe[] {
  const probes: ModelProbe[] = [];
  for (const s of bundle.structures) {
    const dvh = bundle.dvhByStructure[s.name] ?? [];
    if (!dvh.length) continue;
    const cls = classifyStructure(s.name, "");
    const organ = cls.literatureOrgan ?? cls.normalizedName;
    const role = s.type;
    for (const model of MODELS) {
      if (!getOrganParameters(organ, model)) continue;
      const calc = offlineCalculate({
        dvh,
        totalDose: doseGy,
        numFractions: fractions,
        organ,
        structureType: role,
        model,
      });
      const val = role === "target" ? calc.tcp : calc.ntcp;
      if (val == null || !Number.isFinite(val)) continue;
      probes.push({
        structure: s.name,
        organ,
        role,
        model,
        value: val,
        kind: role === "target" ? "tcp" : "ntcp",
      });
    }
  }
  return probes;
}

export function runEngineForMobileAppCase(
  root: string,
  meta: MobileAppCase,
): EngineCaseResult {
  const errors: string[] = [];
  try {
    const content = fs.readFileSync(meta.filePath, "utf8");
    const server = parseCompositeDvh(content, meta.fileName);
    const offline = offlineParseDvh(content, meta.fileName);
    const native = parseDvhOnDevice(content, meta.fileName);

    let parserMaxDoseDeltaGy = 0;
    for (const name of Object.keys(server.dvhByStructure)) {
      const sMax = maxDose(server.dvhByStructure[name] ?? []);
      const oMax = maxDose(offline.dvhByStructure[name] ?? []);
      parserMaxDoseDeltaGy = Math.max(parserMaxDoseDeltaGy, Math.abs(sMax - oMax));
    }

    if (native.structures.length !== offline.structures.length) {
      errors.push(
        `Mobile native structure count ${native.structures.length} != offline ${offline.structures.length}`,
      );
    }

    const scope = analyzePlanScope(offline);
    const composite = offlineEvaluateComposite(offline, {
      totalDose: meta.totalDoseGy,
      numFractions: meta.fractions,
      cancerSite: "HN",
      technique: "IMRT",
      prescriptionGy: meta.totalDoseGy,
      fileHint: meta.patientId,
    });

    const ptvKey =
      offline.structures.find((s) => s.type === "target")?.name ??
      Object.keys(offline.dvhByStructure).find((k) => /ptv|ctv|gtv/i.test(k));
    let tciPercent: number | undefined;
    let d95Gy: number | undefined;
    let bedGy2: number | undefined;

    if (ptvKey) {
      const dvh = offline.dvhByStructure[ptvKey] ?? [];
      const idx = computeTargetPlanIndices(dvh, meta.totalDoseGy, {
        totalDoseGy: meta.totalDoseGy,
        numFractions: meta.fractions,
        technique: "IMRT",
        cancerSite: "HN",
      });
      tciPercent = idx.tciPercent;
      d95Gy = idx.d95;
      bedGy2 = calculateBED(meta.totalDoseGy, meta.fractions, 10);
    }

    const modelProbes = probeModels(offline, meta.totalDoseGy, meta.fractions);

    if (meta.structureCount < 2) errors.push("Fewer than 2 structures");
    if (meta.targetCount < 1) errors.push("No target structure");
    if (meta.oarCount < 1) errors.push("No OAR structure");
    if (parserMaxDoseDeltaGy >= 0.5) {
      errors.push(`Parser max-dose delta ${parserMaxDoseDeltaGy.toFixed(3)} Gy`);
    }

    const tcpOk =
      Number.isFinite(composite.therapeutic.tcp) &&
      composite.therapeutic.tcp >= 0 &&
      composite.therapeutic.tcp <= 1;
    const ntcpOk =
      Number.isFinite(composite.therapeutic.ntcpComposite) &&
      composite.therapeutic.ntcpComposite >= 0 &&
      composite.therapeutic.ntcpComposite <= 1;
    if (!tcpOk) errors.push("TCP out of range");
    if (!ntcpOk) errors.push("NTCP out of range");
    if (tciPercent != null && (tciPercent < 0 || tciPercent > 100)) {
      errors.push(`TCI out of range: ${tciPercent}`);
    }
    if (modelProbes.length < 2) errors.push("Insufficient model probes");

    const lkbPair = modelProbes.filter(
      (p) => p.model === "lkb_loglogit" || p.model === "lkb_probit",
    );
    if (lkbPair.length < 2) errors.push("LKB log-logistic and probit not both available");

    const pass =
      errors.length === 0 &&
      scope.therapeuticWindowEligible &&
      tcpOk &&
      ntcpOk;

    return {
      patientId: meta.patientId,
      pass,
      structures: Object.keys(offline.dvhByStructure),
      therapeuticEligible: scope.therapeuticWindowEligible,
      tcpPct: composite.therapeutic.tcp * 100,
      ntcpPct: composite.therapeutic.ntcpComposite * 100,
      twiPct: composite.therapeutic.twi * 100,
      parserMaxDoseDeltaGy,
      mobileNativeStructures: native.structures.length,
      tciPercent,
      d95Gy,
      bedGy2,
      doseUsedGy: meta.totalDoseGy,
      fractionsUsed: meta.fractions,
      modelProbes,
      errors,
    };
  } catch (e) {
    return {
      patientId: meta.patientId,
      pass: false,
      structures: [],
      therapeuticEligible: false,
      tcpPct: 0,
      ntcpPct: 0,
      twiPct: 0,
      parserMaxDoseDeltaGy: 0,
      mobileNativeStructures: 0,
      doseUsedGy: meta.totalDoseGy,
      fractionsUsed: meta.fractions,
      modelProbes: [],
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}

export function runAllMobileAppCases(root: string): {
  cases: MobileAppCase[];
  results: EngineCaseResult[];
} {
  const cases = discoverMobileAppCases(root);
  const results = cases.map((c) => runEngineForMobileAppCase(root, c));
  return { cases, results };
}
