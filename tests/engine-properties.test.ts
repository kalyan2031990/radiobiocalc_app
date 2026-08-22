/**
 * ST-2 — Property-based / metamorphic engine tests (v1.2.0).
 *
 * Deterministic (seeded PRNG) property tests over the radiobiology engine.
 * These guard the v1.2.0 science fixes (S1–S6) and lock in fundamental
 * mathematical invariants that must hold for ANY valid input:
 *
 *  P1  Poisson TCP is monotone non-decreasing in dose        (guards S1)
 *  P2  Poisson TCP(TCD50) = 0.5; slope consistent with γ50   (guards S1)
 *  P3  Poisson NTCP(D50) = 0.5 for any γ; monotone; NTCP(0)=0 (guards S2)
 *  P4  LKB logistic NTCP(TD50) = 0.5; monotone                (anchor)
 *  P5  gEUD of a uniform-dose DVH = that dose, for all a      (identity)
 *  P6  gEUD(a=1) = arithmetic mean dose                       (identity)
 *  P7  BED/EQD2 identity: EQD2 = BED / (1 + 2/(α/β))          (identity)
 *  P8  Dxx/Vxx on a constructed differential DVH = analytic   (guards S4)
 *  P9  Differential-path metrics == cumulative-path metrics   (guards S4)
 *  P10 OAR results carry no V95/V100/V107 coverage indices    (guards S5)
 *  P11 EUD equals gEUD (organ volume parameter)               (guards S3)
 *  P12 LQL table: EQD2 = BED/(1+2/(α/β)) on the SAME BED      (guards S6)
 *  P13 LQL BED ≤ LQ BED above the transition dose             (sanity)
 *  P14 All probabilities bounded in [0, 1] over random DVHs   (robustness)
 *  P15 Poisson LQ-DVH TCP monotone in uniform-dose scaling    (default path)
 *
 * Seeded RNG (mulberry32) keeps the suite byte-reproducible for archiving.
 */

import { describe, expect, it } from "vitest";
import {
  calculateBED,
  calculateEQD2,
  calculateGEUD,
  calculateEUD,
  calculateNTCP_LKB_LogLogit,
  calculateNTCP_Poisson,
  calculateTCP_Poisson,
  calculateDoseMetrics,
  calculateDoseMetricsFromCumulative,
  performCalculation,
  type DVHPoint,
} from "@/server/radiobiology";
import { computePoissonTcpFromDvh } from "@/server/tcp-dvh-engine";
import type { TCPSiteParams } from "@/server/tcp-site-params";
import {
  computeEquivalenceRow,
  PRESET_SCHEDULES,
} from "@/lib/fractionation-equivalence";

// ── seeded PRNG (mulberry32) ────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random monotone-decreasing cumulative DVH, sorted by ascending dose. */
function randomCumulativeDvh(rand: () => number, bins = 40): DVHPoint[] {
  const maxDose = 20 + rand() * 60;
  let v = 0.8 + rand() * 0.2;
  const pts: DVHPoint[] = [];
  for (let i = 0; i <= bins; i++) {
    pts.push({ dose: (maxDose * i) / bins, volume: v });
    v *= 0.85 + rand() * 0.14; // non-increasing
  }
  return pts;
}

const HN_SITE: TCPSiteParams = {
  site: "HN_TEST",
  alphaGyInv: 0.3,
  betaGyInv2: 0.03,
  alphaBetaGy: 10,
  n0Gtv: 1e7,
  n0Ctv: 1e6,
  tpotDays: 3,
  tkDays: 28,
  tcd50Gy: 50,
  gamma50: 2,
  geudA: -10,
  lqValidMaxDpfGy: 10,
  repopulationRelevant: true,
  notes: "test fixture",
};

