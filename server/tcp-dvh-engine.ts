/**
 * DVH-based TCP helpers and extended physical dose metrics.
 * Poisson-LQ N_eff: engine/radiobiology/poisson_tcp.py
 */

import type { DVHPoint } from "./radiobiology";
import type { TCPSiteParams } from "./tcp-site-params";
import { n0ForTarget } from "./tcp-site-params";
import { treatmentTimeDays } from "./techniques";

export interface ExtendedDoseMetrics {
  meanDose: number;
  maxDose: number;
  minDose: number;
  totalVolume: number;
  d95: number;
  d98: number;
  d50: number;
  d2: number;
  v95: number;
  v100: number;
  v107: number;
}

function toVolumeFractions(dvh: DVHPoint[]): { dose: number; volFrac: number }[] {
  const tv = Math.max(...dvh.map((p) => p.volume), 1e-9);
  return dvh.map((p) => ({ dose: p.dose, volFrac: p.volume / tv }));
}

export function computeExtendedPhysicalMetrics(
  dvh: DVHPoint[]
): ExtendedDoseMetrics {
  if (dvh.length === 0) {
    return {
      meanDose: 0,
      maxDose: 0,
      minDose: 0,
      totalVolume: 0,
      d95: 0,
      d98: 0,
      d50: 0,
      d2: 0,
      v95: 0,
      v100: 0,
      v107: 0,
    };
  }

  const sorted = [...dvh].sort((a, b) => a.dose - b.dose);
  const tv = Math.max(...sorted.map((p) => p.volume));
  const doses = sorted.map((p) => p.dose);
  const relV = sorted.map((p) => p.volume / tv);

  const meanDose = relV.reduce((s, v, i) => s + v * doses[i], 0);
  const maxDose = Math.max(...doses);
  const minDose = Math.min(...doses.filter((d) => d > 0), maxDose);

  const dPercentile = (pct: number) => {
    const target = pct / 100;
    let cum = 0;
    for (let i = 0; i < sorted.length; i++) {
      cum += relV[i];
      if (cum >= target) return doses[i];
    }
    return doses[doses.length - 1];
  };

  const volAtLeast = (doseGy: number) => {
    for (const p of sorted) {
      if (p.dose >= doseGy) return (p.volume / tv) * 100;
    }
    return 0;
  };

  const rx = maxDose;
  return {
    meanDose,
    maxDose,
    minDose,
    totalVolume: tv,
    d95: dPercentile(95),
    d98: dPercentile(98),
    d50: dPercentile(50),
    d2: dPercentile(2),
    v95: volAtLeast(0.95 * rx),
    v100: volAtLeast(rx),
    v107: volAtLeast(1.07 * rx),
  };
}

/** LQ survival per fraction at dose d (Gy/fx). */
export function survivalFractionPerFx(
  dosePerFractionGy: number,
  alpha: number,
  beta: number
): number {
  if (dosePerFractionGy <= 0) return 1;
  return Math.exp(-alpha * dosePerFractionGy - beta * dosePerFractionGy * dosePerFractionGy);
}

function repopFactor(site: TCPSiteParams, treatmentDays: number): number {
  if (!site.repopulationRelevant || site.tkDays == null) return 1;
  const repopDays = Math.max(0, treatmentDays - site.tkDays);
  return Math.exp((Math.log(2) * repopDays) / site.tpotDays);
}

export function computeNEffFromDvh(
  dvhDiff: DVHPoint[],
  numFractions: number,
  site: TCPSiteParams,
  targetType: string,
  lqMaxDpf: number
): { nEff: number; sfWeighted: number; repop: number } {
  const alpha = site.alphaGyInv;
  const beta = site.betaGyInv2;
  const n0 = n0ForTarget(site, targetType);
  const tv = dvhDiff.reduce((s, p) => s + p.volume, 0);
  if (tv <= 0) return { nEff: 0, sfWeighted: 0, repop: 1 };

  const dpfFallback =
    dvhDiff.reduce((s, p) => s + p.dose * p.volume, 0) / tv / Math.max(numFractions, 1);
  const treatmentDays = treatmentTimeDays(numFractions, dpfFallback);
  const repop = repopFactor(site, treatmentDays);

  let nEff = 0;
  let sfWeighted = 0;
  for (const p of dvhDiff) {
    const volFrac = p.volume / tv;
    const dpf = p.dose / Math.max(numFractions, 1);
    const useUsc = dpf > lqMaxDpf;
    let sfFrac = survivalFractionPerFx(
      Math.min(dpf, useUsc ? lqMaxDpf : dpf),
      alpha,
      beta
    );
    if (useUsc && dpf > lqMaxDpf) {
      const sfCap = survivalFractionPerFx(lqMaxDpf, alpha, beta);
      const extra = Math.exp(-alpha * (dpf - lqMaxDpf));
      sfFrac = sfCap * extra;
    }
    const sfTotal = Math.pow(sfFrac, numFractions);
    nEff += n0 * volFrac * sfTotal;
    sfWeighted += volFrac * sfTotal;
  }
  return { nEff: nEff * repop, sfWeighted, repop };
}

export function computePoissonTcpFromDvh(
  dvhDiff: DVHPoint[],
  numFractions: number,
  site: TCPSiteParams,
  targetType: string,
  lqMaxDpf: number
): number {
  const { nEff } = computeNEffFromDvh(
    dvhDiff,
    numFractions,
    site,
    targetType,
    lqMaxDpf
  );
  if (nEff <= 0 || !Number.isFinite(nEff)) return 0;
  return Math.max(0, Math.min(1, Math.exp(-nEff)));
}
