/**
 * Radiobiological Parameters Database
 * 
 * Comprehensive lookup of organ-specific parameters based on:
 * - QUANTEC (Quantitative Analyses of Normal Tissue Effects in the Clinic)
 * - RTOG (Radiation Therapy Oncology Group) guidelines
 * - Published literature
 * 
 * References:
 * [1] Marks LB, et al. Use of normal tissue complication probability models in the clinic. 
 *     Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S10-S19.
 * [2] Bentzen SM, et al. Quantitative Analyses of Normal Tissue Effects in the Clinic (QUANTEC): 
 *     An introduction to the scientific issues. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S3-S9.
 */

import { OrganParameters } from "./radiobiology";
import {
  EXTRA_ORGAN_PARAMETERS,
  EXTRA_ORGAN_CLASSIFICATION,
} from "./parameters-extra";

// ─────────────────────────────────────────────────────────────────────────────
// QUANTEC/RTOG Parameters by Organ
// ─────────────────────────────────────────────────────────────────────────────

export const ORGAN_PARAMETERS: Record<string, Record<string, OrganParameters>> = {
  // ─────────────────────────────────────────────────────────────────────────
  // HEAD & NECK
  // ─────────────────────────────────────────────────────────────────────────

  Parotid: {
    lkb_loglogit: {
      td50: 28.4,
      gamma50: 1.0,
      m: 0.25,
      n: 0.45,
      alphaBeta: 3,
      d50: 26.3,
      gamma: 0.73,
      s: 0.01,
    },
    lkb_probit: {
      td50: 28.4,
      gamma50: 1.0,
      m: 0.18,
      n: 0.45,
      alphaBeta: 3,
      d50: 26.3,
      gamma: 0.73,
      s: 0.01,
    },
    poisson: {
      td50: 28.4,
      gamma50: 1.0,
      m: 0.25,
      n: 0.45,
      alphaBeta: 3,
      d50: 26.3,
      gamma: 0.73,
      s: 0.01,
    },
  },

  Larynx: {
    lkb_loglogit: {
      td50: 44.0,
      gamma50: 1.0,
      m: 0.20,
      n: 1.0,
      alphaBeta: 3,
      d50: 40.0,
      gamma: 1.2,
      s: 0.12,
    },
    lkb_probit: {
      td50: 44.0,
      gamma50: 1.0,
      m: 0.20,
      n: 1.0,
      alphaBeta: 3,
      d50: 40.0,
      gamma: 1.2,
      s: 0.12,
    },
    poisson: {
      td50: 44.0,
      gamma50: 1.0,
      m: 0.20,
      n: 1.0,
      alphaBeta: 3,
      d50: 40.0,
      gamma: 1.2,
      s: 0.12,
    },
  },

  "Spinal Cord": {
    lkb_loglogit: {
      td50: 66.5,
      gamma50: 4.0,
      m: 0.10,
      n: 0.03,
      alphaBeta: 2,
      d50: 68.6,
      gamma: 1.9,
      s: 4.0,
    },
    lkb_probit: {
      td50: 66.5,
      gamma50: 4.0,
      m: 0.10,
      n: 0.03,
      alphaBeta: 2,
      d50: 68.6,
      gamma: 1.9,
      s: 4.0,
    },
    poisson: {
      td50: 66.5,
      gamma50: 4.0,
      m: 0.10,
      n: 0.03,
      alphaBeta: 2,
      d50: 68.6,
      gamma: 1.9,
      s: 4.0,
    },
  },

  Brainstem: {
    lkb_loglogit: {
      td50: 64.0,
      gamma50: 3.0,
      m: 0.15,
      n: 0.05,
      alphaBeta: 2,
      d50: 65.0,
      gamma: 1.8,
      s: 3.5,
    },
    lkb_probit: {
      td50: 64.0,
      gamma50: 3.0,
      m: 0.15,
      n: 0.05,
      alphaBeta: 2,
      d50: 65.0,
      gamma: 1.8,
      s: 3.5,
    },
    poisson: {
      td50: 64.0,
      gamma50: 3.0,
      m: 0.15,
      n: 0.05,
      alphaBeta: 2,
      d50: 65.0,
      gamma: 1.8,
      s: 3.5,
    },
  },

  "Optic Nerve": {
    lkb_loglogit: {
      td50: 60.0,
      gamma50: 2.5,
      m: 0.12,
      n: 0.08,
      alphaBeta: 2,
      d50: 58.0,
      gamma: 1.7,
      s: 2.8,
    },
    lkb_probit: {
      td50: 60.0,
      gamma50: 2.5,
      m: 0.12,
      n: 0.08,
      alphaBeta: 2,
      d50: 58.0,
      gamma: 1.7,
      s: 2.8,
    },
    poisson: {
      td50: 60.0,
      gamma50: 2.5,
      m: 0.12,
      n: 0.08,
      alphaBeta: 2,
      d50: 58.0,
      gamma: 1.7,
      s: 2.8,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // THORAX
  // ─────────────────────────────────────────────────────────────────────────

  Lung: {
    lkb_loglogit: {
      td50: 24.5,
      gamma50: 1.0,
      m: 0.37,
      n: 1.0,
      alphaBeta: 3,
      d50: 23.0,
      gamma: 0.85,
      s: 1.0,
    },
    lkb_probit: {
      td50: 24.5,
      gamma50: 1.0,
      m: 0.37,
      n: 1.0,
      alphaBeta: 3,
      d50: 23.0,
      gamma: 0.85,
      s: 1.0,
    },
    poisson: {
      td50: 24.5,
      gamma50: 1.0,
      m: 0.37,
      n: 1.0,
      alphaBeta: 3,
      d50: 23.0,
      gamma: 0.85,
      s: 1.0,
    },
  },

  Heart: {
    lkb_loglogit: {
      td50: 48.0,
      gamma50: 0.42,
      m: 0.16,
      n: 0.5,
      alphaBeta: 3,
      d50: 45.0,
      gamma: 0.65,
      s: 0.5,
    },
    lkb_probit: {
      td50: 48.0,
      gamma50: 0.42,
      m: 0.16,
      n: 0.5,
      alphaBeta: 3,
      d50: 45.0,
      gamma: 0.65,
      s: 0.5,
    },
    poisson: {
      td50: 48.0,
      gamma50: 0.42,
      m: 0.16,
      n: 0.5,
      alphaBeta: 3,
      d50: 45.0,
      gamma: 0.65,
      s: 0.5,
    },
  },

  Esophagus: {
    lkb_loglogit: {
      td50: 60.0,
      gamma50: 0.8,
      m: 0.11,
      n: 0.4,
      alphaBeta: 3,
      d50: 58.0,
      gamma: 0.9,
      s: 0.4,
    },
    lkb_probit: {
      td50: 60.0,
      gamma50: 0.8,
      m: 0.11,
      n: 0.4,
      alphaBeta: 3,
      d50: 58.0,
      gamma: 0.9,
      s: 0.4,
    },
    poisson: {
      td50: 60.0,
      gamma50: 0.8,
      m: 0.11,
      n: 0.4,
      alphaBeta: 3,
      d50: 58.0,
      gamma: 0.9,
      s: 0.4,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ABDOMEN & PELVIS
  // ─────────────────────────────────────────────────────────────────────────

  Rectum: {
    lkb_loglogit: {
      td50: 76.9,
      gamma50: 0.12,
      m: 0.09,
      n: 0.12,
      alphaBeta: 3,
      d50: 75.0,
      gamma: 0.8,
      s: 0.12,
    },
    lkb_probit: {
      td50: 76.9,
      gamma50: 0.12,
      m: 0.09,
      n: 0.12,
      alphaBeta: 3,
      d50: 75.0,
      gamma: 0.8,
      s: 0.12,
    },
    poisson: {
      td50: 76.9,
      gamma50: 0.12,
      m: 0.09,
      n: 0.12,
      alphaBeta: 3,
      d50: 75.0,
      gamma: 0.8,
      s: 0.12,
    },
  },

  Bladder: {
    lkb_loglogit: {
      td50: 82.4,
      gamma50: 0.11,
      m: 0.08,
      n: 0.15,
      alphaBeta: 3,
      d50: 80.0,
      gamma: 0.75,
      s: 0.15,
    },
    lkb_probit: {
      td50: 82.4,
      gamma50: 0.11,
      m: 0.08,
      n: 0.15,
      alphaBeta: 3,
      d50: 80.0,
      gamma: 0.75,
      s: 0.15,
    },
    poisson: {
      td50: 82.4,
      gamma50: 0.11,
      m: 0.08,
      n: 0.15,
      alphaBeta: 3,
      d50: 80.0,
      gamma: 0.75,
      s: 0.15,
    },
  },

  Prostate: {
    lkb_loglogit: {
      td50: 85.0,
      gamma50: 0.27,
      m: 0.07,
      n: 0.2,
      alphaBeta: 1.5,
      d50: 82.0,
      gamma: 0.7,
      s: 0.2,
    },
    lkb_probit: {
      td50: 85.0,
      gamma50: 0.27,
      m: 0.07,
      n: 0.2,
      alphaBeta: 1.5,
      d50: 82.0,
      gamma: 0.7,
      s: 0.2,
    },
    poisson: {
      td50: 85.0,
      gamma50: 0.27,
      m: 0.07,
      n: 0.2,
      alphaBeta: 1.5,
      d50: 82.0,
      gamma: 0.7,
      s: 0.2,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BREAST
  // ─────────────────────────────────────────────────────────────────────────

  Breast: {
    lkb_loglogit: {
      td50: 150.0,
      gamma50: 0.1,
      m: 0.05,
      n: 0.3,
      alphaBeta: 4,
      d50: 145.0,
      gamma: 0.6,
      s: 0.3,
    },
    lkb_probit: {
      td50: 150.0,
      gamma50: 0.1,
      m: 0.05,
      n: 0.3,
      alphaBeta: 4,
      d50: 145.0,
      gamma: 0.6,
      s: 0.3,
    },
    poisson: {
      td50: 150.0,
      gamma50: 0.1,
      m: 0.05,
      n: 0.3,
      alphaBeta: 4,
      d50: 145.0,
      gamma: 0.6,
      s: 0.3,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TARGETS (TCP Parameters)
  // ─────────────────────────────────────────────────────────────────────────

  PTV: {
    lkb_loglogit: {
      td50: 50.0,
      gamma50: 1.5,
      m: 0.1,
      n: 0.5,
      alphaBeta: 10,
      d50: 48.0,
      gamma: 1.2,
      s: 0.5,
    },
    lkb_probit: {
      td50: 50.0,
      gamma50: 1.5,
      m: 0.1,
      n: 0.5,
      alphaBeta: 10,
      d50: 48.0,
      gamma: 1.2,
      s: 0.5,
    },
    poisson: {
      td50: 50.0,
      gamma50: 1.5,
      m: 0.1,
      n: 0.5,
      alphaBeta: 10,
      d50: 48.0,
      gamma: 1.2,
      s: 0.5,
    },
  },

  GTV: {
    lkb_loglogit: {
      td50: 45.0,
      gamma50: 1.8,
      m: 0.12,
      n: 0.4,
      alphaBeta: 10,
      d50: 43.0,
      gamma: 1.3,
      s: 0.4,
    },
    lkb_probit: {
      td50: 45.0,
      gamma50: 1.8,
      m: 0.12,
      n: 0.4,
      alphaBeta: 10,
      d50: 43.0,
      gamma: 1.3,
      s: 0.4,
    },
    poisson: {
      td50: 45.0,
      gamma50: 1.8,
      m: 0.12,
      n: 0.4,
      alphaBeta: 10,
      d50: 43.0,
      gamma: 1.3,
      s: 0.4,
    },
  },

  CTV: {
    lkb_loglogit: {
      td50: 48.0,
      gamma50: 1.6,
      m: 0.11,
      n: 0.45,
      alphaBeta: 10,
      d50: 46.0,
      gamma: 1.25,
      s: 0.45,
    },
    lkb_probit: {
      td50: 48.0,
      gamma50: 1.6,
      m: 0.11,
      n: 0.45,
      alphaBeta: 10,
      d50: 46.0,
      gamma: 1.25,
      s: 0.45,
    },
    poisson: {
      td50: 48.0,
      gamma50: 1.6,
      m: 0.11,
      n: 0.45,
      alphaBeta: 10,
      d50: 46.0,
      gamma: 1.25,
      s: 0.45,
    },
  },
};

Object.assign(ORGAN_PARAMETERS, EXTRA_ORGAN_PARAMETERS);

// ─────────────────────────────────────────────────────────────────────────────
// Organ Classification
// ─────────────────────────────────────────────────────────────────────────────

export const ORGAN_CLASSIFICATION: Record<
  string,
  {
    type: "target" | "oar";
    category: string;
    seriality: "serial" | "parallel" | "mixed";
  }
> = {
  PTV: { type: "target", category: "Target", seriality: "parallel" },
  GTV: { type: "target", category: "Target", seriality: "parallel" },
  CTV: { type: "target", category: "Target", seriality: "parallel" },

  Parotid: { type: "oar", category: "Head & Neck", seriality: "parallel" },
  Larynx: { type: "oar", category: "Head & Neck", seriality: "mixed" },
  "Spinal Cord": { type: "oar", category: "Head & Neck", seriality: "serial" },
  Brainstem: { type: "oar", category: "Head & Neck", seriality: "serial" },
  "Optic Nerve": { type: "oar", category: "Head & Neck", seriality: "serial" },

  Lung: { type: "oar", category: "Thorax", seriality: "parallel" },
  Heart: { type: "oar", category: "Thorax", seriality: "mixed" },
  Esophagus: { type: "oar", category: "Thorax", seriality: "serial" },

  Rectum: { type: "oar", category: "Abdomen & Pelvis", seriality: "parallel" },
  Bladder: { type: "oar", category: "Abdomen & Pelvis", seriality: "parallel" },
  Prostate: { type: "oar", category: "Abdomen & Pelvis", seriality: "mixed" },

  Breast: { type: "oar", category: "Breast", seriality: "parallel" },
  ...EXTRA_ORGAN_CLASSIFICATION,
};

export type RadiobiologyModelId =
  | "lkb_loglogit"
  | "lkb_probit"
  | "poisson"
  | "zaider_minerbo"
  | "poisson_dvh";

export const MODEL_LABELS: Record<RadiobiologyModelId, string> = {
  lkb_loglogit: "LKB log-logistic",
  lkb_probit: "LKB probit",
  poisson: "Poisson (scalar)",
  zaider_minerbo: "Zaider–Minerbo",
  poisson_dvh: "Poisson-LQ (DVH)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get parameters for a specific organ and model
 */
export function getOrganParameters(
  organ: string,
  model: string = "lkb_loglogit"
): OrganParameters | null {
  const organParams = ORGAN_PARAMETERS[organ];
  if (!organParams) {
    return null;
  }

  return (
    organParams[model] ||
    organParams["lkb_loglogit"] ||
    organParams["zaider_minerbo"] ||
    null
  );
}

/**
 * Get all available organs
 */
export function getAvailableOrgans(): string[] {
  return Object.keys(ORGAN_PARAMETERS).sort();
}

/**
 * Get organs by category
 */
export function getOrgansByCategory(category: string): string[] {
  return Object.entries(ORGAN_CLASSIFICATION)
    .filter(([_, info]) => info.category === category)
    .map(([organ, _]) => organ)
    .sort();
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(
    Object.values(ORGAN_CLASSIFICATION).map((info) => info.category)
  );
  return Array.from(categories).sort();
}

/**
 * Get organ classification info
 */
export function getOrganClassification(organ: string) {
  return ORGAN_CLASSIFICATION[organ] || null;
}

/**
 * Get default alpha/beta ratio for organ
 */
export function getDefaultAlphaBeta(organ: string): number {
  const params = getOrganParameters(organ);
  return params?.alphaBeta || 3;
}