describe("P1/P2 — generic Poisson TCP (S1 guard)", () => {
  it("is monotone non-decreasing in dose over a wide sweep", () => {
    let prev = -1;
    for (let d = 1; d <= 120; d += 1) {
      const tcp = calculateTCP_Poisson(d, 50, 2);
      expect(tcp).toBeGreaterThanOrEqual(prev);
      expect(tcp).toBeGreaterThanOrEqual(0);
      expect(tcp).toBeLessThanOrEqual(1);
      prev = tcp;
    }
  });

  it("TCP(TCD50) = 0.5 for several γ50 values", () => {
    for (const g of [1, 2, 3, 4]) {
      expect(calculateTCP_Poisson(50, 50, g)).toBeCloseTo(0.5, 6);
    }
  });

  it("tends to 0 at very low dose and to 1 at high dose", () => {
    expect(calculateTCP_Poisson(0.5, 50, 2)).toBeLessThan(0.01);
    expect(calculateTCP_Poisson(140, 50, 2)).toBeGreaterThan(0.99);
  });

  it("explicit clonogen override rescales the curve", () => {
    const base = calculateTCP_Poisson(45, 50, 2);
    const more = calculateTCP_Poisson(45, 50, 2, 1e12);
    const fewer = calculateTCP_Poisson(45, 50, 2, 1);
    expect(more).toBeLessThan(base);
    expect(fewer).toBeGreaterThan(base);
  });
});

