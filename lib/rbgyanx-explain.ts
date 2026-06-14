/**
 * rbGyanX "X" — explainable, literature-backed plan narrative (mobile, single patient/plan).
 * Not PINN/ML: rule-based attribution for TCP, NTCP, therapeutic window, and index pack.
 */

import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";
import {
  indexPackClinicalNote,
  indexPackLabel,
  inferTechniqueProfile,
  stereotacticIndicesApplicable,
} from "@/lib/plan-index-applicability";

export type ExplanationBullet = {
  title: string;
  detail: string;
  citation?: string;
};

export type PlanExplanation = {
  headline: string;
  techniqueProfile: string;
  indexPackNote: string;
  bullets: ExplanationBullet[];
  limitations: string[];
  /** Why "X" on mobile — transparency without cohort ML */
  rbXScope: string;
};

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export type CompositeEvalCore = Omit<CompositePlanEvaluation, "planExplanation">;

export type SingleStructureExplainInput = {
  structureType: "target" | "oar";
  organ: string;
  model: string;
  structureName: string;
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
  totalDose: number;
  numFractions: number;
  technique?: string;
  bed: number;
  eqd2: number;
};

/** rb X narrative for single-structure TCP/NTCP (calculation results screen). */
export function buildSingleStructureExplanation(
  input: SingleStructureExplainInput,
): PlanExplanation {
  const ctx = {
    totalDoseGy: input.totalDose,
    numFractions: input.numFractions,
    technique: input.technique,
  };
  const profile = inferTechniqueProfile(ctx);
  const stereotactic = stereotacticIndicesApplicable(profile, input.technique);
  const bullets: ExplanationBullet[] = [];
  const dm = input.doseMetrics;
  const dosePerFx = input.totalDose / Math.max(input.numFractions, 1);

  if (input.structureType === "target" && input.tcp != null) {
    bullets.push({
      title: "TCP (target control)",
      detail: `Model ${input.model} on ${input.structureName} (${input.organ}): TCP ${pct(input.tcp)} at ${input.totalDose.toFixed(1)} Gy / ${input.numFractions} fx (${dosePerFx.toFixed(2)} Gy/fx). D95 ${(dm.d95 ?? 0).toFixed(1)} Gy, D98 ${(dm.d98 ?? 0).toFixed(1)} Gy, mean ${dm.meanDose.toFixed(1)} Gy, gEUD ${dm.gEUD.toFixed(1)} Gy.`,
      citation: "Zaider–Minerbo / LKB TCP — QUANTEC/RTOG literature parameters",
    });
  }

  if (input.structureType === "oar" && input.ntcp != null) {
    bullets.push({
      title: "NTCP (normal tissue)",
      detail: `Model ${input.model} on ${input.structureName} (${input.organ}): NTCP ${pct(input.ntcp)}. Mean ${dm.meanDose.toFixed(1)} Gy, max ${dm.maxDose.toFixed(1)} Gy, gEUD ${dm.gEUD.toFixed(1)} Gy.`,
      citation: "LKB / Poisson — QUANTEC literature parameters",
    });
  }

  bullets.push({
    title: "Fractionation (LQ)",
    detail: `BED ${input.bed.toFixed(1)} Gy, EQD2 ${input.eqd2.toFixed(1)} Gy for α/β from literature preset.`,
    citation: "Barendsen LQ; site organ α/β from parameter tables",
  });

  bullets.push({
    title: `Technique profile (${indexPackLabel(profile)})`,
    detail: indexPackClinicalNote(profile, stereotactic),
    citation: stereotactic
      ? "Patel et al. RPOR 2020 — SRS/SRT/SBRT indices"
      : "Lee et al. InTech 2015 — conventional 2 Gy/fx indices",
  });

  if (input.structureType === "target") {
    bullets.push({
      title: "Therapeutic window note",
      detail:
        "Composite TCP vs NTCP trade-off (UTCP, P+, TWI) requires target + OAR in one DVH import. Import PTV and OAR together, then open Therapeutic Window from results.",
      citation: "Lee et al. 2015; Brahme P+; Ågren UTCP",
    });
  }

  return {
    headline: "rb X — explainable structure summary",
    techniqueProfile: indexPackLabel(profile),
    indexPackNote: indexPackClinicalNote(profile, stereotactic),
    bullets,
    limitations: [
      "Single structure view — not a full composite plan evaluation.",
      "TCP/NTCP use literature parameters; clinical covariates are documentation-only unless a future modifier layer is enabled.",
      "Target TCP above 95% is capped for display (Poisson-LQ DVH model).",
      "Rule-based XAI (citation-linked narrative) — not PINN/ML attribution on mobile.",
    ],
    rbXScope:
      "The X in rbGyanX means transparent, citation-linked reasoning over your DVH and radiobiology results. This is explainable AI (XAI) without black-box ML on device.",
  };
}

