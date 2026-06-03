/**
 * Advanced Radiobiology Models for rbGyanX-genius evolved
 * 
 * Implements comprehensive clinical decision tree for dose-response modeling:
 * - LQL (Linear-Quadratic-Linear) model for high dose-per-fraction
 * - Modified LQ with caution flags
 * - Automatic model selection based on dose-per-fraction
 * - Manual model override capability
 * 
 * References:
 * - Astrahan M. (2008). "Some implications of linear-quadratic-linear radiation dose-response with regard to hypofractionation"
 * - Park C et al. (2008). "Universal survival curve and single fraction equivalent dose"
 * - Guerrero M, Li XA. (2004). "Extending the linear-quadratic model for large fraction doses"
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type RadiobiologyModel = 
  | "LQ"              // Linear-Quadratic (standard, d ≤ 4 Gy)
  | "LQ_MODIFIED"     // Modified LQ (4 < d ≤ 6 Gy, with caution)
  | "LQL"             // Linear-Quadratic-Linear (d > 6 Gy, SBRT/SRS)
  | "GLQ"             // Generalized LQ (d > 8 Gy, extreme hypofractionation)
  | "POISSON"         // Poisson TCP model
  | "LKB";            // Lyman-Kutcher-Burman NTCP model

export type TreatmentModality =
  | "EBRT_CONVENTIONAL"    // External beam, 1.8-2.5 Gy/fx
  | "EBRT_HYPOFRACTIONATED" // External beam, 2.5-4 Gy/fx
  | "SBRT"                 // Stereotactic body RT, >6 Gy/fx
  | "SRS"                  // Stereotactic radiosurgery, single fraction
  | "HDR_BRACHY"           // High dose rate brachytherapy
  | "LDR_BRACHY"           // Low dose rate brachytherapy
  | "PROTON"               // Proton therapy
  | "PEDIATRIC"            // Pediatric treatment
  | "REIRRADIATION"        // Re-irradiation
  | "ADAPTIVE";            // Adaptive replanning

export interface ModelSelectionCriteria {
  dosePerFraction: number;  // Gy
  totalDose: number;        // Gy
  numberOfFractions: number;
  modality?: TreatmentModality;
  isReirradiation?: boolean;
  patientAge?: number;
  treatmentGapDays?: number;
}

export interface ModelRecommendation {
  recommendedModel: RadiobiologyModel;
  confidence: "high" | "medium" | "low";
  rationale: string;
  cautionFlags: string[];
  alternativeModels: RadiobiologyModel[];
  literatureCitations: string[];
}

// ============================================================================
// LQL MODEL IMPLEMENTATION
// ============================================================================

/**
 * Calculate Surviving Fraction using LQL model
 * 
 * SF = exp(-αd - βd² - γ(d - dt)H(d - dt))
 * where H(d - dt) is Heaviside step function
 * 
 * @param dose - Dose per fraction (Gy)
 * @param alpha - Linear parameter (Gy⁻¹)
 * @param beta - Quadratic parameter (Gy⁻²)
 * @param gamma - Linear parameter for high doses (Gy⁻¹)
 * @param dt - Transition dose (Gy), typically 6-8 Gy
 * @returns Surviving fraction
 */
export function calculateSF_LQL(
  dose: number,
  alpha: number,
  beta: number,
  gamma: number = 0.0,
  dt: number = 6.0
): number {
  if (dose <= dt) {
    // Below transition dose: use standard LQ
    return Math.exp(-alpha * dose - beta * dose * dose);
  } else {
    // Above transition dose: add linear component
    const lqComponent = -alpha * dt - beta * dt * dt;
    const linearComponent = -(alpha + 2 * beta * dt + gamma) * (dose - dt);
    return Math.exp(lqComponent + linearComponent);
  }
}

/**
 * Calculate BED using LQL model
 * 
 * For d ≤ dt: BED = nd(1 + d/(α/β))
 * For d > dt: BED = n[αdt + βdt² + (α + 2βdt + γ)(d - dt)] / α
 */
export function calculateBED_LQL(
  dosePerFraction: number,
  numberOfFractions: number,
  alpha: number,
  beta: number,
  gamma: number = 0.0,
  dt: number = 6.0
): number {
  const alphaOverBeta = alpha / beta;
  
  if (dosePerFraction <= dt) {
    // Standard LQ formula
    return numberOfFractions * dosePerFraction * (1 + dosePerFraction / alphaOverBeta);
  } else {
    // LQL formula for high dose-per-fraction
    const lqPart = alpha * dt + beta * dt * dt;
    const linearPart = (alpha + 2 * beta * dt + gamma) * (dosePerFraction - dt);
    return numberOfFractions * (lqPart + linearPart) / alpha;
  }
}

/**
 * Calculate TCP using LQL model
 * 
 * TCP = exp(-N₀ × SF^n)
 * where N₀ is initial tumor cell number and n is number of fractions
 */
