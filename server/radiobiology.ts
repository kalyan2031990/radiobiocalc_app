/**
 * Core Radiobiology Calculation Engine
 * 
 * Implements traditional radiobiological models for:
 * - BED (Biologically Effective Dose)
 * - EQD2 (Equivalent Dose in 2 Gy fractions)
 * - gEUD (Generalized Equivalent Uniform Dose)
 * - EUD (Equivalent Uniform Dose)
 * - TCP (Tumor Control Probability) - Poisson and LKB models
 * - NTCP (Normal Tissue Complication Probability) - LKB and Poisson models
 * 
 * References:
 * [1] Niemierko A. Reporting and analyzing dose distributions: a concept of equivalent uniform dose. Med Phys. 1997;24(1):103-110.
 * [2] Lyman JT. Complication probability as assessed from dose-volume histograms. Radiat Res Suppl. 1985;8:S13-S19.
 * [3] Kutcher GJ, Burman C. Calculation of complication probability factors for non-uniform normal tissue irradiation. Int J Radiat Oncol Biol Phys. 1989;16(6):1623-1630.
 * [4] Bentzen SM, Constanzo J. Radiotherapy toxicity. Acta Oncol. 1998;37(4):329-334.
 */

import { z } from "zod";
import { arrayMax, arrayMin } from "@/lib/numeric-safe";
import { getTcpSiteParams } from "./tcp-site-params";
import { getTechnique } from "./techniques";
import { computeExtendedPhysicalMetrics } from "./tcp-dvh-engine";
import {
  cumulativeDosePercentile,
  volumePercentAtLeast,
} from "../lib/plan-dosimetric-indices";
import {
  computePoissonTcpFromDvh,
} from "./tcp-dvh-engine";
import { computeZaiderMinerboTcp } from "./zaider-minerbo";

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface DVHPoint {
  dose: number; // Gy
  volume: number; // cm³ or relative volume (0-1)
}

export interface DoseMetrics {
  meanDose: number;
  maxDose: number;
  minDose: number;
  totalVolume: number;
  gEUD: number;
  eud: number;
  vxx: Record<number, number>; // V5, V10, V20, etc. (% volume)
  dxx: Record<number, number>; // D1, D2, D5, etc. (Gy)
  d95?: number;
  d98?: number;
  d50?: number;
  d2?: number;
  v95?: number;
  v100?: number;
  v107?: number;
}

export type RadiobiologyModelId =
  | "lkb_loglogit"
  | "lkb_probit"
  | "poisson"
  | "zaider_minerbo"
  | "poisson_dvh";

export interface OrganParameters {
  td50: number; // Tolerance dose at 50% complication rate (Gy)
  m: number; // Slope parameter for probit model
  n: number; // Volume effect parameter
  gamma50: number; // Dose-response gradient
  alphaBeta: number; // Alpha/beta ratio (Gy)
  d50: number; // Dose at 50% TCP/NTCP for Poisson model
  gamma: number; // Dose-response parameter for Poisson
  s: number; // Seriality parameter (0=parallel, 1=serial)
}

export interface CalculationRequest {
  dvh: DVHPoint[];
  totalDose: number; // Gy
  numFractions: number;
  organ: string;
  structureType: "target" | "oar"; // Target or Organ At Risk
  model: RadiobiologyModelId;
  parameters?: Partial<OrganParameters>;
  /** gEUD volume parameter a (default 1 = mean-dose-like) */
  geudExponent?: number;
  /** Apply per-bin EQD2 to DVH before gEUD/NTCP (default true when d/fx ≠ 2 Gy) */
  useEqd2Dvh?: boolean;
  /** Poisson TCP clonogenic cell count (default site literature value) */
  numClonogenicCells?: number;
  /** LKB probit: use Kutcher–Burman effective-volume reduction (default true) */
  useKbProbitReduction?: boolean;
  cancerSite?: string;
  technique?: string;
  targetType?: string;
  lqMaxDosePerFractionGy?: number;
  /** Prescription dose for Vxx/Dxx target metrics (defaults to totalDose). */
  prescriptionGy?: number;
}

