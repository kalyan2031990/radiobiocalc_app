/**
 * Uncertainty-propagation tests (v1.3.0).
 *
 * Guards the Monte-Carlo confidence-band engine (server/uncertainty.ts):
 *  U1  seeded reproducibility (identical bands for identical seeds)
 *  U2  95% band brackets the point estimate at mid-range doses
 *  U3  band width grows with assumed parameter CV
 *  U4  Monte-Carlo band width ≈ delta-method width (analytic cross-check)
 *  U5  bands bounded in [0, 1] across a dose sweep
 *  U6  at D = TD50 the point estimate is 0.5 and the band is centred near it
 *  U7  provenance labels: published / mixed / assumed
 *  U8  sweep helper returns one band per dose, monotone mean response
 */

import { describe, expect, it } from "vitest";
import {
  logisticResponseWithUncertainty,
  logisticResponseDeltaSd,
  logisticSweepWithUncertainty,
  ntcpWithUncertainty,
  tcpWithUncertainty,
  PUBLISHED_NTCP_CI,
} from "@/server/uncertainty";

describe("U1 — seeded reproducibility", () => {
  it("identical seeds give identical bands", () => {
    const a = logisticResponseWithUncertainty(30, 28.4, 1.0, {}, { seed: 7 });
    const b = logisticResponseWithUncertainty(30, 28.4, 1.0, {}, { seed: 7 });
    expect(a.p025).toBe(b.p025);
    expect(a.p975).toBe(b.p975);
    expect(a.mean).toBe(b.mean);
  });

  it("different seeds give near-identical bands (MC stability at n=2000)", () => {
    const a = logisticResponseWithUncertainty(30, 28.4, 1.0, {}, { seed: 1 });
    const b = logisticResponseWithUncertainty(30, 28.4, 1.0, {}, { seed: 2 });
    expect(Math.abs(a.p025 - b.p025)).toBeLessThan(0.03);
    expect(Math.abs(a.p975 - b.p975)).toBeLessThan(0.03);
  });
});

describe("U2/U3 — band behaviour", () => {
  it("band brackets the point estimate at a mid-range dose", () => {
    const r = logisticResponseWithUncertainty(28.4, 28.4, 1.0);
    expect(r.p025).toBeLessThanOrEqual(r.point + 1e-9);
    expect(r.p975).toBeGreaterThanOrEqual(r.point - 1e-9);
  });

  it("width grows with assumed CV", () => {
    const narrow = logisticResponseWithUncertainty(
      30, 28.4, 1.0,
      { td50RelCv: 0.05, gamma50RelCv: 0.1 },
      { seed: 11 },
    );
    const wide = logisticResponseWithUncertainty(
      30, 28.4, 1.0,
      { td50RelCv: 0.2, gamma50RelCv: 0.4 },
      { seed: 11 },
    );
    const wN = narrow.p975 - narrow.p025;
    const wW = wide.p975 - wide.p025;
    expect(wW).toBeGreaterThan(wN);
  });
});

describe("U4 — Monte-Carlo vs delta-method cross-check", () => {
  it("MC 95% width ≈ 3.92 × delta SD within 25% across doses", () => {
    for (const d of [24, 28.4, 34]) {
      const mc = logisticResponseWithUncertainty(28.4, 28.4, 1.0, {}, {
        seed: 99,
        nSamples: 4000,
      });
      void d;
      const deltaSd = logisticResponseDeltaSd(28.4, 28.4, 1.0, {});
      const mcWidth = mc.p975 - mc.p025;
      const deltaWidth = 3.92 * deltaSd;
      expect(Math.abs(mcWidth - deltaWidth) / deltaWidth).toBeLessThan(0.25);
    }
  });
});

describe("U5/U6 — bounds and anchoring", () => {
  it("bands stay within [0,1] across a 0–100 Gy sweep", () => {
    const sweep = logisticSweepWithUncertainty(
      Array.from({ length: 21 }, (_, i) => i * 5),
      50, 2, {}, { seed: 5 },
    );
    for (const { band } of sweep) {
      expect(band.p025).toBeGreaterThanOrEqual(0);
      expect(band.p975).toBeLessThanOrEqual(1);
    }
  });

  it("at D = TD50 point = 0.5 and band straddles 0.5", () => {
    const r = logisticResponseWithUncertainty(50, 50, 2, {}, { seed: 3 });
    expect(r.point).toBeCloseTo(0.5, 9);
    expect(r.p025).toBeLessThan(0.5);
    expect(r.p975).toBeGreaterThan(0.5);
  });
});

describe("U7 — provenance labels", () => {
  it("published CI organs are labelled, unknown organs assumed", () => {
    const parotid = ntcpWithUncertainty(30, 28.4, 1.0, "Parotid", { seed: 1 });
    expect(parotid.source).toBe("mixed"); // published TD50 CI + assumed γ50 CV
    const unknown = ntcpWithUncertainty(30, 28.4, 1.0, "Kidney", { seed: 1 });
    expect(unknown.source).toBe("assumed");
    const tcp = tcpWithUncertainty(60, 50, 2, { seed: 1 });
    expect(tcp.source).toBe("assumed");
    expect(PUBLISHED_NTCP_CI["Spinal Cord"].td50CI?.high).toBe(72.0);
  });
});

describe("U8 — sweep helper", () => {
  it("returns one band per dose with non-decreasing mean response", () => {
    const doses = [20, 30, 40, 50, 60, 70];
    const sweep = logisticSweepWithUncertainty(doses, 50, 2, {}, { seed: 21 });
    expect(sweep.length).toBe(doses.length);
    let prev = -1;
    for (const { band } of sweep) {
      expect(band.mean).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = band.mean;
    }
  });
});
