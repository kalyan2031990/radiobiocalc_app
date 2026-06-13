/**
 * Zaider–Minerbo stochastic TCP (Zaider & Minerbo, Int J Radiat Oncol Biol Phys 1995).
 * TCP = P0(t_obs)^N_eff  where P0 is single-cell extinction probability.
 *
 * NOTE: N_eff uses the Poisson repopulation DVH integral (common clinical approximation).
 * The full ZM model integrates the birth–death process during delivery; document this
 * when comparing to rigorous ZM or experimental data.
 * Ported from engine/radiobiology/zaider_minerbo.py
 */

import type { DVHPoint } from "./radiobiology";
import type { TCPSiteParams } from "./tcp-site-params";
import { computeNEffFromDvh, computeNEffFromCumulativeDvh } from "./tcp-dvh-engine";

export interface ZMResult {
  tcp: number;
  nEff: number;
  p0SingleCell: number;
  bRate: number;
  muRate: number;
  repopFactor: number;
  model: "Zaider-Minerbo";
}

export function p0SingleCellExtinction(
  tObsDays: number,
  b: number,
  mu: number
): number {
  if (tObsDays <= 0) return 0;
  if (mu > b) return 1;
  if (Math.abs(b - mu) < 1e-12) {
    return (b * tObsDays) / (1 + b * tObsDays);
  }
  const expTerm = Math.exp(-(b - mu) * tObsDays);
  const numerator = mu * (1 - expTerm);
  const denominator = b - mu * expTerm;
  if (Math.abs(denominator) < 1e-15) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

export function computeZaiderMinerboTcp(
  dvhDiff: DVHPoint[],
  numFractions: number,
  site: TCPSiteParams,
  targetType: string,
  lqMaxDpf: number,
  options?: { deadFraction?: number; tObsDays?: number }
): ZMResult {
  const deadFraction = options?.deadFraction ?? 0.85;
  const tObsDays = options?.tObsDays ?? 730;

  const b = Math.log(2) / site.tpotDays;
  const mu = b * deadFraction;
  const p0 = p0SingleCellExtinction(tObsDays, b, mu);

  const cumulative =
    dvhDiff.length >= 2 && dvhDiff[0].volume >= dvhDiff[dvhDiff.length - 1].volume - 1e-6;
  const { nEff, repop } = cumulative
    ? computeNEffFromCumulativeDvh(dvhDiff, numFractions, site, targetType, lqMaxDpf)
    : computeNEffFromDvh(dvhDiff, numFractions, site, targetType, lqMaxDpf);

  let tcp = 0;
  if (nEff > 0 && Number.isFinite(nEff) && Number.isFinite(p0)) {
    tcp = Math.max(0, Math.min(1, Math.pow(p0, nEff)));
  }

  return {
    tcp,
    nEff,
    p0SingleCell: p0,
    bRate: b,
    muRate: mu,
    repopFactor: repop,
    model: "Zaider-Minerbo",
  };
}
