import { describe, expect, it } from "vitest";
import { offlineEvaluateComposite, offlineParseDvh } from "@/lib/offline-engine";
import { probeModelsForStructure } from "@/lib/composite-model-probe";

const CSV = `dose,volume,structure
0,100,PTV66
66,95,PTV66
0,50,Parotid_L
50,20,Parotid_L`;

describe("composite model driving (build 17)", () => {
  it("excludes generic Poisson from target model catalogue", () => {
    const bundle = offlineParseDvh(CSV, "RBX-TXT-001_composite_DVH.txt");
    const target = bundle.structures.find((s) => s.name.includes("PTV"))!;
    const rows = probeModelsForStructure({
      dvh: bundle.dvhByStructure[target.name],
      totalDose: 66,
      numFractions: 33,
      organ: "PTV",
      structureType: "target",
      cancerSite: "HN",
      technique: "IMRT",
      structureName: target.name,
      defaultModel: "poisson_dvh",
      prescriptionGy: 66,
    });
    expect(rows.some((r) => r.model === "poisson")).toBe(false);
    expect(rows.some((r) => r.model === "poisson_dvh")).toBe(true);
  });

  it("changes composite NTCP when OAR driving model changes", () => {
    const bundle = offlineParseDvh(CSV, "RBX-TXT-001_composite_DVH.txt");
    const logistic = offlineEvaluateComposite(bundle, {
      totalDose: 66,
      numFractions: 33,
      cancerSite: "HN",
      ntcpModel: "lkb_loglogit",
    });
    const probit = offlineEvaluateComposite(bundle, {
      totalDose: 66,
      numFractions: 33,
      cancerSite: "HN",
      ntcpModel: "lkb_probit",
    });
    expect(logistic.therapeutic.ntcpComposite).not.toBeCloseTo(
      probit.therapeutic.ntcpComposite,
      3,
    );
  });
});
