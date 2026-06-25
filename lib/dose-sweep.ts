/**
 * Dose–response curves, CI sensitivity bands, therapeutic-window dose sweep (F3).
 */

import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import { offlineEvaluateComposite } from "@/lib/offline-engine";
import type { ParameterCi95 } from "@/lib/parameter-library";
import { getLibraryEntryForOrganModel } from "@/lib/parameter-library";
import type { RadiobiologyModelId } from "@/server/parameters";

export type DoseResponsePoint = { dose: number; probability: number };

export type DoseResponseCurve = {
  points: DoseResponsePoint[];
  operatingDose: number;
  operatingProbability: number;
  model: string;
  isTcp: boolean;
};

export type CiBandPoint = { dose: number; low: number; high: number };

export type TherapeuticSweepPoint = {
  totalDoseGy: number;
  tcp: number;
  ntcpComposite: number;
  utcp: number;
};

export type TherapeuticSweepResult = {
  points: TherapeuticSweepPoint[];
  optimalDoseGy: number;
  optimalUtcp: number;
  numFractions: number;
};

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function ntcpAtGeud(
  geud: number,
  td50: number,
  gamma50: number,
  m: number,
  model: "lkb_loglogit" | "lkb_probit" | "poisson",
): number {
  if (geud <= 0) return 0;
  if (model === "lkb_loglogit") {
    const ratio = geud / Math.max(td50, 0.1);
    return 1 / (1 + Math.pow(ratio, -4 * Math.max(gamma50, 0.01)));
  }
  if (model === "lkb_probit") {
    const t = (geud - td50) / (m * Math.max(td50, 0.1));
    return 0.5 * (1 + erf(t / Math.sqrt(2)));
  }
  const lambda = Math.exp(-Math.exp(-(geud - td50) / Math.max(5 / gamma50, 0.5)));
  return 1 - lambda;
}

export function tcpAtDosePoisson(dose: number, d50: number, gamma: number): number {
  if (dose <= 0) return 0;
  const lambda = Math.exp(-Math.exp(-(dose - d50) / Math.max(5 / gamma, 0.5)));
  return 1 - lambda;
}

export function buildDoseResponseCurve(opts: {
  td50: number;
  gamma50: number;
  m?: number;
  model: "lkb_loglogit" | "lkb_probit" | "poisson";
  isTcp: boolean;
  operatingDose: number;
  operatingProbability: number;
  doseMin?: number;
  doseMax?: number;
  steps?: number;
}): DoseResponseCurve {
  const {
    td50,
    gamma50,
    m = 0.18,
    model,
    isTcp,
    operatingDose,
    operatingProbability,
    doseMin = 0,
    doseMax = Math.max(80, td50 * 2),
    steps = 50,
  } = opts;
  const points: DoseResponsePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = doseMin + (i / steps) * (doseMax - doseMin);
    const prob = isTcp
      ? tcpAtDosePoisson(d, td50, gamma50)
      : ntcpAtGeud(d, td50, gamma50, m, model);
    points.push({ dose: d, probability: Math.min(1, Math.max(0, prob)) });
  }
  return {
    points,
    operatingDose,
    operatingProbability,
    model,
    isTcp,
  };
}

/** CI band — only when library entry has published ci95 on td50/m/n. */
export function buildCiSensitivityBand(opts: {
  organ: string;
  model: RadiobiologyModelId;
  td50: number;
  gamma50: number;
  m: number;
  doseMax?: number;
  steps?: number;
}): CiBandPoint[] | null {
  const entry = getLibraryEntryForOrganModel(opts.organ, opts.model);
  if (!entry?.ci95?.td50) return null;

  const tdLow = entry.ci95.td50.low;
  const tdHigh = entry.ci95.td50.high;
  const mLow = entry.ci95.m?.low ?? opts.m;
  const mHigh = entry.ci95.m?.high ?? opts.m;
  const doseMax = opts.doseMax ?? Math.max(80, opts.td50 * 2);
  const steps = opts.steps ?? 40;
  const model =
    opts.model === "lkb_probit"
      ? "lkb_probit"
      : opts.model === "poisson"
        ? "poisson"
        : "lkb_loglogit";

  const band: CiBandPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * doseMax;
    const low = ntcpAtGeud(d, tdLow, opts.gamma50, mHigh, model);
    const high = ntcpAtGeud(d, tdHigh, opts.gamma50, mLow, model);
    band.push({
      dose: d,
      low: Math.min(low, high),
      high: Math.max(low, high),
    });
  }
  return band;
}

