/**
 * Treatment Modality Detection and Parameter Lookup
 * for rbGyanX-genius evolved
 * 
 * Implements automatic detection of treatment modality from DVH metadata
 * and provides modality-specific radiobiological parameters.
 * 
 * References:
 * - Benedict SH et al. (2010). Stereotactic body radiation therapy: The report of AAPM Task Group 101. Med Phys 37:4078-4101.
 * - Nath R et al. (2009). Dosimetry of interstitial brachytherapy sources: Recommendations of the AAPM Radiation Therapy Committee Task Group No. 43. Med Phys 22:209-234.
 * - Paganetti H. (2014). Relative biological effectiveness (RBE) values for proton beam therapy. Int J Radiat Oncol Biol Phys 90:1001-1008.
 */

import { z } from "zod";
import type { TreatmentModality, RadiobiologyModel } from "./advanced-models";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ModalityParameters {
  modality: TreatmentModality;
  defaultAlpha: number;      // Gy⁻¹
  defaultBeta: number;       // Gy⁻²
  defaultAlphaBeta: number;  // Gy
  recommendedModel: RadiobiologyModel;
  typicalDosePerFraction: { min: number; max: number };  // Gy
  typicalTotalDose: { min: number; max: number };        // Gy
  typicalFractions: { min: number; max: number };
  specialConsiderations: string[];
  literatureCitations: string[];
}

export interface ModalityDetectionResult {
  detectedModality: TreatmentModality;
  confidence: "high" | "medium" | "low";
  detectionMethod: string;
  parameters: ModalityParameters;
  warnings: string[];
}

export interface DVHMetadata {
  dosePerFraction?: number;
  numberOfFractions?: number;
  totalDose?: number;
  treatmentTechnique?: string;
  beamEnergy?: string;
  machineType?: string;
  structureName?: string;
  patientAge?: number;
  treatmentIntent?: "curative" | "palliative";
}

// ============================================================================
// MODALITY-SPECIFIC PARAMETERS DATABASE
// ============================================================================

