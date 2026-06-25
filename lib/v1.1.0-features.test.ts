/**
 * v1.1.0 feature tests — F1–F6 modules (engine parity unchanged).
 */

import { describe, it, expect } from "vitest";
import { comparePlans } from "@/lib/plan-compare";
import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";
import {
  buildDoseResponseCurve,
  buildCiSensitivityBand,
  ntcpAtGeud,
  therapeuticWindowDoseSweep,
  scaleDvhBundle,
} from "@/lib/dose-sweep";
import {
  buildEquivalenceTable,
  buildCustomSchedule,
  computeEquivalenceRow,
  PRESET_SCHEDULES,
} from "@/lib/fractionation-equivalence";
import {
  getParameterLibrary,
  getOrganParameters,
  filterParameterLibrary,
} from "@/lib/parameter-library";
import { offlineParseDvh } from "@/lib/offline-engine";

function minimalEval(tcp: number, ntcp: number, geud: number): CompositePlanEvaluation {
  return {
    prescriptionGy: 70,
    totalDose: 70,
    numFractions: 35,
    cancerSite: "HN",
    targetIndices: {
      prescriptionGy: 70,
      tciPercent: 90,
      d95: 65,
      d98: 64,
      d50: 68,
      d2: 72,
      hiIcru83: 0.1,
      hiRatio: 1.05,
      techniqueProfile: "conventional",
      stereotacticIndicesApplicable: false,
      indexPackNote: "test",
      ciRtog: null,
      ciRtogNote: "",
      ciPaddick: null,
      gradientIndex: null,
      v100Rx: 90,
    },
    primaryTarget: "PTV70",
    structureResults: [
      {
        structureName: "PTV70",
        structureType: "target",
        literatureOrgan: "PTV",
        model: "poisson_dvh",
        tcp,
        doseMetrics: { meanDose: geud, maxDose: geud + 2, gEUD: geud, d95: geud - 1 },
      },
      {
        structureName: "Parotid_L",
        structureType: "oar",
        literatureOrgan: "Parotid",
        model: "lkb_loglogit",
        ntcp,
        doseMetrics: { meanDose: 26, maxDose: 50, gEUD: 26 },
      },
    ],
    therapeutic: {
      tcp,
      tcpRaw: tcp,
      tcpCapped: tcp > 0.95,
      tcpModel: "poisson_dvh",
      tcpStructure: "PTV70",
      ntcpComposite: ntcp,
      ntcpCritical: ntcp,
      utcp: tcp * (1 - ntcp),
      pPlus: tcp - ntcp,
      cftc: tcp * (1 - ntcp),
      twi: tcp - 0.3 * ntcp,
      twiInterpretation: "Moderate",
      oarEntries: [],
      references: [],
    },
    planExplanation: {
      headline: "test",
      rbXScope: "test",
      techniqueProfile: "conventional",
      indexPackNote: "test",
      bullets: [],
      limitations: [],
    },
  };
}

describe("F1 plan compare", () => {
  it("computes Δ B−A for composite metrics", () => {
    const a = minimalEval(0.9, 0.5, 68);
    const b = minimalEval(0.95, 0.4, 69);
    const cmp = comparePlans(a, b, "A", "B");
    const utcp = cmp.compositeRows.find((r) => r.key === "utcp");
    expect(utcp?.delta).toBeCloseTo(b.therapeutic.utcp - a.therapeutic.utcp, 4);
    expect(cmp.structureRows.length).toBeGreaterThan(0);
  });
});

describe("F3 dose sweep", () => {
  it("builds NTCP curve with operating point", () => {
    const curve = buildDoseResponseCurve({
      td50: 28,
      gamma50: 1,
      model: "lkb_loglogit",
      isTcp: false,
      operatingDose: 26,
      operatingProbability: ntcpAtGeud(26, 28, 1, 0.25, "lkb_loglogit"),
    });
    expect(curve.points.length).toBeGreaterThan(10);
    expect(curve.operatingDose).toBe(26);
  });

  it("returns CI band only for organs with published CIs", () => {
    const band = buildCiSensitivityBand({
      organ: "Parotid",
      model: "lkb_loglogit",
      td50: 28.4,
      gamma50: 1,
      m: 0.25,
    });
    expect(band).not.toBeNull();
    expect(band!.length).toBeGreaterThan(5);
    const none = buildCiSensitivityBand({
      organ: "Larynx",
      model: "lkb_loglogit",
      td50: 44,
      gamma50: 1,
      m: 0.2,
    });
    expect(none).toBeNull();
  });

  it("finds optimal UTCP dose on scaled DVH", () => {
    const csv = `dose,volume,structure
0,100,PTV70
70,95,PTV70
0,50,Parotid_L
50,20,Parotid_L`;
    const bundle = offlineParseDvh(csv, "t.csv");
    const sweep = therapeuticWindowDoseSweep({
      bundle,
      baseTotalDoseGy: 70,
      numFractions: 35,
      steps: 8,
    });
    expect(sweep.optimalDoseGy).toBeGreaterThanOrEqual(20);
    expect(sweep.points.length).toBe(9);
    const scaled = scaleDvhBundle(bundle, 0.5);
    expect(scaled.dvhByStructure.PTV70?.[1]?.dose).toBeCloseTo(35, 1);
  });
});

describe("F4 parameter library", () => {
  it("loads entries matching engine defaults", () => {
    const lib = getParameterLibrary();
    expect(lib.length).toBeGreaterThan(20);
    const parotid = getOrganParameters("Parotid", "lkb_loglogit");
    const entry = lib.find((e) => e.organ === "Parotid" && e.model === "lkb_loglogit");
    expect(entry?.parameters.td50).toBe(parotid?.td50);
  });

  it("filters by organ query", () => {
    const hits = filterParameterLibrary({ query: "parotid" });
    expect(hits.every((h) => h.organ.toLowerCase().includes("parotid"))).toBe(true);
  });
});

describe("F6 fractionation equivalence", () => {
  it("has at least 16 preset schedules", () => {
    expect(PRESET_SCHEDULES.length).toBeGreaterThanOrEqual(16);
  });

  it("applies α/β override to all rows", () => {
    const rows = buildEquivalenceTable({ alphaBetaTumor: 5, alphaBetaLate: 2 });
    const row = rows.find((r) => r.schedule.id === "conv-70-35");
    expect(row?.eqd2Tumor).toBeGreaterThan(60);
  });

  it("LQL changes SBRT BED vs standard LQ", () => {
    const sbrt = PRESET_SCHEDULES.find((s) => s.id === "sbrt-54-3")!;
    const lq = computeEquivalenceRow(sbrt, { useLqlDamping: false });
    const lql = computeEquivalenceRow(sbrt, { useLqlDamping: true });
    expect(lql.bedTumor).not.toBeCloseTo(lq.bedTumor, 0);
    expect(lql.lqlApplied).toBe(true);
  });

  it("supports custom schedule rows", () => {
    const custom = buildCustomSchedule(45, 15);
    const row = computeEquivalenceRow(custom);
    expect(row.dosePerFractionGy).toBe(3);
  });
});
