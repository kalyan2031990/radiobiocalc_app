import { describe, it, expect } from "vitest";
import { buildAnalysisReport } from "./analysis-report";

describe("analysis report clinical section", () => {
  it("includes site-specific clinical tables when opt-in", () => {
    const report = buildAnalysisReport({
      patientId: "P1",
      planLabel: "Plan A",
      organ: "Parotid",
      structureName: "Parotid_L",
      structureType: "oar",
      model: "lkb_loglogit",
      cancerSite: "HN",
      technique: "IMRT",
      totalDose: 70,
      numFractions: 35,
      ntcp: 0.22,
      bed: 80,
      eqd2: 70,
      meanDose: 26,
      maxDose: 70,
      gEUD: 26,
      doseMetricRows: [{ label: "Dmean", value: "26 Gy", note: "" }],
      includeClinicalInReport: true,
      clinicalSections: [
        {
          sectionTitle: "Disease & site",
          rows: [
            { label: "HPV status (p16)", value: "Positive" },
            { label: "Smoking status", value: "Former" },
          ],
        },
        {
          sectionTitle: "Treatment",
          rows: [{ label: "Concurrent chemotherapy", value: "Yes" }],
        },
      ],
    });
    expect(report.html).toContain("Clinical context (opt-in)");
    expect(report.html).toContain("HPV status");
    expect(report.docxText).toContain("Concurrent chemotherapy");
    expect(report.html).toContain("does not adjust dose");
  });

  it("omits clinical block when opt-in off", () => {
    const report = buildAnalysisReport({
      patientId: "P1",
      planLabel: "Plan A",
      organ: "Parotid",
      structureName: "Parotid_L",
      structureType: "oar",
      model: "lkb_loglogit",
      cancerSite: "HN",
      technique: "IMRT",
      totalDose: 70,
      numFractions: 35,
      bed: 80,
      eqd2: 70,
      meanDose: 26,
      maxDose: 70,
      gEUD: 26,
      doseMetricRows: [],
      includeClinicalInReport: false,
    });
    expect(report.html).not.toContain("Clinical context (opt-in)");
  });
});
