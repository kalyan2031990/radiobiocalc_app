/** Map literature organ names to QUANTEC benchmark DB keys. */

const MAP: Record<string, string> = {
  Parotid: "Parotid",
  Larynx: "Larynx",
  "Spinal Cord": "SpinalCord",
  Lung: "Lung",
  Heart: "Heart",
  Esophagus: "Esophagus",
  Rectum: "Rectum",
  Bladder: "Bladder",
  Prostate: "Prostate",
  Breast: "Breast",
  PTV: "PTV",
  GTV: "GTV",
};

export function benchmarkOrganKey(organ: string): string {
  return MAP[organ] ?? organ.replace(/\s+/g, "");
}
