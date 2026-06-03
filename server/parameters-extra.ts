/**
 * Additional QUANTEC-style organ parameters (mobile extension).
 * Ref: QUANTEC IJROBP 2010; 76(3 Suppl).
 */

import type { OrganParameters } from "./radiobiology";

type ModelSet = Record<string, OrganParameters>;

function cloneParotid(td50: number, gamma50: number, n: number, s: number): ModelSet {
  const base: OrganParameters = {
    td50,
    gamma50,
    m: 0.18,
    n,
    alphaBeta: 3,
    d50: td50 * 0.92,
    gamma: gamma50 * 0.73,
    s,
  };
  return {
    lkb_loglogit: { ...base },
    lkb_probit: { ...base, m: 0.15 },
    poisson: { ...base },
    zaider_minerbo: { ...base },
  };
}

export const EXTRA_ORGAN_PARAMETERS: Record<string, ModelSet> = {
  Brain: cloneParotid(60, 2.5, 0.05, 3.5),
  Chiasm: cloneParotid(65, 2.8, 0.08, 3.0),
  Hippocampus: cloneParotid(25, 1.2, 0.45, 0.02),
  Cochlea: cloneParotid(45, 1.5, 0.2, 1.5),
  Lens: cloneParotid(10, 1.0, 0.3, 2.0),
  Mandible: cloneParotid(65, 1.5, 0.1, 2.5),
  "Pharyngeal Constrictor": cloneParotid(56, 1.1, 0.6, 0.15),
  Submandibular: cloneParotid(39, 1.0, 0.45, 0.05),
  Bowel: cloneParotid(45, 1.0, 0.7, 0.1),
  "Femoral Head": cloneParotid(50, 1.0, 0.5, 0.2),
  "Brachial Plexus": cloneParotid(60, 2.0, 0.1, 3.0),
  "Penile Bulb": cloneParotid(52, 1.0, 0.5, 0.3),
  ITV: cloneParotid(50, 1.5, 0.5, 0.5),
};

export const EXTRA_ORGAN_CLASSIFICATION: Record<
  string,
  { type: "target" | "oar"; category: string; seriality: "serial" | "parallel" | "mixed" }
> = {
  Brain: { type: "oar", category: "Brain", seriality: "serial" },
  Chiasm: { type: "oar", category: "Brain", seriality: "serial" },
  Hippocampus: { type: "oar", category: "Brain", seriality: "serial" },
  Cochlea: { type: "oar", category: "Brain", seriality: "serial" },
  Lens: { type: "oar", category: "Brain", seriality: "serial" },
  Mandible: { type: "oar", category: "Head & Neck", seriality: "serial" },
  "Pharyngeal Constrictor": { type: "oar", category: "Head & Neck", seriality: "mixed" },
  Submandibular: { type: "oar", category: "Head & Neck", seriality: "parallel" },
  Bowel: { type: "oar", category: "Abdomen & Pelvis", seriality: "parallel" },
  "Femoral Head": { type: "oar", category: "Abdomen & Pelvis", seriality: "parallel" },
  "Brachial Plexus": { type: "oar", category: "Thorax", seriality: "serial" },
  "Penile Bulb": { type: "oar", category: "Abdomen & Pelvis", seriality: "serial" },
  ITV: { type: "target", category: "Target", seriality: "parallel" },
};