export const MODALITY_PARAMETERS: Record<TreatmentModality, ModalityParameters> = {
  EBRT_CONVENTIONAL: {
    modality: "EBRT_CONVENTIONAL",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 1.8, max: 2.5 },
    typicalTotalDose: { min: 45, max: 70 },
    typicalFractions: { min: 20, max: 35 },
    specialConsiderations: [
      "Standard LQ model is well-validated for conventional fractionation",
      "α/β = 10 Gy for early-responding tissues and most tumors",
      "α/β = 3 Gy for late-responding normal tissues",
      "Repopulation may be significant for treatment durations >4 weeks"
    ],
    literatureCitations: [
      "Fowler JF. (1989). The linear-quadratic formula and progress in fractionated radiotherapy. Br J Radiol 62:679-694.",
      "Thames HD et al. (1990). The role of overall treatment time in the outcome of radiotherapy of carcinoma of the larynx. Int J Radiat Oncol Biol Phys 19:1311-1315."
    ]
  },

  EBRT_HYPOFRACTIONATED: {
    modality: "EBRT_HYPOFRACTIONATED",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ_MODIFIED",
    typicalDosePerFraction: { min: 2.5, max: 6.0 },
    typicalTotalDose: { min: 40, max: 70 },
    typicalFractions: { min: 5, max: 20 },
    specialConsiderations: [
      "Modified LQ or LQL model recommended for doses >4 Gy/fx",
      "Consider α/β = 1.5-3 Gy for prostate cancer",
      "Late effects may be more pronounced than with conventional fractionation",
      "Careful attention to dose constraints for organs at risk"
    ],
    literatureCitations: [
      "Brenner DJ, Hall EJ. (1999). Fractionation and protraction for radiotherapy of prostate carcinoma. Int J Radiat Oncol Biol Phys 43:1095-1101.",
      "Dearnaley D et al. (2016). Conventional versus hypofractionated high-dose intensity-modulated radiotherapy for prostate cancer: 5-year outcomes of the randomised, non-inferiority, phase 3 CHHiP trial. Lancet Oncol 17:1047-1060."
    ]
  },

  SBRT: {
    modality: "SBRT",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQL",
    typicalDosePerFraction: { min: 6.0, max: 20.0 },
    typicalTotalDose: { min: 30, max: 60 },
    typicalFractions: { min: 1, max: 5 },
    specialConsiderations: [
      "LQL or gLQ model required for accurate TCP/NTCP prediction",
      "Vascular damage and immune effects may contribute to tumor control",
      "Steep dose gradients require careful normal tissue sparing",
      "Motion management and image guidance critical",
      "Consider 4D planning for moving targets (lung, liver)"
    ],
    literatureCitations: [
      "Benedict SH et al. (2010). Stereotactic body radiation therapy: The report of AAPM Task Group 101. Med Phys 37:4078-4101.",
      "Grimm J et al. (2021). High dose per fraction, hypofractionated treatment effects in the clinic (HyTEC): an overview. Int J Radiat Oncol Biol Phys 110:1-10.",
      "Brown JM et al. (2014). The tumor radiobiology of SRS and SBRT: are more than the 5 Rs involved? Int J Radiat Oncol Biol Phys 88:254-262."
    ]
  },

  SRS: {
    modality: "SRS",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQL",
    typicalDosePerFraction: { min: 12.0, max: 25.0 },
    typicalTotalDose: { min: 12.0, max: 25.0 },
    typicalFractions: { min: 1, max: 1 },
    specialConsiderations: [
      "Single fraction stereotactic radiosurgery",
      "LQL model strongly recommended for doses >12 Gy",
      "Vascular occlusion may be primary mechanism for AVMs",
      "Steep dose fall-off critical for normal tissue sparing",
      "Consider radionecrosis risk for brain metastases"
    ],
    literatureCitations: [
      "Kirkpatrick JP et al. (2008). The linear-quadratic model is inappropriate to model high dose per fraction effects in radiosurgery. Semin Radiat Oncol 18:240-243.",
      "Shaw E et al. (2000). Single dose radiosurgical treatment of recurrent previously irradiated primary brain tumors and brain metastases: final report of RTOG protocol 90-05. Int J Radiat Oncol Biol Phys 47:291-298."
    ]
  },

  HDR_BRACHY: {
    modality: "HDR_BRACHY",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQL",
    typicalDosePerFraction: { min: 4.0, max: 15.0 },
    typicalTotalDose: { min: 15, max: 40 },
    typicalFractions: { min: 1, max: 6 },
    specialConsiderations: [
      "High dose rate (>12 Gy/h) requires LQL model",
      "Pulsed dose rate (PDR) may allow standard LQ model",
      "Consider repair kinetics for fractionated HDR",
      "Steep dose gradients allow high tumor dose with normal tissue sparing",
      "Often combined with EBRT (use gLQ for summation)"
    ],
    literatureCitations: [
      "Nath R et al. (2009). Dosimetry of interstitial brachytherapy sources: Recommendations of the AAPM Radiation Therapy Committee Task Group No. 43. Med Phys 22:209-234.",
      "Brenner DJ et al. (1995). Direct evidence that prostate tumors show high sensitivity to fractionation (low alpha/beta ratio), similar to late-responding normal tissue. Int J Radiat Oncol Biol Phys 32:213-228."
    ]
  },

  LDR_BRACHY: {
    modality: "LDR_BRACHY",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 0.4, max: 2.0 },
    typicalTotalDose: { min: 100, max: 160 },
    typicalFractions: { min: 1, max: 1 },
    specialConsiderations: [
      "Low dose rate (<2 Gy/h) allows continuous repair during irradiation",
      "Standard LQ model applicable with repair correction",
      "Permanent implants (I-125, Pd-103) for prostate",
      "Temporary implants for gynecologic malignancies",
      "Consider dose rate effects on α/β ratio"
    ],
    literatureCitations: [
      "Dale RG. (1985). The application of the linear-quadratic dose-effect equation to fractionated and protracted radiotherapy. Br J Radiol 58:515-528.",
      "Ling CC. (1992). Permanent implants using Au-198, Pd-103 and I-125: radiobiological considerations based on the linear quadratic model. Int J Radiat Oncol Biol Phys 23:81-87."
    ]
  },

  PROTON: {
    modality: "PROTON",
    defaultAlpha: 0.385,  // RBE = 1.1 × photon alpha
    defaultBeta: 0.0385,  // RBE = 1.1 × photon beta
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 1.8, max: 3.0 },
    typicalTotalDose: { min: 45, max: 80 },
    typicalFractions: { min: 20, max: 40 },
    specialConsiderations: [
      "Generic RBE = 1.1 commonly used (may vary with depth, LET)",
      "Variable RBE models under investigation (McNamara, Wedenberg)",
      "Proton range uncertainties require robust planning",
      "Reduced integral dose compared to photons",
      "Consider LET effects at distal edge of spread-out Bragg peak"
    ],
    literatureCitations: [
      "Paganetti H. (2014). Relative biological effectiveness (RBE) values for proton beam therapy. Int J Radiat Oncol Biol Phys 90:1001-1008.",
      "Paganetti H et al. (2002). Relative biological effectiveness (RBE) values for proton beam therapy. Variations as a function of biological endpoint, dose, and linear energy transfer. Phys Med Biol 47:3365-3398."
    ]
  },

  PEDIATRIC: {
    modality: "PEDIATRIC",
    defaultAlpha: 0.35,
    defaultBeta: 0.117,  // Lower α/β = 3 Gy for late effects
    defaultAlphaBeta: 3.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 1.5, max: 2.0 },
    typicalTotalDose: { min: 20, max: 60 },
    typicalFractions: { min: 10, max: 35 },
    specialConsiderations: [
      "Use low α/β (1-3 Gy) for late effects in developing tissues",
      "Minimize dose to growing bones and organs",
      "Consider long-term risks: secondary malignancies, growth impairment",
      "Proton therapy often preferred to reduce integral dose",
      "Careful attention to neurocognitive effects for brain tumors"
    ],
    literatureCitations: [
      "Merchant TE et al. (2008). Radiation dose-volume effects in the brain. Int J Radiat Oncol Biol Phys 76:S20-S27.",
      "Constine LS et al. (2008). Pediatric normal tissue effects in the clinic (PENTEC): an international collaboration to analyse normal tissue radiation dose-volume response relationships for paediatric cancer patients. Clin Oncol 31:199-207."
    ]
  },

  REIRRADIATION: {
    modality: "REIRRADIATION",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 1.8, max: 3.0 },
    typicalTotalDose: { min: 30, max: 60 },
    typicalFractions: { min: 10, max: 30 },
    specialConsiderations: [
      "Calculate cumulative BED from all courses",
      "Apply recovery factor (typically 0.5-0.7) for interval >6 months",
      "Spinal cord tolerance: cumulative BED ≤120-135 Gy₂",
      "Careful assessment of normal tissue tolerance",
      "Consider Monte Carlo NTCP for improved accuracy",
      "Document previous treatment details carefully"
    ],
    literatureCitations: [
      "Nieder C et al. (2006). Update of human spinal cord reirradiation tolerance based on additional data from 38 patients. Int J Radiat Oncol Biol Phys 66:1446-1449.",
      "Kirkpatrick JP et al. (2010). Defining the optimal time for reirradiation after initial treatment. Int J Radiat Oncol Biol Phys 76:S128-S133."
    ]
  },

  ADAPTIVE: {
    modality: "ADAPTIVE",
    defaultAlpha: 0.35,
    defaultBeta: 0.035,
    defaultAlphaBeta: 10.0,
    recommendedModel: "LQ",
    typicalDosePerFraction: { min: 1.8, max: 3.0 },
    typicalTotalDose: { min: 45, max: 70 },
    typicalFractions: { min: 20, max: 35 },
    specialConsiderations: [
      "Adaptive replanning based on tumor response or anatomical changes",
      "Fast TCP/NTCP recalculation required for plan comparison",
      "EUD-based metrics useful for plan ranking",
      "Consider accumulated dose from previous fractions",
      "Online adaptive RT requires real-time dose calculation"
    ],
    literatureCitations: [
      "Yan D et al. (1997). Adaptive radiation therapy. Phys Med Biol 42:123-132.",
      "Schwartz DL et al. (2012). Adaptive radiotherapy for head-and-neck cancer: initial clinical outcomes from a prospective trial. Int J Radiat Oncol Biol Phys 83:986-993."
    ]
  }
};