describe("P3 — generic Poisson NTCP (S2 guard)", () => {
  it("NTCP(D50) = 0.5 for any γ (ln2-normalized)", () => {
    for (const g of [0.7, 1.2, 1.9, 3.5]) {
      expect(calculateNTCP_Poisson(60, 60, g, 4)).toBeCloseTo(0.5, 6);
    }
  });

  it("is monotone non-decreasing and NTCP(0) = 0", () => {
    let prev = -1;
    for (let d = 0; d <= 100; d += 2) {
      const n = calculateNTCP_Poisson(d, 60, 1.9, 4);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(calculateNTCP_Poisson(0, 60, 1.9, 4)).toBe(0);
  });
});

describe("P4 — LKB logistic anchor", () => {
  it("NTCP(TD50) = 0.5", () => {
    expect(calculateNTCP_LKB_LogLogit(28.4, 28.4, 1.0)).toBeCloseTo(0.5, 9);
  });

  it("is monotone non-decreasing in gEUD", () => {
    let prev = -1;
    for (let d = 1; d <= 60; d += 1) {
      const n = calculateNTCP_LKB_LogLogit(d, 28.4, 1.0);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});

describe("P5/P6 — gEUD identities", () => {
  const uniform: DVHPoint[] = [
    { dose: 40, volume: 0.5 },
    { dose: 40, volume: 0.5 },
  ];

  it("uniform-dose DVH returns that dose for several a", () => {
    for (const a of [-5, -1, 0.5, 1, 2, 10]) {
      expect(calculateGEUD(uniform, a)).toBeCloseTo(40, 6);
    }
  });

  it("a = 1 equals the arithmetic mean dose", () => {
    const dvh: DVHPoint[] = [
      { dose: 10, volume: 1 },
      { dose: 30, volume: 1 },
      { dose: 50, volume: 2 },
    ];
    expect(calculateGEUD(dvh, 1)).toBeCloseTo((10 + 30 + 100) / 4, 9);
  });
});

describe("P7 — BED/EQD2 identity", () => {
  it("EQD2 = BED / (1 + 2/(α/β)) across randomized schedules", () => {
    const rand = mulberry32(20260820);
    for (let i = 0; i < 200; i++) {
      const total = 20 + rand() * 60;
      const fx = 1 + Math.floor(rand() * 39);
      const ab = 1 + rand() * 19;
      const bed = calculateBED(total, fx, ab);
      const eqd2 = calculateEQD2(total, fx, ab);
      expect(eqd2).toBeCloseTo(bed / (1 + 2 / ab), 6);
    }
  });
});

describe("P8/P9 — Dxx/Vxx correctness on the differential path (S4 guard)", () => {
  // Constructed differential DVH: 25% of volume at 20 Gy, 50% at 40 Gy, 25% at 60 Gy
  const diff: DVHPoint[] = [
    { dose: 20, volume: 25 },
    { dose: 40, volume: 50 },
    { dose: 60, volume: 25 },
  ];

  it("Dxx matches the engine's cumulative-interpolation convention", () => {
    // Cumulative form {(20,100),(40,75),(60,25)} with linear interpolation:
    // D98 = 21.6, D95 = 24, D50 = 50, D2 = 60 (dose received by xx% of volume)
    const m = calculateDoseMetrics(diff);
    expect(m.dxx[50]).toBeCloseTo(50, 6);
    expect(m.dxx[95]).toBeCloseTo(24, 6);
    expect(m.dxx[2]).toBeCloseTo(60, 6);
    expect(m.dxx[98]).toBeCloseTo(21.6, 6);
  });

  it("Vxx matches analytic values", () => {
    const m = calculateDoseMetrics(diff);
    expect(m.vxx[20]).toBeCloseTo(100, 6);
    expect(m.vxx[40]).toBeCloseTo(75, 6);
    expect(m.vxx[60]).toBeCloseTo(25, 6);
  });

  it("mean dose is exact on the differential path", () => {
    const m = calculateDoseMetrics(diff);
    expect(m.meanDose).toBeCloseTo(40, 9);
  });

  it("differential and cumulative paths agree on the same physical DVH", () => {
    // Uniform dose distribution 0–60 Gy on a fine 1.2-Gy grid: analytic mean
    // and median are both 30 Gy; the two discretization conventions
    // (shell upper-edge vs trapezoidal midpoint) converge within a bin width.
    const bins = 120;
    const w = 60 / bins;
    const fineCum: DVHPoint[] = [];
    const fineDiff: DVHPoint[] = [];
    for (let k = 0; k <= bins; k++) {
      fineCum.push({ dose: k * w, volume: 100 * (1 - (k * w) / 60) });
    }
    for (let k = 1; k <= bins; k++) {
      fineDiff.push({ dose: k * w, volume: 100 * (w / 60) });
    }
    const md = calculateDoseMetrics(fineDiff);
    const mc = calculateDoseMetricsFromCumulative(fineCum);
    expect(Math.abs(md.meanDose - 30)).toBeLessThan(0.6);
    expect(Math.abs(md.meanDose - mc.meanDose)).toBeLessThan(0.6);
    expect(Math.abs(md.dxx[50]! - 30)).toBeLessThan(0.6);
    expect(Math.abs(mc.dxx[50]! - 30)).toBeLessThan(0.6);
    expect(md.maxDose).toBeCloseTo(mc.maxDose, 3);
  });
});

describe("P10/P11 — composite-level guards (S5, S3)", () => {
  const oarDvh: DVHPoint[] = [
    { dose: 5, volume: 30 },
    { dose: 15, volume: 40 },
    { dose: 25, volume: 30 },
  ];
  const oarParams = {
    td50: 28.4, gamma50: 1.0, m: 0.25, n: 0.45, alphaBeta: 3,
    d50: 26.3, gamma: 0.73, s: 0.01,
  };

  it("OAR results suppress V95/V100/V107", () => {
    const res = performCalculation(
      {
        dvh: oarDvh, totalDose: 60, numFractions: 30,
        organ: "Parotid", structureType: "oar", model: "lkb_loglogit",
      },
      oarParams
    );
    expect(res.doseMetrics.v95).toBeUndefined();
    expect(res.doseMetrics.v100).toBeUndefined();
    expect(res.doseMetrics.v107).toBeUndefined();
  });

  it("target results keep V95/V100/V107 vs prescription", () => {
    const ptv: DVHPoint[] = [
      { dose: 62, volume: 10 },
      { dose: 66, volume: 80 },
      { dose: 70, volume: 10 },
    ];
    const res = performCalculation(
      {
        dvh: ptv, totalDose: 66, numFractions: 33,
        organ: "PTV", structureType: "target", model: "lkb_loglogit",
        prescriptionGy: 66,
      },
      { ...oarParams, alphaBeta: 10 }
    );
    // Cumulative form {(62,100),(66,90),(70,10)}; thresholds vs Rx 66 Gy:
    // V100 = 90% (at 66 Gy); V95 (62.7 Gy) = 100 − 0.175×10 = 98.25%; V107 = 0
    expect(res.doseMetrics.v100).toBeCloseTo(90, 6);
    expect(res.doseMetrics.v95).toBeCloseTo(98.25, 6);
    expect(res.doseMetrics.v107).toBeCloseTo(0, 6);
  });

  it("EUD equals gEUD with the organ volume parameter", () => {
    const res = performCalculation(
      {
        dvh: oarDvh, totalDose: 60, numFractions: 30,
        organ: "Parotid", structureType: "oar", model: "lkb_loglogit",
        geudExponent: 8,
      },
      oarParams
    );
    expect(res.doseMetrics.eud).toBeCloseTo(res.doseMetrics.gEUD, 9);
    expect(res.doseMetrics.gEUD).toBeCloseTo(
      calculateEUD(oarDvh, 8),
      9
    );
  });
});

describe("P12/P13 — fractionation table LQL consistency (S6 guard)", () => {
  const sbrt = PRESET_SCHEDULES.find((s) => s.id === "sbrt-54-3")!;

  it("EQD2 derives from the displayed BED (identity holds with and without LQL)", () => {
    for (const useLqlDamping of [false, true]) {
      const row = computeEquivalenceRow(sbrt, { useLqlDamping });
      expect(row.eqd2Tumor).toBeCloseTo(row.bedTumor / (1 + 2 / 10), 6);
      expect(row.eqd2Late).toBeCloseTo(row.bedLate / (1 + 2 / 3), 6);
    }
  });

  it("LQL-damped BED does not exceed LQ BED above the transition dose", () => {
    const lq = computeEquivalenceRow(sbrt, { useLqlDamping: false });
    const lql = computeEquivalenceRow(sbrt, { useLqlDamping: true });
    expect(lql.lqlApplied).toBe(true);
    expect(lql.bedTumor).toBeLessThanOrEqual(lq.bedTumor + 1e-9);
  });

  it("below the transition dose, LQL mode reduces to plain LQ", () => {
    const conv = PRESET_SCHEDULES.find((s) => s.id === "conv-70-35")!;
    const lq = computeEquivalenceRow(conv, { useLqlDamping: false });
    const lql = computeEquivalenceRow(conv, { useLqlDamping: true });
    expect(lql.lqlApplied).toBe(false);
    expect(lql.bedTumor).toBeCloseTo(lq.bedTumor, 9);
  });
});

describe("P14 — robustness over randomized DVHs (seeded)", () => {
  it("all probabilities stay in [0,1] and metrics finite over 200 random DVHs", () => {
    const rand = mulberry32(42);
    const params = {
      td50: 44, gamma50: 1.0, m: 0.2, n: 1.0, alphaBeta: 3,
      d50: 40, gamma: 1.2, s: 0.12,
    };
    for (let i = 0; i < 200; i++) {
      const dvh = randomCumulativeDvh(rand);
      const res = performCalculation(
        {
          dvh, totalDose: 40 + rand() * 32, numFractions: 5 + Math.floor(rand() * 33),
          organ: "Larynx", structureType: "oar", model: "lkb_loglogit",
        },
        params
      );
      if (res.ntcp != null) {
        expect(res.ntcp).toBeGreaterThanOrEqual(0);
        expect(res.ntcp).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(res.doseMetrics.meanDose)).toBe(true);
      expect(res.bed).toBeGreaterThan(0);
      expect(res.eqd2).toBeGreaterThan(0);
    }
  });
});

describe("P15 — default Poisson LQ-DVH TCP sanity", () => {
  it("monotone non-decreasing under uniform-dose scaling", () => {
    let prev = -1;
    for (let d = 20; d <= 80; d += 5) {
      const uniform: DVHPoint[] = [{ dose: d, volume: 100 }];
      const tcp = computePoissonTcpFromDvh(uniform, 30, HN_SITE, "PTV", 10);
      expect(tcp).toBeGreaterThanOrEqual(prev);
      prev = tcp;
    }
    expect(prev).toBeGreaterThan(0.9); // high uniform dose → high TCP
  });
});
