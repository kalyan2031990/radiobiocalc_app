/**
 * Parameter-uncertainty propagation for TCP/NTCP (v1.3.0).
 *
 * Monte-Carlo propagation of dose–response parameter uncertainty into 95%
 * confidence bands for the LKB logistic NTCP and the logistic-form TCP.
 *
 * Method:
 *  - Parameters with published 95% CIs are sampled from distributions matched
 *    to those intervals (log-normal for dose parameters, truncated normal for
 *    dimensionless slopes).
 *  - Parameters without published CIs use an explicitly-labelled assumed
 *    relative uncertainty (TD50 CV 10%, γ50 CV 25% by default).
 *  - Sampling is seeded (mulberry32 + Box–Muller) → byte-reproducible bands.
 *  - A delta-method analytic cross-check (`logisticNtcpDeltaSd`) guards the
 *    Monte-Carlo implementation (verified in tests/uncertainty.test.ts).
 *
 * Scope note: bands quantify PARAMETER uncertainty of the documented models
 * only — not model-form uncertainty, inter-patient variability, or clinical
 * outcome uncertainty. They answer "how much does this number move within the
 * published parameter uncertainty", addressing the TG-166 QA recommendation
 * that biological-model outputs carry uncertainty statements.
 *
 * References:
 *  - Li XA et al. AAPM TG-166. Med Phys. 2012;39(3):1386-1409.
 *  - Okunieff P et al. Int J Radiat Oncol Biol Phys. 1995;32(4):1047-1058.
 */

import type { DVHPoint } from "./radiobiology";

// ── Seeded PRNG (same generator as the property-test suite) ─────────────────
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via Box–Muller from a uniform source. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Uncertainty specifications ──────────────────────────────────────────────
export interface ParamCI {
  low: number;
  high: number;
}

export interface DoseResponseUncertainty {
  /** Published 95% CI for TD50/TCD50 (log-normal matched). */
  td50CI?: ParamCI;
  /** Published 95% CI for γ50 (truncated-normal matched). */
  gamma50CI?: ParamCI;
  /** Assumed relative CV when no published CI exists (defaults 0.10 / 0.25). */
  td50RelCv?: number;
  gamma50RelCv?: number;
}

export type UncertaintySource = "published" | "assumed" | "mixed";

export interface UncertaintyBand {
  /** Deterministic point estimate (the reported value). */
  point: number;
  mean: number;
  p025: number;
  p975: number;
  nSamples: number;
  seed: number;
  source: UncertaintySource;
}

const DEFAULT_TD50_CV = 0.1;
const DEFAULT_GAMMA50_CV = 0.25;

/** Resolve spec provenance for reporting. */
export function uncertaintySource(spec: DoseResponseUncertainty): UncertaintySource {
  const t = spec.td50CI != null;
  const g = spec.gamma50CI != null;
  return t && g ? "published" : t || g ? "mixed" : "assumed";
}

/**
 * Sample a parameter value given an optional published CI and an assumed CV.
 * CI-matched sampling: normal with μ = midpoint, σ = (high−low)/3.92 for
 * slopes (truncated at >0); log-normal with matched log-moments for doses.
 */
function sampleParam(
  rand: () => number,
  point: number,
  ci: ParamCI | undefined,
  relCv: number,
  logNormal: boolean,
): number {
  if (ci && ci.high > ci.low && ci.low > 0) {
    if (logNormal) {
      const muL = (Math.log(ci.low) + Math.log(ci.high)) / 2;
      const sigmaL = (Math.log(ci.high) - Math.log(ci.low)) / 3.92;
      return Math.exp(muL + sigmaL * gaussian(rand));
    }
    const mu = (ci.low + ci.high) / 2;
    const sigma = (ci.high - ci.low) / 3.92;
    return Math.max(1e-6, mu + sigma * gaussian(rand));
  }
  // Assumed relative uncertainty around the point estimate.
  const sigma = Math.max(1e-9, point * relCv);
  if (logNormal) {
    const sigmaL = Math.sqrt(Math.log(1 + relCv * relCv));
    const muL = Math.log(point) - (sigmaL * sigmaL) / 2;
    return Math.exp(muL + sigmaL * gaussian(rand));
  }
  return Math.max(1e-6, point + sigma * gaussian(rand));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length)),
  );
  return sorted[idx];
}

/**
 * Monte-Carlo 95% band for the LKB logistic dose–response
 *   P(D) = 1 / (1 + (TD50/D)^(4γ50))
 * evaluated at dose D (gEUD for NTCP; EUD for the logistic-form TCP).
 */
