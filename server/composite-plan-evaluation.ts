/**
 * Composite plan evaluation — TCP on target(s), NTCP on OARs, plan indices, therapeutic window.
 * Lee et al. 2015; Patel et al. 2020; rbGyanX utcp.py / code7 integration.
 */

import type { DVHData } from "./data-handler";
import { inferStructureRole } from "./structure-role";
import {
  performCalculation,
  type CalculationRequest,
  type DVHPoint,
} from "./radiobiology";
import { getOrganParameters } from "./parameters";
import { computeTargetPlanIndices, type TargetPlanIndices } from "../lib/plan-dosimetric-indices";
import { buildPlanExplanation, type PlanExplanation } from "../lib/rbgyanx-explain";
import {
  computeTherapeuticWindow,
  riskWeightForOrgan,
  type TherapeuticWindowResult,
  type OarNtcpEntry,
} from "../lib/therapeutic-window";
import { resolveCancerSite } from "../lib/infer-cancer-site";

export type StructureEvalResult = {
  structureName: string;
  structureType: "target" | "oar";
  literatureOrgan: string | null;
  model: string;
  tcp?: number;
  ntcp?: number;
  doseMetrics: {
    meanDose: number;
    maxDose: number;
    gEUD: number;
    d95?: number;
    d98?: number;
    d2?: number;
  };
};

export type CompositePlanEvaluation = {
  prescriptionGy: number;
  totalDose: number;
  numFractions: number;
  cancerSite: string;
  targetIndices: TargetPlanIndices | null;
  primaryTarget: string | null;
  structureResults: StructureEvalResult[];
  therapeutic: TherapeuticWindowResult;
  /** rb X — rule-based explainability (no on-device PINN) */
  planExplanation: PlanExplanation;
};

function mapLiteratureOrgan(rawName: string, fileHint: string): string | null {
  const s = rawName.toLowerCase();
  if (/\bprv\b/.test(s)) return null;
  if (/^combo$/i.test(s.trim()) || /\bcombo\b/.test(s)) return "Parotid";
  if (/ptv|gtv|ctv|tumor|targ/.test(s)) return "PTV";
  if (/parot|prtd|prtoid/.test(s)) return "Parotid";
  if (/larynx|laryn/.test(s)) return "Larynx";
  if (/cord|spinal/.test(s)) return "Spinal Cord";
  if (/brainstem|brain\s*stem/.test(s)) return "Brainstem";
  if (/optic/.test(s)) return "Optic Nerve";
  if (/\blung\b/.test(s)) return "Lung";
  if (/\bheart\b/.test(s)) return "Heart";
  if (/esoph/.test(s)) return "Esophagus";
  if (/rectum/.test(s)) return "Rectum";
  if (/bladder/.test(s)) return "Bladder";
  if (/bowel|intestin|bag|sigmoid/.test(s)) return "Bowel";
  if (/mandible|jaw/.test(s)) return "Mandible";
  if (/constrict|pcm|pharyn/.test(s)) return "Pharyngeal Constrictor";
  if (/submand|smg/.test(s)) return "Submandibular";
  const h = fileHint.toLowerCase();
  if (h.includes("parotid")) return "Parotid";
  if (h.includes("ptv") || h.includes("gtv")) return "PTV";
  return null;
}