export function scaleDvhBundle(
  bundle: ParsedDvhBundle,
  scale: number,
): ParsedDvhBundle {
  const dvhByStructure: ParsedDvhBundle["dvhByStructure"] = {};
  for (const [name, pts] of Object.entries(bundle.dvhByStructure)) {
    dvhByStructure[name] = pts.map((p) => ({
      dose: p.dose * scale,
      volume: p.volume,
    }));
  }
  return {
    ...bundle,
    dvhByStructure,
    patientInfo: bundle.patientInfo
      ? {
          ...bundle.patientInfo,
          prescribedDoseGy: bundle.patientInfo.prescribedDoseGy
            ? bundle.patientInfo.prescribedDoseGy * scale
            : undefined,
        }
      : undefined,
  };
}

export function therapeuticWindowDoseSweep(opts: {
  bundle: ParsedDvhBundle;
  baseTotalDoseGy: number;
  numFractions: number;
  doseMinGy?: number;
  doseMaxGy?: number;
  steps?: number;
  cancerSite?: string;
  technique?: string;
  prescriptionGy?: number;
}): TherapeuticSweepResult {
  const {
    bundle,
    baseTotalDoseGy,
    numFractions,
    doseMinGy = 20,
    doseMaxGy = 100,
    steps = 17,
    cancerSite = "HN",
    technique = "IMRT",
    prescriptionGy,
  } = opts;

  const points: TherapeuticSweepPoint[] = [];
  let optimalDoseGy = baseTotalDoseGy;
  let optimalUtcp = 0;

  for (let i = 0; i <= steps; i++) {
    const dose = doseMinGy + (i / steps) * (doseMaxGy - doseMinGy);
    const scale = baseTotalDoseGy > 0 ? dose / baseTotalDoseGy : 1;
    const scaled = scaleDvhBundle(bundle, scale);
    const ev = offlineEvaluateComposite(scaled, {
      totalDose: dose,
      numFractions,
      cancerSite,
      technique,
      prescriptionGy: prescriptionGy ?? dose,
    });
    const pt: TherapeuticSweepPoint = {
      totalDoseGy: dose,
      tcp: ev.therapeutic.tcpRaw,
      ntcpComposite: ev.therapeutic.ntcpComposite,
      utcp: ev.therapeutic.utcp,
    };
    points.push(pt);
    if (pt.utcp > optimalUtcp) {
      optimalUtcp = pt.utcp;
      optimalDoseGy = dose;
    }
  }

  return { points, optimalDoseGy, optimalUtcp, numFractions };
}

export type DvhCurveSeries = {
  label: string;
  color?: string;
  points: { dose: number; volume: number }[];
  geud?: number;
};

export function buildDvhOverlaySeries(
  series: DvhCurveSeries[],
): { allPoints: DvhCurveSeries[]; maxDose: number } {
  let maxDose = 0;
  for (const s of series) {
    for (const p of s.points) {
      if (p.dose > maxDose) maxDose = p.dose;
    }
    if (s.geud != null && s.geud > maxDose) maxDose = s.geud;
  }
  return { allPoints: series, maxDose: Math.max(maxDose, 80) };
}

export function hasPublishedCi(organ: string, model: string): boolean {
  const entry = getLibraryEntryForOrganModel(organ, model);
  return !!(entry?.ci95 && Object.keys(entry.ci95).length > 0);
}

export type { ParameterCi95 };