// ============================================================================
// AUTOMATIC MODALITY DETECTION
// ============================================================================

/**
 * Automatically detect treatment modality from DVH metadata
 */
export function detectModality(metadata: DVHMetadata): ModalityDetectionResult {
  const warnings: string[] = [];
  let detectedModality: TreatmentModality = "EBRT_CONVENTIONAL";
  let confidence: "high" | "medium" | "low" = "low";
  let detectionMethod = "default";

  const { dosePerFraction, numberOfFractions, totalDose, treatmentTechnique, beamEnergy, machineType, patientAge } = metadata;

  // ========== DETECTION LOGIC ==========

  // Check for pediatric patient
  if (patientAge && patientAge < 18) {
    detectedModality = "PEDIATRIC";
    confidence = "high";
    detectionMethod = "patient age";
    warnings.push(`Pediatric patient detected (age ${patientAge}). Use pediatric-specific parameters and low α/β for late effects.`);
  }

  // Check for SBRT/SRS based on dose per fraction
  if (dosePerFraction && dosePerFraction > 6.0) {
    if (numberOfFractions === 1) {
      detectedModality = "SRS";
      confidence = "high";
      detectionMethod = "single fraction with high dose";
    } else if (numberOfFractions && numberOfFractions <= 5) {
      detectedModality = "SBRT";
      confidence = "high";
      detectionMethod = "hypofractionation with high dose per fraction";
    } else {
      detectedModality = "EBRT_HYPOFRACTIONATED";
      confidence = "medium";
      detectionMethod = "high dose per fraction";
      warnings.push("High dose per fraction (>6 Gy) with >5 fractions. Consider if this is intentional hypofractionation.");
    }
  }

  // Check for hypofractionation
  if (dosePerFraction && dosePerFraction > 2.5 && dosePerFraction <= 6.0) {
    if (numberOfFractions && numberOfFractions <= 20) {
      detectedModality = "EBRT_HYPOFRACTIONATED";
      confidence = "high";
      detectionMethod = "moderate hypofractionation";
    }
  }

  // Check for conventional fractionation
  if (dosePerFraction && dosePerFraction >= 1.8 && dosePerFraction <= 2.5) {
    if (numberOfFractions && numberOfFractions >= 20) {
      detectedModality = "EBRT_CONVENTIONAL";
      confidence = "high";
      detectionMethod = "conventional fractionation pattern";
    }
  }

  // Check for brachytherapy based on technique or machine type
  if (treatmentTechnique && (treatmentTechnique.toLowerCase().includes("brachy") || treatmentTechnique.toLowerCase().includes("hdr"))) {
    if (dosePerFraction && dosePerFraction > 4.0) {
      detectedModality = "HDR_BRACHY";
      confidence = "high";
      detectionMethod = "treatment technique keyword + high dose per fraction";
    } else {
      detectedModality = "LDR_BRACHY";
      confidence = "high";
      detectionMethod = "treatment technique keyword + low dose rate";
    }
  }

  // Check for proton therapy
  if (beamEnergy && beamEnergy.toLowerCase().includes("proton")) {
    detectedModality = "PROTON";
    confidence = "high";
    detectionMethod = "beam energy keyword";
    warnings.push("Proton therapy detected. Generic RBE = 1.1 applied. Consider variable RBE for improved accuracy.");
  }

  // Check for SBRT/SRS based on machine type
  if (machineType && (machineType.toLowerCase().includes("cyberknife") || machineType.toLowerCase().includes("gamma knife") || machineType.toLowerCase().includes("tomotherapy"))) {
    detectedModality = "SBRT";
    confidence = "high";
    detectionMethod = "machine type keyword";
  }

  // Validation warnings
  if (dosePerFraction && totalDose && numberOfFractions) {
    const calculatedTotal = dosePerFraction * numberOfFractions;
    if (Math.abs(calculatedTotal - totalDose) > 1.0) {
      warnings.push(`Inconsistent dose data: ${dosePerFraction} Gy × ${numberOfFractions} fx = ${calculatedTotal.toFixed(1)} Gy, but total dose is ${totalDose.toFixed(1)} Gy.`);
    }
  }

  return {
    detectedModality,
    confidence,
    detectionMethod,
    parameters: MODALITY_PARAMETERS[detectedModality],
    warnings
  };
}

