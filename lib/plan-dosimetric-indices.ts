/**

 * Target dosimetric indices — Lee et al. (InTech 2015) & Patel et al. (RPOR 2020).

 * Conventional: TCI, RTOG-style CI, ICRU HI.

 * SRS/SRT/SBRT only: Paddick CI + gradient index (Patel 2020; RTOG 0915).

 */



import type { DVHPoint } from "@/lib/plan-evaluation";
import { arrayMax } from "@/lib/numeric-safe";

import {

  type PlanIndexContext,

  inferTechniqueProfile,

  indexPackClinicalNote,

  indexPackLabel,

  stereotacticIndicesApplicable,

} from "@/lib/plan-index-applicability";



export type TargetPlanIndices = {

  prescriptionGy: number;

  techniqueProfile: "conventional" | "hypofractionated" | "sbrt";

  stereotacticIndicesApplicable: boolean;

  indexPackNote: string;

  /** Target Coverage Index — % volume receiving ≥ prescription (Lee TCI / RTOG) */

  tciPercent: number;

  /** RTOG CI ≈ V_RI/V_TV from target DVH (V100% / 100%) */

  ciRtog: number;

  /** Paddick CI — only for SRS/SRT/SBRT; null when not applicable */

  ciPaddick: number | null;

  /** ICRU homogeneity HI = D2% / D98% */

  hiIcu: number;

  /** Modified HI = (D2 − D98) / D50 */

  hiModified: number;

  /** Gradient index GI = V50%_iso / V100%_iso — SBRT/SRS only */

  gradientIndex: number | null;

  d98: number;

  d95: number;

  d50: number;

  d2: number;

  v100Rx: number;

  v95Rx: number;

};



function sortedCumulative(dvh: DVHPoint[]): DVHPoint[] {

  return [...dvh].sort((a, b) => a.dose - b.dose);

}



function totalVolume(dvh: DVHPoint[]): number {

  if (dvh.length === 0) return 0;

  const s = sortedCumulative(dvh);

  return arrayMax(s.map((p) => p.volume), 1e-9);

}



/** % volume receiving dose >= threshold (cumulative DVH). */

export function volumePercentAtLeast(

  dvh: DVHPoint[],

  doseGy: number,

): number {

  const s = sortedCumulative(dvh);

  const tv = totalVolume(dvh);

  for (let i = s.length - 1; i >= 0; i--) {

    if (s[i].dose <= doseGy) {

      return (s[i].volume / tv) * 100;

    }

  }

  return 0;

}



function dosePercentile(dvh: DVHPoint[], pct: number): number {

  const s = sortedCumulative(dvh);

  const tv = totalVolume(dvh);

  const target = (pct / 100) * tv;

  for (const p of s) {

    if (p.volume <= target + 1e-6) return p.dose;

  }

  return s[s.length - 1]?.dose ?? 0;

}



/**

 * Compute target plan indices vs prescription dose (Gy).

 * Index pack follows fractionation (Lee 2015; Patel 2020).

 */

export function computeTargetPlanIndices(

  dvh: DVHPoint[],

  prescriptionGy: number,

  indexContext?: PlanIndexContext,

): TargetPlanIndices {

  const ctx: PlanIndexContext = indexContext ?? {

    totalDoseGy: prescriptionGy,

    numFractions: 35,

  };

  const profile = inferTechniqueProfile(ctx);

  const stereotactic = stereotacticIndicesApplicable(profile, ctx.technique);



  const d98 = dosePercentile(dvh, 98);

  const d95 = dosePercentile(dvh, 95);

  const d50 = dosePercentile(dvh, 50);

  const d2 = dosePercentile(dvh, 2);



  const tciPercent = volumePercentAtLeast(dvh, prescriptionGy);

  const v100Rx = volumePercentAtLeast(dvh, prescriptionGy);

  const v95Rx = volumePercentAtLeast(dvh, prescriptionGy * 0.95);

  const v50Iso = volumePercentAtLeast(dvh, prescriptionGy * 0.5);



  const tvNorm = 100;

  const tvRi = Math.max(v100Rx, 1e-6);

  const ciRtog = tvRi / tvNorm;



  let ciPaddick: number | null = null;

  let gradientIndex: number | null = null;

  if (stereotactic) {

    const tvRiVol = (tciPercent / 100) * tvNorm;

    const vriApprox = tvRi;

    ciPaddick =

      vriApprox > 0 ? (tvRiVol * tvRiVol) / (tvNorm * vriApprox) : null;

    gradientIndex = v100Rx > 0 ? v50Iso / v100Rx : null;

  }



  const hiIcu = d98 > 0 ? d2 / d98 : 0;

  const hiModified = d50 > 0 ? (d2 - d98) / d50 : 0;



  return {

    prescriptionGy,

    techniqueProfile: profile,

    stereotacticIndicesApplicable: stereotactic,

    indexPackNote: indexPackClinicalNote(profile, stereotactic),

    tciPercent,

    ciRtog,

    ciPaddick,

    hiIcu,

    hiModified,

    gradientIndex,

    d98,

    d95,

    d50,

    d2,

    v100Rx,

    v95Rx,

  };

}


