/**
 * Manuscript exploratory covariate adjustment for TCP/NTCP (log-odds scale).
 * Coefficients are transparent priors for research export — not validated MV regression.
 */

import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";

export type CovariateAdjustment = {
  baseTcp?: number;
  baseNtcp?: number;
  adjustedTcp?: number;
  adjustedNtcp?: number;
  tcpFactor: number;
  ntcpFactor: number;
  tcpLogOddsDelta: number;
  ntcpLogOddsDelta: number;
  factorsApplied: string[];
  modelNote: string;
};

function clamp01(p: number): number {
  return Math.min(0.9999, Math.max(0.0001, p));
}

function logit(p: number): number {
  const c = clamp01(p);
  return Math.log(c / (1 - c));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function hasChemo(r: ClinicalRecord): boolean {
  const c = String(r.chemo ?? "").toLowerCase();
  return c !== "" && c !== "none" && c !== "no";
}

function isSmoker(r: ClinicalRecord): boolean {
  const s = String(r.smoking ?? "").toLowerCase();
  return s === "yes" || s === "current" || s === "former";
}

export function applyManuscriptCovariates(
  baseTcp: number | undefined,
  baseNtcp: number | undefined,
  clinical: ClinicalRecord,
  literatureOrgan: string | null,
): CovariateAdjustment {
  const factorsApplied: string[] = [];
  let tcpLogDelta = 0;
  let ntcpLogDelta = 0;

  const ageDecade = (clinical.age - 60) / 10;
  if (Math.abs(ageDecade) > 0.01) {
    tcpLogDelta += -0.08 * ageDecade;
    ntcpLogDelta += 0.12 * ageDecade;
    factorsApplied.push(`age=${clinical.age}`);
  }

  if (clinical.sex === "F") {
    tcpLogDelta += 0.05;
    factorsApplied.push("sex=F");
  } else if (clinical.sex === "M") {
    factorsApplied.push("sex=M");
  }

  if (hasChemo(clinical)) {
    tcpLogDelta += 0.15;
    ntcpLogDelta += 0.1;
    factorsApplied.push(`chemo=${clinical.chemo}`);
  }

  if (isSmoker(clinical)) {
    ntcpLogDelta += 0.18;
    factorsApplied.push("smoking=yes");
  }

  if (clinical.ecog != null && clinical.ecog >= 2) {
    tcpLogDelta += -0.12;
    ntcpLogDelta += 0.08;
    factorsApplied.push(`ecog=${clinical.ecog}`);
  }

  const organ = literatureOrgan ?? clinical.organ;
  if (/parotid/i.test(organ)) {
    ntcpLogDelta += 0.05 * (clinical.totalDoseGy - 66) / 10;
    factorsApplied.push("parotid_dose_slope");
  }
  if (/larynx/i.test(organ)) {
    ntcpLogDelta += 0.04 * (clinical.totalDoseGy - 66) / 10;
    factorsApplied.push("larynx_dose_slope");
  }

  let adjustedTcp = baseTcp;
  if (baseTcp != null && Number.isFinite(baseTcp)) {
    adjustedTcp = sigmoid(logit(baseTcp) + tcpLogDelta);
  }

  let adjustedNtcp = baseNtcp;
  if (baseNtcp != null && Number.isFinite(baseNtcp)) {
    adjustedNtcp = sigmoid(logit(clamp01(baseNtcp)) + ntcpLogDelta);
  }

  const tcpFactor = baseTcp && adjustedTcp != null ? adjustedTcp / baseTcp : 1;
  const ntcpFactor =
    baseNtcp && adjustedNtcp != null && baseNtcp > 1e-12
      ? adjustedNtcp / baseNtcp
      : baseNtcp && baseNtcp <= 1e-12 && adjustedNtcp != null
        ? adjustedNtcp / 1e-6
        : 1;

  return {
    baseTcp,
    baseNtcp,
    adjustedTcp,
    adjustedNtcp,
    tcpFactor,
    ntcpFactor,
    tcpLogOddsDelta: tcpLogDelta,
    ntcpLogOddsDelta: ntcpLogDelta,
    factorsApplied,
    modelNote:
      "Exploratory log-odds covariate layer (age, sex, chemo, smoking, ECOG, dose) for manuscript export; not validated MV model.",
  };
}

/** True when TCP is at/near ceiling — covariate shift on TCP is not meaningful to display. */
export function tcpCovariateInactive(baseTcp: number | undefined): boolean {
  return baseTcp != null && baseTcp >= 0.995;
}

export function formatCovariateProbabilityLabel(
  kind: "tcp" | "ntcp",
  base: number | undefined,
  adjusted: number | undefined,
  adj: CovariateAdjustment,
): string {
  if (base == null || adjusted == null) return "—";
  const basePct = (base * 100).toFixed(1);
  const adjPct = (adjusted * 100).toFixed(1);
  if (adj.factorsApplied.length === 0) {
    return kind === "tcp" ? `TCP ${basePct}%` : `NTCP ${basePct}%`;
  }
  if (kind === "tcp" && tcpCovariateInactive(base)) {
    return `TCP ${basePct}% (covariates inactive at TCP ceiling; see NTCP adjustments)`;
  }
  if (Math.abs(adjusted - base) < 0.0005) {
    return kind === "tcp" ? `TCP ${basePct}%` : `NTCP ${basePct}%`;
  }
  return kind === "tcp"
    ? `TCP ${basePct}% → ${adjPct}%`
    : `NTCP ${basePct}% → ${adjPct}%`;
}

export function pearsonR(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i]! - mx;
    const b = y[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
}

export function spearmanR(x: number[], y: number[]): number | null {
  const rank = (arr: number[]) => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(arr.length);
    for (let j = 0; j < sorted.length; j++) {
      ranks[sorted[j]!.i] = j + 1;
    }
    return ranks;
  };
  return pearsonR(rank(x), rank(y));
}