export interface CalculationResult {
  organ: string;
  model: string;
  tcp?: number;
  ntcp?: number;
  bed: number;
  eqd2: number;
  doseMetrics: DoseMetrics;
  parameters: OrganParameters;
  timestamp: string;
  cancerSite?: string;
  technique?: string;
  lqCaution?: boolean;
  zmDetails?: {
    nEff: number;
    p0SingleCell: number;
    repopFactor: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dose Calculation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Biologically Effective Dose (BED)
 * BED = D × (1 + d / (α/β))
 * where D = total dose, d = dose per fraction, α/β = alpha/beta ratio
 */
export function calculateBED(
  totalDose: number,
  numFractions: number,
  alphaBeta: number
): number {
  if (totalDose <= 0 || numFractions <= 0 || alphaBeta <= 0) {
    return 0;
  }

  const dosePerFraction = totalDose / numFractions;
  const bed = totalDose * (1 + dosePerFraction / alphaBeta);
  return bed;
}

/**
 * Calculate Equivalent Dose in 2 Gy fractions (EQD2)
 * EQD2 = D × ((α/β + d) / (α/β + 2))
 * where D = total dose, d = dose per fraction, α/β = alpha/beta ratio
 */
export function calculateEQD2(
  totalDose: number,
  numFractions: number,
  alphaBeta: number
): number {
  if (totalDose <= 0 || numFractions <= 0 || alphaBeta <= 0) {
    return 0;
  }

  const dosePerFraction = totalDose / numFractions;
  const eqd2 = totalDose * ((alphaBeta + dosePerFraction) / (alphaBeta + 2));
  return eqd2;
}

/**
 * Per-bin EQD2 for DVH reduction (2 Gy reference).
 * D_bin = physical dose at bin; d_fp = prescription dose per fraction.
 */
export function calculateBinEQD2(
  doseBinGy: number,
  dosePerFractionGy: number,
  alphaBeta: number,
): number {
  if (doseBinGy <= 0 || alphaBeta <= 0) return 0;
  return doseBinGy * ((alphaBeta + dosePerFractionGy) / (alphaBeta + 2));
}

/** Kutcher–Burman effective volume for LKB probit. */
export function calculateEffectiveVolume(
  dvhDiff: DVHPoint[],
  n: number,
): number {
  if (!dvhDiff.length || n <= 0) return 1;
  const maxD = Math.max(...dvhDiff.map((p) => p.dose));
  if (maxD <= 0) return 1;
  const totalV = dvhDiff.reduce((s, p) => s + p.volume, 0);
  if (totalV <= 0) return 1;
  let sum = 0;
  for (const p of dvhDiff) {
    sum += p.volume * Math.pow(p.dose / maxD, 1 / n);
  }
  return sum / totalV;
}

export function convertDvhToEqd2Scale(
  dvhDiff: DVHPoint[],
  dosePerFractionGy: number,
  alphaBeta: number,
): DVHPoint[] {
  return dvhDiff.map((p) => ({
    dose: calculateBinEQD2(p.dose, dosePerFractionGy, alphaBeta),
    volume: p.volume,
  }));
}

/** Default clonogen count for TCP Poisson (cite: Niemierko 1997, site-dependent). */
export const DEFAULT_CLONOGENIC_CELLS = 1e9;

/**
 * Calculate generalized Equivalent Uniform Dose (gEUD)
 * gEUD = (Σ vi × Di^a)^(1/a)
 * where vi = relative volume at dose Di, a = volume parameter
 */
export function calculateGEUD(
  dvh: DVHPoint[],
  aParameter: number = 1
): number {
  if (dvh.length === 0) {
    return NaN;
  }

  // Differential DVH: bin volumes should sum to total mass (normalize if rebinning drift)
  const totalVolume = dvh.reduce((s, p) => s + Math.max(0, p.volume), 0);
  if (totalVolume <= 0) {
    return NaN;
  }

  const relativeVolumes = dvh.map((p) => p.volume / totalVolume);

  // Special cases
  if (Math.abs(aParameter) < 1e-10) {
    // a ≈ 0: geometric mean
    const logSum = relativeVolumes.reduce(
      (sum, vi, i) => sum + vi * Math.log(Math.max(dvh[i].dose, 1e-10)),
      0
    );
    return Math.exp(logSum);
  }

  if (Math.abs(aParameter - 1) < 1e-10) {
    // a = 1: arithmetic mean (mean dose)
    return relativeVolumes.reduce((sum, vi, i) => sum + vi * dvh[i].dose, 0);
  }

  if (!isFinite(aParameter)) {
    // a = ∞: maximum dose
    return arrayMax(dvh.map((p) => p.dose));
  }

  // General case
  const sum = relativeVolumes.reduce(
    (sum, vi, i) => sum + vi * Math.pow(Math.max(dvh[i].dose, 1e-10), aParameter),
    0
  );

  if (sum <= 0) {
    return 0;
  }

  return Math.pow(sum, 1 / aParameter);
}

/**
 * Calculate Equivalent Uniform Dose (EUD).
 *
 * v1.2.0 fix (S3): EUD is Niemierko's generalized EUD over the differential
 * DVH — identical to gEUD with the organ volume parameter `a`.
 * The previous `meanDose * totalVolume^(-v)` form was dimensionally incorrect
 * (unit-dependent, and a uniform-dose volume did not return that dose) and
 * has been removed.
 *
 * Reference: Niemierko A. Med Phys. 1997;24(1):103-110.
 */
export function calculateEUD(
  dvh: DVHPoint[],
  aParameter: number = 1
): number {
  return calculateGEUD(dvh, aParameter);
}

// ─────────────────────────────────────────────────────────────────────────────
// DVH Processing Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate comprehensive dose metrics from DVH
 */
export function calculateDoseMetrics(dvh: DVHPoint[]): DoseMetrics {
  const empty: DoseMetrics = {
    meanDose: NaN,
    maxDose: NaN,
    minDose: NaN,
    totalVolume: 0,
    gEUD: NaN,
    eud: NaN,
    vxx: {},
    dxx: {},
  };
  if (dvh.length === 0) {
    return empty;
  }

  // Sort by dose (expects differential bins after toDifferentialDVH in performCalculation)
  const sortedDVH = [...dvh].sort((a, b) => a.dose - b.dose);

  const doses = sortedDVH.map((p) => p.dose);
  const volumes = sortedDVH.map((p) => Math.max(0, p.volume));
  const totalVolume = volumes.reduce((s, v) => s + v, 0);

  if (totalVolume <= 0) {
    return empty;
  }

  const relativeVolumes = volumes.map((v) => v / totalVolume);

  // Basic metrics
  const maxDose = arrayMax(doses);
  const minDose = arrayMin(doses.filter((d) => d > 0), maxDose);
  const meanDose = relativeVolumes.reduce((sum, vi, i) => sum + vi * doses[i], 0);

  // Vxx on differential DVH: sum bin fractions with dose >= threshold
  const vxx: Record<number, number> = {};
  for (let doseLevel = 5; doseLevel <= 70; doseLevel += 5) {
    if (doseLevel <= maxDose) {
      let volAtLeast = 0;
      for (let i = 0; i < sortedDVH.length; i++) {
        if (doses[i] >= doseLevel) volAtLeast += volumes[i];
      }
      vxx[doseLevel] = (volAtLeast / totalVolume) * 100;
    } else {
      vxx[doseLevel] = 0;
    }
  }

  // Calculate Dxx (dose to xx% of volume)
  // v1.2.0 fix (S4): interpolate against the CUMULATIVE volume-receiving->=dose
  // curve, not the differential bin fractions (the previous implementation used
  // non-monotonic bin fractions as the interpolation axis and returned invalid
  // Dxx values on the differential-DVH path).
  const cumFrac = new Array<number>(sortedDVH.length);
  let acc = 0;
  for (let i = sortedDVH.length - 1; i >= 0; i--) {
    acc += relativeVolumes[i];
    cumFrac[i] = acc; // fraction of volume receiving dose >= doses[i]
  }
  const dxx: Record<number, number> = {};
  const volumePercentages = [0.01, 0.1, 1, 2, 5, 10, 20, 30, 50, 70, 90, 95, 98];
  for (const volPercent of volumePercentages) {
    const f = volPercent / 100;
    if (f <= 1.0) {
      dxx[volPercent] = doseAtCumulativeFraction(doses, cumFrac, f);
    }
  }

  const gEUD = calculateGEUD(sortedDVH, 1); // a=1 for mean dose
  // v1.2.0 fix (S3): EUD defaults to the a=1 gEUD here; performCalculation
  // overrides it with the organ-specific volume parameter when provided.
  const eud = gEUD;
  const ext = computeExtendedPhysicalMetrics(sortedDVH);

  return {
    meanDose,
    maxDose,
    minDose,
    totalVolume,
    gEUD,
    eud,
    vxx,
    dxx,
    d95: ext.d95,
    d98: ext.d98,
    d50: ext.d50,
    d2: ext.d2,
    v95: ext.v95,
    v100: ext.v100,
    v107: ext.v107,
  };
}

/**
 * Dose D such that the fraction of volume receiving >= D equals `targetFrac`.
 * `doses` ascending; `cumFrac[i]` = fraction of volume receiving >= doses[i]
 * (monotonically non-increasing). Linear interpolation in dose.
 */
function doseAtCumulativeFraction(
  doses: number[],
  cumFrac: number[],
  targetFrac: number
): number {
  if (doses.length === 0) return 0;
  if (targetFrac >= cumFrac[0]) return doses[0];
  const last = doses.length - 1;
  if (targetFrac <= cumFrac[last]) return doses[last];

  for (let i = 0; i < last; i++) {
    const fHi = cumFrac[i]; // at lower dose
    const fLo = cumFrac[i + 1]; // at higher dose
    if (fHi >= targetFrac && fLo <= targetFrac) {
      if (fHi === fLo) return doses[i + 1];
      const t = (fHi - targetFrac) / (fHi - fLo);
      return doses[i] + t * (doses[i + 1] - doses[i]);
    }
  }
  return doses[last];
}

// ─────────────────────────────────────────────────────────────────────────────
// NTCP Models
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate NTCP using LKB Log-Logistic model
 * NTCP = 1 / (1 + (TD50 / gEUD)^(4 × γ50))
 * 
 * Reference: Lyman JT. Complication probability as assessed from dose-volume histograms. 
 * Radiat Res Suppl. 1985;8:S13-S19.
 */
export function calculateNTCP_LKB_LogLogit(
  gEUD: number,
  td50: number,
  gamma50: number
): number {
  if (gEUD <= 0 || td50 <= 0 || gamma50 <= 0) {
    return 0;
  }

  try {
    const ratio = td50 / gEUD;
    const exponent = 4 * gamma50;
    const ntcp = 1 / (1 + Math.pow(ratio, exponent));
    return Math.max(0, Math.min(1, ntcp)); // Clamp to [0, 1]
  } catch {
    return gEUD < td50 ? 0 : 1;
  }
}

/**
 * Calculate NTCP using LKB Probit model
 * NTCP = Φ((D - TD50) / (m × TD50))
 * where Φ is the cumulative normal distribution
 * 
 * Reference: Kutcher GJ, Burman C. Calculation of complication probability factors 
 * for non-uniform normal tissue irradiation. Int J Radiat Oncol Biol Phys. 1989;16(6):1623-1630.
 */
export function calculateNTCP_LKB_Probit(
  maxDose: number,
  vEffective: number,
  td50: number,
  m: number,
  n: number
): number {
  if (maxDose <= 0 || vEffective <= 0 || td50 <= 0 || m <= 0) {
    return 0;
  }

  try {
    // Effective TD50 adjusted for volume
    const tdVeff50 = td50 * Math.pow(vEffective, -n);

    // Calculate t parameter
    const t = (maxDose - tdVeff50) / (m * tdVeff50);

    // Cumulative normal distribution
    const ntcp = cumulativeNormalDistribution(t);
    return Math.max(0, Math.min(1, ntcp)); // Clamp to [0, 1]
  } catch {
    return maxDose < td50 ? 0 : 1;
  }
}

/**
 * Calculate NTCP using the Poisson-form model
 * NTCP = 1 - exp(-ln2 × (D / D50)^γ)
 *
 * v1.2.0 fix (S2): the hazard coefficient is fixed at ln 2 so that D50 is the
 * true 50%-complication dose (NTCP(D50) = 0.5 for any γ). The previous form
 * 1 - exp(-s × (D/D50)^γ) only centred at 50% when s happened to equal ln 2,
 * which the shipped parameter sets did not. The legacy seriality parameter
 * `s` is retained in the signature for API compatibility and is no longer
 * used by the normalized form.
 *
 * Note: this generic form remains a display-only comparison model and never
 * enters composite metrics (which use the LKB logistic default).
 */
export function calculateNTCP_Poisson(
  meanDose: number,
  d50: number,
  gamma: number,
  s: number = 1
): number {
  if (meanDose <= 0 || d50 <= 0 || gamma <= 0) {
    return 0;
  }

  try {
    const doseRatio = meanDose / d50;
    const ntcp = 1 - Math.exp(-Math.LN2 * Math.pow(doseRatio, gamma));
    return Math.max(0, Math.min(1, ntcp)); // Clamp to [0, 1]
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TCP Models
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate TCP using the Poisson model in TCD50/γ50 parameterization.
 *
 *   TCP(D) = exp( −ln2 · exp( (γ50 / ln2) · (1 − D/TCD50) ) )
 *
 * This is the exact reparameterization of the double-exponential Poisson form
 * TCP = exp(−N·e^(−αD)) in terms of the 50% control dose TCD50 and the
 * normalized dose–response gradient γ50 (Okunieff et al., Int J Radiat Oncol
 * Biol Phys 1995;32:1047–1058). It is monotone non-decreasing in dose,
 * TCP(TCD50) = 0.5, and the slope at TCD50 equals γ50 by construction.
 *
 * v1.2.0 fix (S1 — critical): the previous implementation computed
 * TCP = exp(−N·(1 − exp(−(D/D50)^γ))), which is inverted (TCP → exp(−N) ≈ 0
 * at high dose and ≈ 1 near zero dose) and numerically degenerate with the
 * default N = 1e9. The default composite engine path (Poisson LQ-DVH) was
 * never affected; this corrects the generic selectable model.
 *
 * If `numClonogenicCells` is explicitly provided and differs from the value
 * implied by (TCD50, γ50), the effective clonogen burden is rescaled
 * accordingly (this shifts TCD50, as it should).
 */
export function calculateTCP_Poisson(
  meanDose: number,
  d50: number,
  gamma: number,
  numClonogenicCells?: number
): number {
  if (meanDose <= 0 || d50 <= 0 || gamma <= 0) {
    return 0;
  }

  try {
    const gammaOverLn2 = gamma / Math.LN2;
    // Clonogen number implied by the (TCD50, γ50) pair: N0 = ln2 · exp(γ50/ln2)
    const nImplied = Math.LN2 * Math.exp(gammaOverLn2);
    const scale =
      numClonogenicCells != null && numClonogenicCells > 0
        ? numClonogenicCells / nImplied
        : 1;
    const u =
      scale * Math.LN2 * Math.exp(gammaOverLn2 * (1 - meanDose / d50));
    const tcp = Math.exp(-u);
    return Math.max(0, Math.min(1, tcp)); // Clamp to [0, 1]
  } catch {
    return 0;
  }
}

/**
 * Calculate TCP using LKB-based model
 * Simplified: TCP = 1 / (1 + (TD50 / gEUD)^(4 × γ50))
 * (Similar to NTCP but with different parameters)
 */
export function calculateTCP_LKB(
  gEUD: number,
  td50: number,
  gamma50: number
): number {
  if (gEUD <= 0 || td50 <= 0 || gamma50 <= 0) {
    return 0;
  }

  try {
    const ratio = td50 / gEUD;
    const exponent = 4 * gamma50;
    const tcp = 1 / (1 + Math.pow(ratio, exponent));
    return Math.max(0, Math.min(1, tcp)); // Clamp to [0, 1]
  } catch {
    return gEUD < td50 ? 0 : 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistical Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cumulative normal distribution function (approximation)
 * Used for probit model calculations
 */
function cumulativeNormalDistribution(x: number): number {
  // Approximation using error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t *
      Math.exp(-absX * absX));

  return 0.5 * (1 + sign * y);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculation Function
// ─────────────────────────────────────────────────────────────────────────────

/** Cumulative Eclipse DVH → differential bins for EUD/gEUD/mean dose. */
export function isCumulativeDvh(dvh: DVHPoint[]): boolean {
  if (dvh.length < 2) return false;
  for (let i = 1; i < dvh.length; i++) {
    if (dvh[i].volume > dvh[i - 1].volume + 1e-3) {
      return false;
    }
  }
  return true;
}

/** Differential bins → cumulative curve (volume receiving >= dose). */
export function cumulativeFromDifferential(dvhDiff: DVHPoint[]): DVHPoint[] {
  const sorted = [...dvhDiff].sort((a, b) => a.dose - b.dose);
  const total = sorted.reduce((s, p) => s + Math.max(0, p.volume), 0);
  if (total <= 0) return sorted;
  let acc = 0;
  const cum: DVHPoint[] = new Array(sorted.length);
  for (let i = sorted.length - 1; i >= 0; i--) {
    acc += Math.max(0, sorted[i].volume);
    cum[i] = { dose: sorted[i].dose, volume: acc };
  }
  return cum;
}

/** Shell volumes from a cumulative DVH (dose = minimum dose to each shell). */
export function cumulativeShellsFromDvh(cumulative: DVHPoint[]): DVHPoint[] {
  const sorted = [...cumulative].sort((a, b) => a.dose - b.dose);
  const shells: DVHPoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const vol = Math.max(0, sorted[i - 1].volume - sorted[i].volume);
    if (vol > 1e-9) {
      shells.push({ dose: sorted[i].dose, volume: vol });
    }
  }
  return shells.length > 0 ? shells : sorted;
}

/** Dose metrics from cumulative DVH (correct mean dose on uniform dose resamples). */
export function calculateDoseMetricsFromCumulative(cumulative: DVHPoint[]): DoseMetrics {
  const empty: DoseMetrics = {
    meanDose: NaN,
    maxDose: NaN,
    minDose: NaN,
    totalVolume: 0,
    gEUD: NaN,
    eud: NaN,
    vxx: {},
    dxx: {},
  };
  if (cumulative.length === 0) return empty;

  const sorted = [...cumulative].sort((a, b) => a.dose - b.dose);
  const v0 = sorted[0].volume;
  if (v0 <= 0) return empty;

  const shells = cumulativeShellsFromDvh(sorted);
  let meanIntegral = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dv = Math.max(0, sorted[i - 1].volume - sorted[i].volume);
    meanIntegral += ((sorted[i - 1].dose + sorted[i].dose) / 2) * dv;
  }
  const meanDose = meanIntegral / v0;
  const maxDose = sorted[sorted.length - 1].dose;
  const positiveDoses = sorted.map((p) => p.dose).filter((d) => d > 0);
  const minDose = positiveDoses.length > 0 ? arrayMin(positiveDoses, maxDose) : maxDose;

  const gEUD = calculateGEUD(shells, 1);
  // v1.2.0 fix (S3): EUD defaults to the a=1 gEUD; see calculateEUD note.
  const eud = gEUD;
  const d98 = cumulativeDosePercentile(sorted, 98);
  const d95 = cumulativeDosePercentile(sorted, 95);
  const d50 = cumulativeDosePercentile(sorted, 50);
  const d2 = cumulativeDosePercentile(sorted, 2);

  const vxx: Record<number, number> = {};
  for (let doseLevel = 5; doseLevel <= 70; doseLevel += 5) {
    if (doseLevel <= maxDose) {
      vxx[doseLevel] = volumePercentAtLeast(sorted, doseLevel);
    } else {
      vxx[doseLevel] = 0;
    }
  }

  const dxx: Record<number, number> = {
    2: d2,
    5: cumulativeDosePercentile(sorted, 5),
    50: d50,
    95: d95,
    98: d98,
  };

  return {
    meanDose,
    maxDose,
    minDose,
    totalVolume: v0,
    gEUD,
    eud,
    vxx,
    dxx,
    d95,
    d98,
    d50,
    d2,
    v95: volumePercentAtLeast(sorted, maxDose * 0.95),
    v100: volumePercentAtLeast(sorted, maxDose),
    v107: volumePercentAtLeast(sorted, maxDose * 1.07),
  };
}

function toDifferentialDVH(dvh: DVHPoint[]): DVHPoint[] {
  if (dvh.length < 2) return dvh;
  if (!isCumulativeDvh(dvh)) return dvh;

  return cumulativeShellsFromDvh(dvh);
}

/**
 * Perform comprehensive radiobiological calculation
 */
export function performCalculation(
  request: CalculationRequest,
  defaultParameters: OrganParameters
): CalculationResult {
  // Merge parameters
  const params = { ...defaultParameters, ...request.parameters };

  const dvhDiff = toDifferentialDVH(request.dvh);
  const cumulative = isCumulativeDvh(request.dvh);

  if (dvhDiff.length === 0) {
    return {
      organ: request.organ,
      model: request.model,
      bed: 0,
      eqd2: 0,
      doseMetrics: calculateDoseMetrics([]),
      parameters: params,
      timestamp: new Date().toISOString(),
      cancerSite: request.cancerSite,
      technique: request.technique,
    };
  }

  const dpf = request.totalDose / request.numFractions;
  const useEqd2Dvh =
    request.useEqd2Dvh ??
    (request.structureType === "oar" && Math.abs(dpf - 2) > 0.05);
  const dvhForReduction = useEqd2Dvh
    ? convertDvhToEqd2Scale(dvhDiff, dpf, params.alphaBeta)
    : dvhDiff;

  // Calculate dose metrics (physical DVH for reporting)
  let doseMetrics = cumulative
    ? calculateDoseMetricsFromCumulative(request.dvh)
    : calculateDoseMetrics(dvhDiff);
  // v1.2.0 fix (S5/S4): target coverage indices are ALWAYS evaluated against
  // the prescription on the cumulative form of the DVH. Previously the
  // differential-input path fell through to maxDose-relative thresholds with
  // max-volume normalization, returning invalid V95/V100/V107.
  if (request.structureType === "target") {
    const rx = request.prescriptionGy ?? request.totalDose;
    const sortedForV = cumulative
      ? [...request.dvh].sort((a, b) => a.dose - b.dose)
      : cumulativeFromDifferential(dvhDiff);
    doseMetrics = {
      ...doseMetrics,
      v95: volumePercentAtLeast(sortedForV, rx * 0.95),
      v100: volumePercentAtLeast(sortedForV, rx),
      v107: volumePercentAtLeast(sortedForV, rx * 1.07),
    };
  }
  // v1.2.0 fix (S5): V95/V100/V107 are target-coverage indices relative to the
  // prescription; for OARs they are meaningless, so suppress them.
  if (request.structureType === "oar") {
    doseMetrics = {
      ...doseMetrics,
      v95: undefined,
      v100: undefined,
      v107: undefined,
    };
  }
  if (!Number.isFinite(doseMetrics.gEUD) || doseMetrics.totalVolume <= 0) {
    return {
      organ: request.organ,
      model: request.model,
      bed: calculateBED(request.totalDose, request.numFractions, params.alphaBeta),
      eqd2: calculateEQD2(request.totalDose, request.numFractions, params.alphaBeta),
      doseMetrics,
      parameters: params,
      timestamp: new Date().toISOString(),
      cancerSite: request.cancerSite,
      technique: request.technique,
    };
  }
  const aExp = request.geudExponent ?? 1;
  const gEUDInput = useEqd2Dvh ? dvhForReduction : dvhDiff;
  if (aExp !== 1) {
    doseMetrics.gEUD = calculateGEUD(gEUDInput, aExp);
  } else if (useEqd2Dvh && request.structureType === "oar") {
    doseMetrics.gEUD = calculateGEUD(gEUDInput, 1);
  }
  // EUD is gEUD with the organ volume parameter by definition (Niemierko 1997).
  doseMetrics.eud = doseMetrics.gEUD;

  const technique = getTechnique(request.technique ?? "IMRT");
  const lqMax =
    request.lqMaxDosePerFractionGy ??
    technique?.lqValidMaxDosePerFractionGy ??
    10;
  const lqCaution = dpf > lqMax;

  const siteParams = request.cancerSite
    ? getTcpSiteParams(request.cancerSite)
    : null;
  const alphaBeta =
    siteParams?.alphaBetaGy ?? params.alphaBeta;

  // Calculate BED and EQD2
  const bed = calculateBED(request.totalDose, request.numFractions, alphaBeta);
  const eqd2 = calculateEQD2(request.totalDose, request.numFractions, alphaBeta);

  // Calculate TCP or NTCP based on structure type
  let tcp: number | undefined;
  let ntcp: number | undefined;
  let zmDetails: CalculationResult["zmDetails"];
  let modelUsed = request.model;

  if (request.structureType === "target") {
    const targetType = request.targetType ?? "PTV";
    if (request.model === "zaider_minerbo" && siteParams) {
      const zm = computeZaiderMinerboTcp(
        cumulative ? request.dvh : dvhDiff,
        request.numFractions,
        siteParams,
        targetType,
        lqMax
      );
      tcp = zm.tcp;
      zmDetails = {
        nEff: zm.nEff,
        p0SingleCell: zm.p0SingleCell,
        repopFactor: zm.repopFactor,
      };
    } else if (request.model === "poisson_dvh" && siteParams) {
      tcp = computePoissonTcpFromDvh(
        cumulative ? request.dvh : dvhDiff,
        request.numFractions,
        siteParams,
        targetType,
        lqMax
      );
    } else if (request.model === "poisson") {
      // v1.2.0: N is implied by (TCD50, γ50); only an explicit user override
      // rescales the clonogen burden (see calculateTCP_Poisson).
      tcp = calculateTCP_Poisson(
        doseMetrics.meanDose,
        params.d50,
        params.gamma,
        request.numClonogenicCells,
      );
    } else if (request.model === "lkb_loglogit") {
      tcp = calculateTCP_LKB(doseMetrics.gEUD, params.td50, params.gamma50);
    }
  } else {
    // NTCP for OARs — TCP-only models are not valid here
    modelUsed =
      request.model === "zaider_minerbo" || request.model === "poisson_dvh"
        ? "lkb_loglogit"
        : request.model;

    if (modelUsed === "lkb_loglogit") {
      const geudNtcp = useEqd2Dvh ? calculateGEUD(gEUDInput, 1) : doseMetrics.gEUD;
      ntcp = calculateNTCP_LKB_LogLogit(geudNtcp, params.td50, params.gamma50);
    } else if (modelUsed === "lkb_probit") {
      const useKb = request.useKbProbitReduction !== false;
      if (useKb) {
        const vEff = calculateEffectiveVolume(dvhForReduction, params.n);
        ntcp = calculateNTCP_LKB_Probit(
          doseMetrics.maxDose,
          vEff,
          params.td50,
          params.m,
          params.n,
        );
      } else {
        ntcp = calculateNTCP_LKB_Probit(
          doseMetrics.maxDose,
          1.0,
          params.td50,
          params.m,
          params.n,
        );
      }
    } else if (modelUsed === "poisson") {
      ntcp = calculateNTCP_Poisson(
        doseMetrics.meanDose,
        params.d50,
        params.gamma,
        params.s
      );
    }
  }

  return {
    organ: request.organ,
    model: modelUsed,
    tcp,
    ntcp,
    bed,
    eqd2,
    doseMetrics,
    parameters: params,
    timestamp: new Date().toISOString(),
    cancerSite: request.cancerSite,
    technique: request.technique,
    lqCaution,
    zmDetails,
  };
}