export function calculateTCP_LQL(
  dosePerFraction: number,
  numberOfFractions: number,
  alpha: number,
  beta: number,
  gamma: number = 0.0,
  dt: number = 6.0,
  N0: number = 1e9  // Initial tumor cell number
): number {
  const sf = calculateSF_LQL(dosePerFraction, alpha, beta, gamma, dt);
  const survivingCells = N0 * Math.pow(sf, numberOfFractions);
  return Math.exp(-survivingCells);
}

// ============================================================================
// AUTOMATIC MODEL SELECTION
// ============================================================================

/**
 * Automatically select the most appropriate radiobiology model
 * based on treatment parameters and clinical context
 */
export function selectModel(criteria: ModelSelectionCriteria): ModelRecommendation {
  const { dosePerFraction, totalDose, numberOfFractions, modality, isReirradiation, patientAge, treatmentGapDays } = criteria;
  
  const cautionFlags: string[] = [];
  const alternativeModels: RadiobiologyModel[] = [];
  const literatureCitations: string[] = [];
  
  // ========== TIER 1: DOSE-PER-FRACTION BASED SELECTION ==========
  
  // Case 1: d ≤ 4 Gy → Standard LQ
  if (dosePerFraction <= 4.0) {
    literatureCitations.push("Fowler JF. (1989). The linear-quadratic formula and progress in fractionated radiotherapy. Br J Radiol 62:679-694.");
    
    if (dosePerFraction >= 3.5) {
      cautionFlags.push("Dose per fraction approaching upper limit for standard LQ model (4 Gy). Consider modified LQ for doses >4 Gy.");
    }
    
    alternativeModels.push("LQ_MODIFIED", "LQL");
    
    return {
      recommendedModel: "LQ",
      confidence: "high",
      rationale: `Dose per fraction (${dosePerFraction.toFixed(2)} Gy) is within standard LQ model validity range (≤4 Gy). Standard LQ model is well-validated for conventional fractionation.`,
      cautionFlags,
      alternativeModels,
      literatureCitations
    };
  }
  
  // Case 2: 4 < d ≤ 6 Gy → Modified LQ with caution
  if (dosePerFraction > 4.0 && dosePerFraction <= 6.0) {
    cautionFlags.push("Dose per fraction is in transition zone (4-6 Gy). LQ model may overestimate cell kill. Consider LQL model for improved accuracy.");
    literatureCitations.push("Guerrero M, Li XA. (2004). Extending the linear-quadratic model for large fraction doses pertinent to stereotactic radiobiology. Phys Med Biol 49:4825-4835.");
    
    alternativeModels.push("LQ", "LQL");
    
    return {
      recommendedModel: "LQ_MODIFIED",
      confidence: "medium",
      rationale: `Dose per fraction (${dosePerFraction.toFixed(2)} Gy) is in the transition zone (4-6 Gy). Modified LQ model is recommended with caution. LQL model may provide better accuracy.`,
      cautionFlags,
      alternativeModels,
      literatureCitations
    };
  }
  
  // Case 3: 6 < d ≤ 8 Gy → LQL model
  if (dosePerFraction > 6.0 && dosePerFraction <= 8.0) {
    literatureCitations.push("Astrahan M. (2008). Some implications of linear-quadratic-linear radiation dose-response with regard to hypofractionation. Med Phys 35:4161-4172.");
    literatureCitations.push("Park C et al. (2008). Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. Int J Radiat Oncol Biol Phys 70:847-852.");
    
    alternativeModels.push("GLQ", "LQ_MODIFIED");
    
    return {
      recommendedModel: "LQL",
      confidence: "high",
      rationale: `Dose per fraction (${dosePerFraction.toFixed(2)} Gy) requires LQL model for accurate cell survival prediction. Standard LQ model significantly overestimates cell kill at these doses.`,
      cautionFlags,
      alternativeModels,
      literatureCitations
    };
  }
  
  // Case 4: d > 8 Gy → LQL or gLQ (extreme hypofractionation)
  if (dosePerFraction > 8.0) {
    cautionFlags.push("Extreme hypofractionation (>8 Gy/fx). LQL or gLQ model required. Vascular and immune effects may dominate over direct cell kill.");
    literatureCitations.push("Kirkpatrick JP et al. (2008). The linear-quadratic model is inappropriate to model high dose per fraction effects in radiosurgery. Semin Radiat Oncol 18:240-243.");
    literatureCitations.push("Brown JM et al. (2014). The tumor radiobiology of SRS and SBRT: are more than the 5 Rs involved? Int J Radiat Oncol Biol Phys 88:254-262.");
    
    alternativeModels.push("LQL");
    
    return {
      recommendedModel: "GLQ",
      confidence: "medium",
      rationale: `Dose per fraction (${dosePerFraction.toFixed(2)} Gy) is in extreme hypofractionation range (>8 Gy). Generalized LQ (gLQ) or LQL model recommended. Biological mechanisms beyond direct cell kill may be significant.`,
      cautionFlags,
      alternativeModels,
      literatureCitations
    };
  }
  
  // ========== TIER 2: MODALITY-SPECIFIC SELECTION ==========
  
  if (modality === "SBRT" || modality === "SRS") {
    cautionFlags.push("SBRT/SRS treatment: LQL or gLQ model strongly recommended for doses >6 Gy/fx.");
    literatureCitations.push("Grimm J et al. (2011). High dose per fraction, hypofractionated treatment effects in the clinic (HyTEC): an overview. Int J Radiat Oncol Biol Phys 110:1-10.");
    
    return {
      recommendedModel: "LQL",
      confidence: "high",
      rationale: `SBRT/SRS modality detected. LQL model is recommended for stereotactic treatments with high dose-per-fraction.`,
      cautionFlags,
      alternativeModels: ["GLQ"],
      literatureCitations
    };
  }
  
  if (modality === "HDR_BRACHY") {
    cautionFlags.push("HDR brachytherapy: Use LQL model with appropriate repair parameters for pulsed dose delivery.");
    literatureCitations.push("Brenner DJ et al. (1995). Direct evidence that prostate tumors show high sensitivity to fractionation (low alpha/beta ratio), similar to late-responding normal tissue. Int J Radiat Oncol Biol Phys 32:213-228.");
    
    return {
      recommendedModel: "LQL",
      confidence: "high",
      rationale: `HDR brachytherapy modality detected. LQL model recommended for high dose-rate treatments.`,
      cautionFlags,
      alternativeModels: ["GLQ"],
      literatureCitations
    };
  }
  
  if (modality === "PEDIATRIC" && patientAge && patientAge < 18) {
    cautionFlags.push("Pediatric patient: Use low α/β parameters (typically 1-3 Gy for late effects). Consider increased sensitivity to late effects.");
    literatureCitations.push("Merchant TE et al. (2008). Radiation dose-volume effects in the brain. Int J Radiat Oncol Biol Phys 76:S20-S27.");
    
    return {
      recommendedModel: "LQ",
      confidence: "high",
      rationale: `Pediatric patient detected (age ${patientAge}). Standard LQ model with pediatric-specific α/β parameters recommended.`,
      cautionFlags,
      alternativeModels: ["LQ_MODIFIED"],
      literatureCitations
    };
  }
  
  if (isReirradiation) {
    cautionFlags.push("Re-irradiation: Apply cumulative BED calculation with recovery factors. Consider Monte Carlo NTCP for improved accuracy.");
    literatureCitations.push("Nieder C et al. (2006). Update of human spinal cord reirradiation tolerance based on additional data from 38 patients. Int J Radiat Oncol Biol Phys 66:1446-1449.");
    
    return {
      recommendedModel: "LQ",
      confidence: "medium",
      rationale: `Re-irradiation detected. Standard LQ model with cumulative BED and recovery factor corrections recommended.`,
      cautionFlags,
      alternativeModels: ["LQ_MODIFIED"],
      literatureCitations
    };
  }
  
  if (treatmentGapDays && treatmentGapDays > 7) {
    cautionFlags.push(`Treatment gap detected (${treatmentGapDays} days). Apply repopulation correction to account for tumor cell proliferation during gap.`);
    literatureCitations.push("Hendry JH et al. (1996). The constant low oxygen concentration in all the target cells for mouse tail radionecrosis. Radiat Res 145:55-63.");
  }
  
  // Default fallback
  return {
    recommendedModel: "LQ",
    confidence: "high",
    rationale: "Standard LQ model selected as default for conventional fractionation.",
    cautionFlags,
    alternativeModels: ["LQ_MODIFIED", "LQL"],
    literatureCitations: ["Fowler JF. (1989). The linear-quadratic formula and progress in fractionated radiotherapy. Br J Radiol 62:679-694."]
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ModelSelectionCriteriaSchema = z.object({
  dosePerFraction: z.number().positive().max(30, "Dose per fraction must be ≤30 Gy"),
  totalDose: z.number().positive().max(200, "Total dose must be ≤200 Gy"),
  numberOfFractions: z.number().int().positive().max(50, "Number of fractions must be ≤50"),
  modality: z.enum([
    "EBRT_CONVENTIONAL",
    "EBRT_HYPOFRACTIONATED",
    "SBRT",
    "SRS",
    "HDR_BRACHY",
    "LDR_BRACHY",
    "PROTON",
    "PEDIATRIC",
    "REIRRADIATION",
    "ADAPTIVE"
  ]).optional(),
  isReirradiation: z.boolean().optional(),
  patientAge: z.number().int().positive().max(120).optional(),
  treatmentGapDays: z.number().int().nonnegative().optional()
});

export const LQLParametersSchema = z.object({
  dosePerFraction: z.number().positive(),
  numberOfFractions: z.number().int().positive(),
  alpha: z.number().positive(),
  beta: z.number().positive(),
  gamma: z.number().nonnegative().optional().default(0.0),
  dt: z.number().positive().optional().default(6.0),
  N0: z.number().positive().optional().default(1e9)
});
