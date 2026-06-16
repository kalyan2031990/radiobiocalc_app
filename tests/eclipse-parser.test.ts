import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseEclipseTxtNative } from "../lib/eclipse-dvh-native";
import { getRadbiocalcInputRoot } from "../scripts/test-data-root";

const FIXTURE = (() => {
  const root = process.env.INPUT_FOLDERS ?? getRadbiocalcInputRoot();
  return root ? path.join(root, "PTV_DVH_txt_data_14pt") : "";
})();

describe("Eclipse txt parser characterization", () => {
  it("parses a real PTV fixture with Gy dose and structures", () => {
    const root = getRadbiocalcInputRoot();
    if (!root) return;
    const ptvDir = path.join(root, "PTV_DVH_txt_data_14pt");
    if (!fs.existsSync(ptvDir)) return;
    const file = fs.readdirSync(ptvDir).find((f) => f.endsWith(".txt"));
    if (!file) return;
    const content = fs.readFileSync(path.join(ptvDir, file), "utf8");
    const parsed = parseEclipseTxtNative(content, file);
    const keys = Object.keys(parsed.dvhByStructure);
    expect(keys.length).toBeGreaterThan(0);
    const pts = parsed.dvhByStructure[keys[0]!]!;
    expect(pts.length).toBeGreaterThan(10);
    const maxD = Math.max(...pts.map((p) => p.dose));
    expect(maxD).toBeGreaterThan(1);
    expect(maxD).toBeLessThan(200);
    expect(parsed.patientInfo.patientName).toBeTruthy();
  });

  it("snapshot structure keys stable for Kastoori if present", () => {
    const root = getRadbiocalcInputRoot();
    if (!root) return;
    const candidates = [
      path.join(root, "PTV_DVH_txt_data_14pt"),
      path.join(root, "..", "rbgyanx_test_data", "PTV_data"),
    ];
    for (const dir of candidates) {
      if (!fs.existsSync(dir)) continue;
      const k = fs.readdirSync(dir).find((f) => /KASTOORI/i.test(f));
      if (!k) continue;
      const parsed = parseEclipseTxtNative(fs.readFileSync(path.join(dir, k), "utf8"), k);
      expect(Object.keys(parsed.dvhByStructure)).toMatchSnapshot();
      return;
    }
  });
});
