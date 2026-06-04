import { describe, it, expect } from "vitest";
import { performCalculation, calculateDoseMetrics } from "./radiobiology";
import { getOrganParameters } from "./parameters";

describe("empty / invalid DVH", () => {
  it("suppresses NTCP when DVH has no volume", () => {
    const params = getOrganParameters("Parotid", "lkb_loglogit");
    expect(params).toBeTruthy();
    const res = performCalculation(
      {
        dvh: [],
        totalDose: 70,
        numFractions: 35,
        organ: "Parotid",
        structureType: "oar",
        model: "lkb_loglogit",
      },
      params!,
    );
    expect(res.ntcp).toBeUndefined();
    expect(Number.isNaN(res.doseMetrics.gEUD)).toBe(true);
  });
});

describe("differential DVH V20", () => {
  it("sums bins at or above threshold", () => {
    const dvh = [
      { dose: 10, volume: 0.2 },
      { dose: 20, volume: 0.3 },
      { dose: 30, volume: 0.5 },
    ];
    const m = calculateDoseMetrics(dvh);
    expect(m.vxx[20]).toBeCloseTo(80, 1);
  });
});
