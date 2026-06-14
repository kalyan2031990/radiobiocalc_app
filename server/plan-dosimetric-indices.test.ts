import { describe, expect, it } from "vitest";
import {
  computeTargetPlanIndices,
  dosePercentile,
} from "../lib/plan-dosimetric-indices";
import { applyManuscriptCovariates, tcpCovariateInactive } from "../lib/manuscript-covariates";
import type { ClinicalRecord } from "../lib/clinical-xlsx-core";

function uniformTargetDvh(rx: number, tv: number) {
  return [
    { dose: 0, volume: tv },
    { dose: rx - 0.5, volume: tv },
    { dose: rx, volume: tv * 0.92 },
    { dose: rx + 2, volume: tv * 0.05 },
    { dose: rx + 5, volume: 0 },
  ];
}

describe("plan-dosimetric-indices", () => {
  it("CI is null without BODY DVH (never TCI/100)", () => {
    const target = uniformTargetDvh(66, 100);
    const idx = computeTargetPlanIndices(target, 66, { totalDoseGy: 66, numFractions: 33 });
    expect(idx.tciPercent).toBeGreaterThan(80);
    expect(idx.ciRtog).toBeNull();
  });

  it("CI from synthetic BODY DVH", () => {
    const target = [{ dose: 0, volume: 50 }, { dose: 66, volume: 45 }, { dose: 70, volume: 0 }];
    const body = [{ dose: 0, volume: 500 }, { dose: 66, volume: 200 }, { dose: 70, volume: 50 }];
    const idx = computeTargetPlanIndices(target, 66, { totalDoseGy: 66, numFractions: 33 }, { bodyDvh: body });
    expect(idx.ciRtog).not.toBeNull();
    expect(idx.ciRtog!).toBeGreaterThan(1);
  });

  it("ICRU-83 HI is (D2-D98)/D50", () => {
    const target = uniformTargetDvh(66, 100);
    const idx = computeTargetPlanIndices(target, 66, { totalDoseGy: 66, numFractions: 33 });
    expect(idx.hiIcru83).toBeGreaterThan(0);
    expect(idx.hiRatio).toBeGreaterThan(1);
  });

  it("interpolates D95 between bins", () => {
    const dvh = [
      { dose: 60, volume: 100 },
      { dose: 65, volume: 95 },
      { dose: 70, volume: 5 },
    ];
    const d95 = dosePercentile(dvh, 95);
    expect(d95).toBeGreaterThan(64);
    expect(d95).toBeLessThan(66);
  });
});

describe("manuscript-covariates", () => {
  const record: ClinicalRecord = {
    patientId: "RBX-TXT-001",
    organ: "Larynx",
    age: 58,
    sex: "M",
    chemo: "yes",
    smoking: "former",
    ecog: 1,
    totalDoseGy: 66,
    fractions: 33,
    technique: "IMRT",
    dataSource: "bundled",
    syntheticFlag: false,
    adequateForCorrelation: true,
    sourceFile: "test.xlsx",
    dosePerFractionGy: 2,
  };

  it("moves larynx NTCP with smoking+chemo", () => {
    const adj = applyManuscriptCovariates(undefined, 0.627, record, "Larynx");
    expect(adj.adjustedNtcp!).toBeGreaterThan(0.627);
    expect(adj.factorsApplied.length).toBeGreaterThan(0);
  });

  it("TCP covariate inactive at ceiling", () => {
    expect(tcpCovariateInactive(0.999)).toBe(true);
    expect(tcpCovariateInactive(0.85)).toBe(false);
  });
});
