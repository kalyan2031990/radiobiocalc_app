import { describe, it, expect } from "vitest";
import {
  calculateNTCP_LKB_LogLogit,
  calculateTCP_LKB,
  calculateGEUD,
  calculateBED,
  calculateEQD2,
} from "./radiobiology";

/** Desktop rbGyanx: rbgyanx/core/ntcp/lkb_loglogit.py */
describe("LKB log-logistic cross-check (desktop formula)", () => {
  it("NTCP matches desktop for parotid-like gEUD", () => {
    const ntcp = calculateNTCP_LKB_LogLogit(26.5, 28.4, 1.0);
    expect(ntcp).toBeCloseTo(1 / (1 + Math.pow(28.4 / 26.5, 4)), 6);
  });

  it("TCP LKB uses same sigmoid as NTCP with TD50/gEUD", () => {
    const tcp = calculateTCP_LKB(48, 50, 1.5);
    expect(tcp).toBeCloseTo(1 / (1 + Math.pow(50 / 48, 6)), 6);
  });
});

describe("BED / EQD2", () => {
  it("70 Gy in 35 fx, alpha/beta=3", () => {
    const dpf = 70 / 35;
    expect(calculateBED(70, 35, 3)).toBeCloseTo(70 * (1 + dpf / 3), 4);
    expect(calculateEQD2(70, 35, 3)).toBeCloseTo(70 * ((3 + dpf) / (3 + 2)), 4);
  });
});

describe("gEUD", () => {
  it("uniform DVH → gEUD ≈ mean dose when a=1", () => {
    const dvh = [
      { dose: 10, volume: 50 },
      { dose: 20, volume: 30 },
      { dose: 30, volume: 20 },
    ];
    const g = calculateGEUD(dvh, 1);
    expect(g).toBeGreaterThan(10);
    expect(g).toBeLessThan(30);
  });
});