/**
 * Get modality-specific parameters
 */
export function getModalityParameters(modality: TreatmentModality): ModalityParameters {
  return MODALITY_PARAMETERS[modality];
}

/**
 * Validate if dose parameters are consistent with detected modality
 */
export function validateModalityConsistency(
  modality: TreatmentModality,
  dosePerFraction: number,
  numberOfFractions: number,
  totalDose: number
): { isConsistent: boolean; warnings: string[] } {
  const params = MODALITY_PARAMETERS[modality];
  const warnings: string[] = [];
  let isConsistent = true;

  // Check dose per fraction
  if (dosePerFraction < params.typicalDosePerFraction.min || dosePerFraction > params.typicalDosePerFraction.max) {
    warnings.push(
      `Dose per fraction (${dosePerFraction.toFixed(2)} Gy) is outside typical range for ${modality} (${params.typicalDosePerFraction.min}-${params.typicalDosePerFraction.max} Gy).`
    );
    isConsistent = false;
  }

  // Check number of fractions
  if (numberOfFractions < params.typicalFractions.min || numberOfFractions > params.typicalFractions.max) {
    warnings.push(
      `Number of fractions (${numberOfFractions}) is outside typical range for ${modality} (${params.typicalFractions.min}-${params.typicalFractions.max}).`
    );
    isConsistent = false;
  }

  // Check total dose
  if (totalDose < params.typicalTotalDose.min || totalDose > params.typicalTotalDose.max) {
    warnings.push(
      `Total dose (${totalDose.toFixed(1)} Gy) is outside typical range for ${modality} (${params.typicalTotalDose.min}-${params.typicalTotalDose.max} Gy).`
    );
    isConsistent = false;
  }

  return { isConsistent, warnings };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const DVHMetadataSchema = z.object({
  dosePerFraction: z.number().positive().optional(),
  numberOfFractions: z.number().int().positive().optional(),
  totalDose: z.number().positive().optional(),
  treatmentTechnique: z.string().optional(),
  beamEnergy: z.string().optional(),
  machineType: z.string().optional(),
  structureName: z.string().optional(),
  patientAge: z.number().int().positive().max(120).optional(),
  treatmentIntent: z.enum(["curative", "palliative"]).optional()
});
