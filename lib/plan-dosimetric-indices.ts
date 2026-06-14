/**
 * Target dosimetric indices — Lee et al. (InTech 2015) & Patel et al. (RPOR 2020).
 * RTOG CI requires external/BODY dose; never substitute TCI/100.
 */
import type { DVHPoint } from "@/lib/plan-evaluation";
import { arrayMax } from "@/lib/numeric-safe";
import {
  type PlanIndexContext,
  inferTechniqueProfile,
  indexPackClinicalNote,
  stereotacticIndicesApplicable,
} from "@/lib/plan-index-applicability";

export type TargetPlanIndices = {
  prescriptionGy: number;
  techniqueProfile: "conventional" | "hypofractionated" | "sbrt";
  stereotacticIndicesApplicable: boolean;
  indexPackNote: string;
  /** Target Coverage Index — % volume receiving ≥ prescription */
  tciPercent: number;
  /** RTOG CI = V_RI / V_TV (cm³); null when BODY/external DVH unavailable */
  ciRtog: number | null;
  ciRtogNote: string;
  /** Paddick CI — SRS/SRT/SBRT only; null without BODY dose */
  ciPaddick: number | null;
  /** D2/D98 ratio (legacy index; ideal ≈ 1) */
  hiRatio: number;
  /** ICRU-83 HI = (D2 − D98) / D50 (ideal ≈ 0) */
  hiIcru83: number;
  /** Gradient index — SBRT/SRS only; null without BODY dose */
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

export function totalStructureVolume(dvh: DVHPoint[]): number {
  if (dvh.length === 0) return 0;
  const s = sortedCumulative(dvh);
  return arrayMax(s.map((p) => p.volume), 1e-9);
}

/** Interpolated % volume receiving dose >= threshold (cumulative DVH). */
export function volumePercentAtLeast(dvh: DVHPoint[], doseGy: number): number {
  const s = sortedCumulative(dvh);
  const tv = totalStructureVolume(dvh);
  if (tv <= 0) return 0;
  if (doseGy <= s[0].dose) return 100;
  if (doseGy >= s[s.length - 1].dose) return 0;

  for (let i = 0; i < s.length - 1; i++) {
    const lo = s[i];
    const hi = s[i + 1];
    if (doseGy >= lo.dose && doseGy <= hi.dose) {
      const t = hi.dose === lo.dose ? 0 : (doseGy - lo.dose) / (hi.dose - lo.dose);
      const vol = lo.volume + t * (hi.volume - lo.volume);
      return (vol / tv) * 100;
    }
  }
  return 0;
}

export function absoluteVolumeAtLeast(dvh: DVHPoint[], doseGy: number): number {
  return (volumePercentAtLeast(dvh, doseGy) / 100) * totalStructureVolume(dvh);
}

/** Interpolated dose at cumulative volume percentile (Dxx). */
export function dosePercentile(dvh: DVHPoint[], pct: number): number {
  const s = sortedCumulative(dvh);
  const tv = totalStructureVolume(dvh);
  if (tv <= 0) return 0;
  const target = (pct / 100) * tv;

  for (let i = 0; i < s.length; i++) {
    if (s[i].volume <= target + 1e-6) {
      if (i === 0) return s[i].dose;
      const prev = s[i - 1];
      const curr = s[i];
      const span = prev.volume - curr.volume;
      const t = span <= 1e-9 ? 0 : (prev.volume - target) / span;
      return prev.dose + t * (curr.dose - prev.dose);
    }
  }
  return s[s.length - 1]?.dose ?? 0;
}

export function cumulativeDosePercentile(dvh: DVHPoint[], volumePercent: number): number {
  return dosePercentile(dvh, volumePercent);
}

export type TargetIndexOptions = {
  bodyDvh?: DVHPoint[];
  targetVolumeCm3?: number;
};

export function computeTargetPlanIndices(
  dvh: DVHPoint[],
  prescriptionGy: number,
  indexContext?: PlanIndexContext,
  opts?: TargetIndexOptions,
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
  const v100Rx = tciPercent;
  const v95Rx = volumePercentAtLeast(dvh, prescriptionGy * 0.95);

  const tvTarget = opts?.targetVolumeCm3 ?? totalStructureVolume(dvh);
  let ciRtog: number | null = null;
  let ciPaddick: number | null = null;
  let gradientIndex: number | null = null;
  let ciRtogNote =
    "Requires external/BODY dose DVH — not available in this composite export";

  if (opts?.bodyDvh?.length && tvTarget > 0) {
    const vRi = absoluteVolumeAtLeast(opts.bodyDvh, prescriptionGy);
    const vTargetRx = absoluteVolumeAtLeast(dvh, prescriptionGy);
    if (vRi > 0) {
      ciRtog = vRi / tvTarget;
      ciPaddick = (vTargetRx * vTargetRx) / (tvTarget * vRi);
      ciRtogNote = "V_RI/V_TV from BODY + target DVH (RTOG)";
      if (stereotactic) {
        const v50Body = absoluteVolumeAtLeast(opts.bodyDvh, prescriptionGy * 0.5);
        const v100Body = vRi;
        gradientIndex = v100Body > 0 ? v50Body / v100Body : null;
      }
    }
  }

  const hiRatio = d98 > 0 ? d2 / d98 : 0;
  const hiIcru83 = d50 > 0 ? (d2 - d98) / d50 : 0;

  return {
    prescriptionGy,
    techniqueProfile: profile,
    stereotacticIndicesApplicable: stereotactic,
    indexPackNote: indexPackClinicalNote(profile, stereotactic),
    tciPercent,
    ciRtog,
    ciRtogNote,
    ciPaddick,
    hiRatio,
    hiIcru83,
    gradientIndex,
    d98,
    d95,
    d50,
    d2,
    v100Rx,
    v95Rx,
  };
}