export function buildPlanExplanation(
  evaluation: CompositeEvalCore,
  technique?: string,
): PlanExplanation {
  const ctx = {
    totalDoseGy: evaluation.totalDose,
    numFractions: evaluation.numFractions,
    technique,
  };
  const profile = inferTechniqueProfile(ctx);
  const stereotactic = stereotacticIndicesApplicable(profile, technique);
  const tw = evaluation.therapeutic;
  const idx = evaluation.targetIndices;
  const bullets: ExplanationBullet[] = [];

  bullets.push({
    title: "Therapeutic window",
    detail: `TCP ${pct(tw.tcp)} on ${tw.tcpStructure}; composite OAR NTCP ${pct(tw.ntcpComposite)}; UTCP (CFTC) ${pct(tw.utcp)}; P+ ${pct(tw.pPlus)}; TWI ${pct(tw.twi)} (${tw.twiInterpretation}).`,
    citation: "Lee et al. 2015; Brahme P+; Ågren UTCP; rbGyanX TWI",
  });

  const oarDrivers = [...evaluation.structureResults]
    .filter((s) => s.structureType === "oar" && s.ntcp != null && s.ntcp > 0)
    .sort((a, b) => (b.ntcp ?? 0) - (a.ntcp ?? 0))
    .slice(0, 3);

  if (oarDrivers.length > 0) {
    const top = oarDrivers[0]!;
    bullets.push({
      title: "NTCP drivers",
      detail:
        `Highest NTCP: ${top.structureName} ${pct(top.ntcp!)}` +
        (top.literatureOrgan ? ` (${top.literatureOrgan}, gEUD ${top.doseMetrics.gEUD.toFixed(1)} Gy)` : "") +
        (oarDrivers.length > 1
          ? `; also ${oarDrivers
              .slice(1)
              .map((o) => `${o.structureName} ${pct(o.ntcp!)}`)
              .join(", ")}.`
          : "."),
      citation: "LKB / QUANTEC literature parameters",
    });
  }

  const targetRow = evaluation.structureResults.find(
    (s) => s.structureName === evaluation.primaryTarget && s.tcp != null,
  );
  if (targetRow?.tcp != null) {
    const dm = targetRow.doseMetrics;
    bullets.push({
      title: "TCP (target)",
      detail: `Model ${targetRow.model} on ${evaluation.primaryTarget}: D95 ${(dm.d95 ?? 0).toFixed(1)} Gy, D98 ${(dm.d98 ?? 0).toFixed(1)} Gy, mean ${dm.meanDose.toFixed(1)} Gy, gEUD ${dm.gEUD.toFixed(1)} Gy.`,
      citation: "Zaider–Minerbo / LKB TCP (site parameters)",
    });
  }

  if (idx) {
    const parts = [
      `TCI ${idx.tciPercent.toFixed(1)}%`,
      idx.ciRtog != null ? `RTOG CI ${idx.ciRtog.toFixed(3)}` : "RTOG CI N/A (no BODY DVH)",
      `HI (ICRU-83) ${idx.hiIcru83.toFixed(3)}`,
      `HI ratio ${idx.hiRatio.toFixed(3)}`,
    ];
    if (stereotactic && idx.ciPaddick != null) {
      parts.push(`Paddick CI ${idx.ciPaddick.toFixed(3)}`);
    }
    if (stereotactic && idx.gradientIndex != null) {
      parts.push(`GI ${idx.gradientIndex.toFixed(3)}`);
    }
    bullets.push({
      title: `Dosimetric indices (${indexPackLabel(profile)})`,
      detail: parts.join(" · "),
      citation: stereotactic
        ? "Patel et al. RPOR 2020; RTOG 0915 (SBRT)"
        : "Lee et al. InTech 2015; ICRU 83",
    });
  }

  const limitations = [
    "Single plan, single patient — no cohort training on device.",
    "TCP/NTCP use literature parameters; clinical factors (chemo, comorbidity) are not modeled.",
    "HN composite TCP uses Poisson-LQ (DVH); values above 95% are capped for display.",
    "Conformity indices from target DVH approximate RTOG/Paddick when full isodose volumes are unavailable.",
  ];

  return {
    headline: "rb X — explainable plan summary",
    techniqueProfile: indexPackLabel(profile),
    indexPackNote: indexPackClinicalNote(profile, stereotactic),
    bullets,
    limitations,
    rbXScope:
      "The X in rbGyanX on mobile means transparent, citation-linked reasoning over your DVH and radiobiology results for this plan. Full cohort / DICOM pipeline with XAI: use desktop rbGyanX.",
  };
}