export function logisticResponseWithUncertainty(
  doseGy: number,
  td50: number,
  gamma50: number,
  spec: DoseResponseUncertainty = {},
  opts: { nSamples?: number; seed?: number } = {},
): UncertaintyBand {
  const nSamples = opts.nSamples ?? 2000;
  const seed = opts.seed ?? 20260822;
  const rand = mulberry32(seed);
  const td50Cv = spec.td50RelCv ?? DEFAULT_TD50_CV;
  const g50Cv = spec.gamma50RelCv ?? DEFAULT_GAMMA50_CV;

  const point =
    doseGy <= 0 ? 0 : 1 / (1 + Math.pow(td50 / doseGy, 4 * gamma50));

  const samples: number[] = new Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    const td = sampleParam(rand, td50, spec.td50CI, td50Cv, true);
    const g = sampleParam(rand, gamma50, spec.gamma50CI, g50Cv, false);
    samples[i] = doseGy <= 0 ? 0 : 1 / (1 + Math.pow(td / doseGy, 4 * g));
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / nSamples;

  return {
    point: Math.min(1, Math.max(0, point)),
    mean: Math.min(1, Math.max(0, mean)),
    p025: percentile(samples, 2.5),
    p975: percentile(samples, 97.5),
    nSamples,
    seed,
    source: uncertaintySource(spec),
  };
}

/**
 * Delta-method analytic SD of the logistic response wrt TD50 and γ50
 * uncertainty — cross-check for the Monte-Carlo implementation.
 *   P = 1/(1+R), R = (TD50/D)^(4γ)
 *   ∂P/∂TD50 = −P²·R·(4γ/TD50);  ∂P/∂γ = −P²·R·4·ln(TD50/D)
 */
export function logisticResponseDeltaSd(
  doseGy: number,
  td50: number,
  gamma50: number,
  spec: DoseResponseUncertainty = {},
): number {
  if (doseGy <= 0 || td50 <= 0 || gamma50 <= 0) return 0;
  const R = Math.pow(td50 / doseGy, 4 * gamma50);
  const P = 1 / (1 + R);
  const dTd = -P * P * R * ((4 * gamma50) / td50);
  const dG = -P * P * R * 4 * Math.log(td50 / doseGy);

  const sdTd = spec.td50CI
    ? (spec.td50CI.high - spec.td50CI.low) / 3.92
    : td50 * (spec.td50RelCv ?? DEFAULT_TD50_CV);
  const sdG = spec.gamma50CI
    ? (spec.gamma50CI.high - spec.gamma50CI.low) / 3.92
    : gamma50 * (spec.gamma50RelCv ?? DEFAULT_GAMMA50_CV);

  return Math.sqrt(dTd * dTd * sdTd * sdTd + dG * dG * sdG * sdG);
}

// ── Organ/site specification tables ─────────────────────────────────────────
/**
 * Published 95% CIs (primary QUANTEC/organ literature; mirrored from
 * lib/parameter-library entries — TD50 only; slope CIs there are probit-m,
 * not logistic-γ50, so γ50 uncertainty is the labelled assumed component).
 */
export const PUBLISHED_NTCP_CI: Record<string, DoseResponseUncertainty> = {
  Parotid: { td50CI: { low: 26.3, high: 30.5 } },
  "Spinal Cord": { td50CI: { low: 60.0, high: 72.0 } },
  Lung: { td50CI: { low: 20.0, high: 30.0 } },
};

/** NTCP 95% band for an OAR at its (possibly EQD2-corrected) gEUD. */
export function ntcpWithUncertainty(
  gEUD: number,
  td50: number,
  gamma50: number,
  literatureOrgan: string | null,
  opts?: { nSamples?: number; seed?: number },
): UncertaintyBand {
  const spec = (literatureOrgan && PUBLISHED_NTCP_CI[literatureOrgan]) || {};
  return logisticResponseWithUncertainty(gEUD, td50, gamma50, spec, opts);
}

/** TCP 95% band for the logistic-form TCP at the target EUD. */
export function tcpWithUncertainty(
  eudGy: number,
  tcd50: number,
  gamma50: number,
  opts?: { nSamples?: number; seed?: number },
): UncertaintyBand {
  // No published TCD50/γ50 CIs in the shipped site tables: assumed, labelled.
  return logisticResponseWithUncertainty(eudGy, tcd50, gamma50, {}, opts);
}

/** Dose sweep with bands — feeds the dose–response chart CI overlay. */
export function logisticSweepWithUncertainty(
  dosesGy: number[],
  td50: number,
  gamma50: number,
  spec: DoseResponseUncertainty = {},
  opts?: { nSamples?: number; seed?: number },
): { doseGy: number; band: UncertaintyBand }[] {
  return dosesGy.map((doseGy, i) => ({
    doseGy,
    band: logisticResponseWithUncertainty(doseGy, td50, gamma50, spec, {
      ...opts,
      seed: (opts?.seed ?? 20260822) + i,
    }),
  }));
}

export type { DVHPoint };
