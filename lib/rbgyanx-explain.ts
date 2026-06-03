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
      `RTOG-style CI ${idx.ciRtog.toFixed(3)}`,
      `HI (D2/D98) ${idx.hiIcu.toFixed(3)}`,
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
