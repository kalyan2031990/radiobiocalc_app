import { describe, it, expect } from "vitest";
import { computeTherapeuticWindow } from "../lib/therapeutic-window";

/** Single UTCP path — no legacy duplicate in this repo. */
describe("therapeutic window / UTCP consistency", () => {
  it("UTCP equals TCP × Π(1−NTCP_k) and matches CFTC product form", () => {
    const oars = [
      { structureName: "Parotid_L", literatureOrgan: "Parotid", ntcp: 0.25, riskWeight: 0.3 },
      { structureName: "Cord", literatureOrgan: "Spinal Cord", ntcp: 0.05, riskWeight: 1 },
    ];
    const tw = computeTherapeuticWindow(0.82, "lkb_loglogit", "PTV", oars);
    const product = 0.82 * (1 - 0.25) * (1 - 0.05);
    expect(tw.utcp).toBeCloseTo(product, 8);
    expect(tw.cftc).toBeCloseTo(tw.utcp, 8);
    expect(tw.pPlus).toBeCloseTo(0.82 - 0.05, 8);
  });

  it("empty OAR list: UTCP equals TCP", () => {
    const tw = computeTherapeuticWindow(0.9, "poisson", "PTV", []);
    expect(tw.utcp).toBeCloseTo(0.9, 8);
    expect(tw.ntcpComposite).toBe(0);
    expect(tw.tcpRaw).toBeCloseTo(0.9, 8);
  });

  it("caps display TCP at 95% when model saturates", () => {
    const tw = computeTherapeuticWindow(1.0, "poisson_dvh", "PTV", []);
    expect(tw.tcp).toBeCloseTo(0.95, 8);
    expect(tw.tcpRaw).toBeCloseTo(1, 8);
    expect(tw.tcpCapped).toBe(true);
    expect(tw.utcp).toBeCloseTo(1.0, 8);
  });
});