function pickPrimaryTarget(names: string[]): string | null {
  const scored = names.map((n) => {
    const s = n.toLowerCase();
    let score = 0;
    if (/ptv/.test(s)) score += 10;
    if (/gtv/.test(s)) score += 8;
    if (/ctv/.test(s)) score += 6;
    if (/tumor|target/.test(s)) score += 4;
    return { n, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.n ?? names[0] ?? null;
}

export function evaluateCompositePlan(
  data: DVHData,
  options: {
    totalDose: number;
    numFractions: number;
    cancerSite?: string;
    technique?: string;
    prescriptionGy?: number;
    fileHint?: string;
    tcpModel?: CalculationRequest["model"];
    ntcpModel?: CalculationRequest["model"];
  },
): CompositePlanEvaluation {
  const structureNames = data.structures.map((s) => s.name);
  const { siteId: resolvedSite } = resolveCancerSite(
    options.cancerSite,
    structureNames,
    options.fileHint ?? data.patientInfo?.patientName ?? "",
  );
  const {
    totalDose,
    numFractions,
    cancerSite = resolvedSite,
    technique = "IMRT",
    prescriptionGy = totalDose,
    fileHint = data.patientInfo?.patientName ?? "",
    tcpModel = "lkb_loglogit",
    ntcpModel = "lkb_loglogit",
  } = options;

  const structureResults: StructureEvalResult[] = [];
  const targetNames: string[] = [];
  const oarEntries: OarNtcpEntry[] = [];

  let tcp = 0;
  let tcpModelUsed: string = tcpModel;
  let tcpStructure = "";

  for (const struct of data.structures) {
    const name = struct.name;
    const dvh = data.dvhByStructure[name];
    if (!dvh?.length) continue;

    const role =
      struct.type ?? inferStructureRole(name, fileHint);
    const lit = mapLiteratureOrgan(name, fileHint);
    const organ =
      lit ?? (role === "target" ? "PTV" : name);

    const model = role === "target" ? tcpModel : ntcpModel;
    const defaultParams = getOrganParameters(organ, model);
    if (!defaultParams) continue;

    const calc = performCalculation(
      {
        dvh,
        totalDose,
        numFractions,
        organ,
        structureType: role,
        model,
        cancerSite,
        technique,
        targetType: "PTV",
      } as CalculationRequest,
      defaultParams,
    );

    structureResults.push({
      structureName: name,
      structureType: role,
      literatureOrgan: lit,
      model: calc.model,
      tcp: calc.tcp,
      ntcp: calc.ntcp,
      doseMetrics: {
        meanDose: calc.doseMetrics.meanDose,
        maxDose: calc.doseMetrics.maxDose,
        gEUD: calc.doseMetrics.gEUD,
        d95: calc.doseMetrics.d95,
        d98: calc.doseMetrics.d98,
        d2: calc.doseMetrics.d2,
      },
    });

    if (role === "target") {
      targetNames.push(name);
    } else if (calc.ntcp != null && lit) {
      oarEntries.push({
        structureName: name,
        literatureOrgan: lit,
        ntcp: calc.ntcp,
        riskWeight: riskWeightForOrgan(lit),
      });
    }
  }

  const primaryTarget = pickPrimaryTarget(targetNames);
  let targetIndices: TargetPlanIndices | null = null;

  if (primaryTarget && data.dvhByStructure[primaryTarget]) {
    targetIndices = computeTargetPlanIndices(
      data.dvhByStructure[primaryTarget] as DVHPoint[],
      prescriptionGy,
      { totalDoseGy: totalDose, numFractions, technique },
    );
    const tr = structureResults.find((s) => s.structureName === primaryTarget);
    if (tr?.tcp != null) {
      tcp = tr.tcp;
      tcpModelUsed = tr.model;
      tcpStructure = primaryTarget;
    }
  }

  if (!tcpStructure && structureResults.length > 0) {
    const t0 = structureResults.find((s) => s.tcp != null);
    if (t0?.tcp != null) {
      tcp = t0.tcp;
      tcpStructure = t0.structureName;
      tcpModelUsed = t0.model;
    }
  }

  const therapeutic = computeTherapeuticWindow(
    tcp,
    tcpModelUsed,
    tcpStructure || primaryTarget || "Target",
    oarEntries,
  );

  const base = {
    prescriptionGy,
    totalDose,
    numFractions,
    cancerSite,
    targetIndices,
    primaryTarget,
    structureResults,
    therapeutic,
  };

  return {
    ...base,
    planExplanation: buildPlanExplanation(base, technique),
  };
}
