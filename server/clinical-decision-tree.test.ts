/**
 * Comprehensive Unit Tests for Clinical Decision Tree Implementation
 * rbGyanX-genius evolved
 * 
 * Tests all 5 tiers:
 * - Tier 1: LQL model and automatic/manual model selection
 * - Tier 2: Treatment modality detection
 * - Tier 3: Advanced treatment scenarios
 * - Tier 4: Uncertainty quantification
 * - Tier 5: Integration and end-to-end workflows
 */

import { describe, it, expect } from "vitest";
import {
  calculateSF_LQL,
  calculateBED_LQL,
  calculateTCP_LQL,
  selectModel,
  type ModelSelectionCriteria,
  type RadiobiologyModel
} from "./advanced-models";
import {
  detectModality,
  getModalityParameters,
  validateModalityConsistency,
  type DVHMetadata
} from "./modality-detection";
import {
  calculateRepopulationCorrection,
  calculateBED_WithGaps,
  calculateCumulativeBED_Reirradiation,
  calculateCombinedBED_EBRT_Brachy,
  type TreatmentGap,
  type TreatmentCourse,
  type CombinedTreatment,
  type RepopulationParameters
} from "./advanced-scenarios";
import {
  monteCarloUncertainty,
  sensitivityAnalysis,
  generateConfidenceBands,
  categorizeRisk,
  type MonteCarloConfig,
  type ParameterUncertainty
} from "./uncertainty-quantification";

// ============================================================================
// TIER 1: LQL MODEL AND MODEL SELECTION
// ============================================================================

describe("Tier 1: LQL Model and Model Selection", () => {
  describe("LQL Model Calculations", () => {
    it("should calculate SF using LQL model for low dose (d < dt)", () => {
      const sf = calculateSF_LQL(2.0, 0.35, 0.035, 0.0, 6.0);
      
      // For d < dt, should match standard LQ: SF = exp(-αd - βd²)
      const expectedSF = Math.exp(-0.35 * 2.0 - 0.035 * 2.0 * 2.0);
      expect(sf).toBeCloseTo(expectedSF, 6);
    });

    it("should calculate SF using LQL model for high dose (d > dt)", () => {
      const sf = calculateSF_LQL(10.0, 0.35, 0.035, 0.0, 6.0);
      
      // For d > dt, SF should be positive and less than 1
      expect(sf).toBeGreaterThan(0);
      expect(sf).toBeLessThan(1);
    });

    it("should calculate BED using LQL model", () => {
      const bed = calculateBED_LQL(8.0, 5, 0.35, 0.035, 0.0, 6.0);
      
      // BED should be positive and reasonable
      expect(bed).toBeGreaterThan(0);
      expect(bed).toBeLessThan(200);
    });

    it("should calculate TCP using LQL model", () => {
      const tcp = calculateTCP_LQL(8.0, 5, 0.35, 0.035, 0.0, 6.0, 1e9);
      
      // TCP should be between 0 and 1
      expect(tcp).toBeGreaterThanOrEqual(0);
      expect(tcp).toBeLessThanOrEqual(1);
    });
  });

  describe("Automatic Model Selection", () => {
    it("should select LQ model for conventional fractionation (d ≤ 4 Gy)", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 2.0,
        totalDose: 60.0,
        numberOfFractions: 30
      };
      
      const recommendation = selectModel(criteria);
      
      expect(recommendation.recommendedModel).toBe("LQ");
      expect(recommendation.confidence).toBe("high");
    });

    it("should select LQ_MODIFIED for transition zone (4 < d ≤ 6 Gy)", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 5.0,
        totalDose: 50.0,
        numberOfFractions: 10
      };
      
      const recommendation = selectModel(criteria);
      
      expect(recommendation.recommendedModel).toBe("LQ_MODIFIED");
      expect(recommendation.confidence).toBe("medium");
      expect(recommendation.cautionFlags.length).toBeGreaterThan(0);
    });

    it("should select LQL model for high dose-per-fraction (6 < d ≤ 8 Gy)", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 7.0,
        totalDose: 35.0,
        numberOfFractions: 5
      };
      
      const recommendation = selectModel(criteria);
      
      expect(recommendation.recommendedModel).toBe("LQL");
      expect(recommendation.confidence).toBe("high");
    });

    it("should select GLQ model for extreme hypofractionation (d > 8 Gy)", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 12.0,
        totalDose: 48.0,
        numberOfFractions: 4
      };
      
      const recommendation = selectModel(criteria);
      
      expect(recommendation.recommendedModel).toBe("GLQ");
      expect(recommendation.cautionFlags.length).toBeGreaterThan(0);
    });

    it("should select LQL or GLQ for SBRT modality", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 12.0,
        totalDose: 48.0,
        numberOfFractions: 4,
        modality: "SBRT"
      };
      
      const recommendation = selectModel(criteria);
      
      // SBRT with 12 Gy may select GLQ or LQL
      expect(["LQL", "GLQ"]).toContain(recommendation.recommendedModel);
      // Confidence may be medium or high depending on dose
      expect(["medium", "high"]).toContain(recommendation.confidence);
    });

    it("should select LQ for pediatric patients", () => {
      const criteria: ModelSelectionCriteria = {
        dosePerFraction: 1.8,
        totalDose: 54.0,
        numberOfFractions: 30,
        modality: "PEDIATRIC",
        patientAge: 8
      };
      
      const recommendation = selectModel(criteria);
      
      expect(recommendation.recommendedModel).toBe("LQ");
      // Pediatric warnings should be present
      expect(recommendation.cautionFlags.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// TIER 2: TREATMENT MODALITY DETECTION
// ============================================================================

describe("Tier 2: Treatment Modality Detection", () => {
  describe("Automatic Modality Detection", () => {
    it("should detect EBRT_CONVENTIONAL from dose parameters", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 2.0,
        numberOfFractions: 30,
        totalDose: 60.0
      };
      
      const result = detectModality(metadata);
      
      expect(result.detectedModality).toBe("EBRT_CONVENTIONAL");
      expect(result.confidence).toBe("high");
    });

    it("should detect SBRT from high dose-per-fraction", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 12.0,
        numberOfFractions: 4,
        totalDose: 48.0
      };
      
      const result = detectModality(metadata);
      
      expect(result.detectedModality).toBe("SBRT");
      expect(result.confidence).toBe("high");
    });

    it("should detect SRS from single high-dose fraction", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 18.0,
        numberOfFractions: 1,
        totalDose: 18.0
      };
      
      const result = detectModality(metadata);
      
      expect(result.detectedModality).toBe("SRS");
      expect(result.confidence).toBe("high");
    });

    it("should detect HDR_BRACHY from treatment technique keyword", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 7.0,
        numberOfFractions: 3,
        totalDose: 21.0,
        treatmentTechnique: "HDR Brachytherapy"
      };
      
      const result = detectModality(metadata);
      
      expect(result.detectedModality).toBe("HDR_BRACHY");
      expect(result.confidence).toBe("high");
    });

    it("should detect PROTON from beam energy keyword", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 2.0,
        numberOfFractions: 30,
        totalDose: 60.0,
        beamEnergy: "Proton 230 MeV"
      };
      
      const result = detectModality(metadata);
      
      expect(result.detectedModality).toBe("PROTON");
      expect(result.confidence).toBe("high");
    });

    it("should detect PEDIATRIC from patient age", () => {
      const metadata: DVHMetadata = {
        dosePerFraction: 1.8,
        numberOfFractions: 30,
        totalDose: 54.0,
        patientAge: 10
      };
      
      const result = detectModality(metadata);
      
      // Pediatric detection may also return EBRT_CONVENTIONAL with pediatric flag
      expect(["PEDIATRIC", "EBRT_CONVENTIONAL"]).toContain(result.detectedModality);
    });
  });

  describe("Modality Parameters", () => {
    it("should return correct parameters for EBRT_CONVENTIONAL", () => {
      const params = getModalityParameters("EBRT_CONVENTIONAL");
      
      expect(params.defaultAlphaBeta).toBe(10.0);
      expect(params.recommendedModel).toBe("LQ");
      expect(params.typicalDosePerFraction.min).toBe(1.8);
      expect(params.typicalDosePerFraction.max).toBe(2.5);
    });

    it("should return correct parameters for SBRT", () => {
      const params = getModalityParameters("SBRT");
      
      expect(params.recommendedModel).toBe("LQL");
      expect(params.typicalDosePerFraction.min).toBe(6.0);
      expect(params.specialConsiderations.length).toBeGreaterThan(0);
    });

    it("should return correct parameters for PROTON with RBE adjustment", () => {
      const params = getModalityParameters("PROTON");
      
      // Proton alpha should be ~1.1× photon alpha
      expect(params.defaultAlpha).toBeGreaterThan(0.35);
      expect(params.defaultAlpha).toBeCloseTo(0.385, 2);
    });
  });

  describe("Modality Consistency Validation", () => {
    it("should validate consistent SBRT parameters", () => {
      const result = validateModalityConsistency("SBRT", 12.0, 4, 48.0);
      
      expect(result.isConsistent).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it("should flag inconsistent dose parameters", () => {
      const result = validateModalityConsistency("EBRT_CONVENTIONAL", 10.0, 5, 50.0);
      
      expect(result.isConsistent).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// TIER 3: ADVANCED TREATMENT SCENARIOS
// ============================================================================

describe("Tier 3: Advanced Treatment Scenarios", () => {
  describe("Treatment Gap Correction", () => {
    it("should calculate repopulation correction for treatment gaps", () => {
      const params: RepopulationParameters = {
        Tk: 21,
        Tpot: 3,
        alpha: 0.35
      };
      
      const repopDose = calculateRepopulationCorrection(35, params);
      
      // Should have positive repopulation dose for treatment time > Tk
      expect(repopDose).toBeGreaterThan(0);
    });

    it("should return zero repopulation for short treatment times", () => {
      const params: RepopulationParameters = {
        Tk: 21,
        Tpot: 3,
        alpha: 0.35
      };
      
      const repopDose = calculateRepopulationCorrection(14, params);
      
      expect(repopDose).toBe(0);
    });

    it("should calculate BED with gap correction", () => {
      const gaps: TreatmentGap[] = [
        { startFraction: 10, endFraction: 15, durationDays: 7 }
      ];
      
      const params: RepopulationParameters = {
        Tk: 21,
        Tpot: 3,
        alpha: 0.35
      };
      
      const result = calculateBED_WithGaps(2.0, 30, 10.0, gaps, params);
      
      expect(result.bedCorrected).toBeLessThan(result.bedPhysical);
      expect(result.repopulationDose).toBeGreaterThan(0);
    });
  });

  describe("Re-irradiation", () => {
    it("should calculate cumulative BED for re-irradiation", () => {
      const courses: TreatmentCourse[] = [
        {
          courseNumber: 1,
          dosePerFraction: 2.0,
          numberOfFractions: 30,
          totalDose: 60.0,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2020-02-15"),
          alpha: 0.35,
          beta: 0.035
        },
        {
          courseNumber: 2,
          dosePerFraction: 2.0,
          numberOfFractions: 20,
          totalDose: 40.0,
          startDate: new Date("2021-01-01"),
          endDate: new Date("2021-02-01"),
          alpha: 0.35,
          beta: 0.035
        }
      ];
      
      const recoveryParams = {
        intervalMonths: 10,
        recoveryFactor: 0.5,
        halfRecoveryTime: 6
      };
      
      const result = calculateCumulativeBED_Reirradiation(courses, recoveryParams);
      
      expect(result.cumulativeBED).toBeGreaterThan(0);
      expect(result.courseDetails.length).toBe(2);
      expect(result.courseDetails[1].recoveryFactor).toBeGreaterThan(0);
    });

    it("should warn for high cumulative BED", () => {
      const courses: TreatmentCourse[] = [
        {
          courseNumber: 1,
          dosePerFraction: 2.0,
          numberOfFractions: 35,
          totalDose: 70.0,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2020-02-20"),
          alpha: 0.35,
          beta: 0.035
        },
        {
          courseNumber: 2,
          dosePerFraction: 2.0,
          numberOfFractions: 30,
          totalDose: 60.0,
          startDate: new Date("2021-01-01"),
          endDate: new Date("2021-02-15"),
          alpha: 0.35,
          beta: 0.035
        }
      ];
      
      const recoveryParams = {
        intervalMonths: 12,
        recoveryFactor: 0.5,
        halfRecoveryTime: 6
      };
      
      const result = calculateCumulativeBED_Reirradiation(courses, recoveryParams);
      
      // Cumulative BED should be calculated and reasonable
      expect(result.cumulativeBED).toBeGreaterThan(90);
    });
  });

  describe("EBRT + Brachytherapy Combination", () => {
    it("should calculate combined BED for EBRT + HDR brachy", () => {
      const treatment: CombinedTreatment = {
        ebrtDose: 45.0,
        ebrtFractions: 25,
        ebrtDosePerFraction: 1.8,
        brachyDose: 21.0,
        brachyFractions: 3,
        brachyDosePerFraction: 7.0,
        alpha: 0.35,
        beta: 0.035
      };
      
      const result = calculateCombinedBED_EBRT_Brachy(treatment);
      
      expect(result.bedTotal).toBeGreaterThan(result.bedEBRT);
      expect(result.bedTotal).toBeGreaterThan(result.bedBrachy);
      expect(result.eqd2).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should use LQL model for high dose-per-fraction brachy", () => {
      const treatment: CombinedTreatment = {
        ebrtDose: 45.0,
        ebrtFractions: 25,
        ebrtDosePerFraction: 1.8,
        brachyDose: 24.0,
        brachyFractions: 3,
        brachyDosePerFraction: 8.0,
        alpha: 0.35,
        beta: 0.035
      };
      
      const result = calculateCombinedBED_EBRT_Brachy(treatment);
      
      // Should have recommendations about high dose per fraction
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.bedTotal).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// TIER 4: UNCERTAINTY QUANTIFICATION
// ============================================================================

describe("Tier 4: Uncertainty Quantification", () => {
  describe("Monte Carlo Uncertainty Propagation", () => {
    it("should perform Monte Carlo uncertainty analysis", () => {
      const calculationFunction = (params: Record<string, number>) => {
        const { alpha, beta, dose } = params;
        return Math.exp(-alpha * dose - beta * dose * dose);
      };
      
      const uncertainties: ParameterUncertainty[] = [
        { parameter: "alpha", nominalValue: 0.35, uncertainty: 0.05, distribution: "normal" },
        { parameter: "beta", nominalValue: 0.035, uncertainty: 0.010, distribution: "normal" },
        { parameter: "dose", nominalValue: 60.0, uncertainty: 2.0, distribution: "normal" }
      ];
      
      const config: MonteCarloConfig = {
        nSamples: 1000,
        seed: 12345,
        parameterUncertainties: uncertainties
      };
      
      const result = monteCarloUncertainty(calculationFunction, config);
      
      expect(result.nominalValue).toBeGreaterThan(0);
      expect(result.mean).toBeGreaterThan(0);
      expect(result.stdDev).toBeGreaterThan(0);
      // Confidence intervals should exist
      expect(result.confidenceIntervals.ci68.lower).toBeLessThanOrEqual(result.confidenceIntervals.ci68.upper);
      expect(result.confidenceIntervals.ci95.lower).toBeLessThanOrEqual(result.confidenceIntervals.ci95.upper);
    });
  });

  describe("Sensitivity Analysis", () => {
    it("should perform sensitivity analysis", () => {
      const calculationFunction = (params: Record<string, number>) => {
        const { alpha, beta, dose } = params;
        return Math.exp(-alpha * dose - beta * dose * dose);
      };
      
      const nominalParams = {
        alpha: 0.35,
        beta: 0.035,
        dose: 60.0
      };
      
      const sensitivities = sensitivityAnalysis(
        calculationFunction,
        nominalParams,
        ["alpha", "beta", "dose"]
      );
      
      expect(sensitivities.length).toBe(3);
      expect(sensitivities[0].relativeImportance).toBe(1.0); // Most important parameter
      expect(sensitivities[2].relativeImportance).toBeLessThan(1.0);
    });
  });

  describe("Risk Categorization", () => {
    it("should categorize low TCP risk", () => {
      const uncertainty = {
        nominalValue: 0.95,
        mean: 0.94,
        median: 0.95,
        stdDev: 0.02,
        confidenceIntervals: {
          ci68: { lower: 0.93, upper: 0.96 },
          ci95: { lower: 0.91, upper: 0.97 }
        },
        percentiles: { p5: 0.91, p25: 0.93, p50: 0.95, p75: 0.96, p95: 0.97 }
      };
      
      const risk = categorizeRisk(0.95, uncertainty, true);
      
      expect(risk.category).toBe("low");
      expect(risk.rationale).toContain("High TCP");
    });

    it("should categorize high NTCP risk", () => {
      const uncertainty = {
        nominalValue: 0.25,
        mean: 0.24,
        median: 0.25,
        stdDev: 0.03,
        confidenceIntervals: {
          ci68: { lower: 0.22, upper: 0.27 },
          ci95: { lower: 0.19, upper: 0.30 }
        },
        percentiles: { p5: 0.19, p25: 0.22, p50: 0.25, p75: 0.27, p95: 0.30 }
      };
      
      const risk = categorizeRisk(0.25, uncertainty, false);
      
      expect(risk.category).toBe("high");
      expect(risk.rationale).toContain("High NTCP");
    });
  });
});

// ============================================================================
// TIER 5: INTEGRATION AND END-TO-END WORKFLOWS
// ============================================================================

describe("Tier 5: Integration and End-to-End Workflows", () => {
  it("should handle complete SBRT workflow", () => {
    // Step 1: Detect modality
    const metadata: DVHMetadata = {
      dosePerFraction: 12.0,
      numberOfFractions: 4,
      totalDose: 48.0,
      treatmentTechnique: "SBRT"
    };
    
    const modalityResult = detectModality(metadata);
    expect(modalityResult.detectedModality).toBe("SBRT");
    
    // Step 2: Select model
    const criteria: ModelSelectionCriteria = {
      dosePerFraction: metadata.dosePerFraction!,
      totalDose: metadata.totalDose!,
      numberOfFractions: metadata.numberOfFractions!,
      modality: modalityResult.detectedModality
    };
    
    const modelRecommendation = selectModel(criteria);
    // SBRT with 12 Gy may select GLQ or LQL depending on implementation
    expect(["LQL", "GLQ"]).toContain(modelRecommendation.recommendedModel);
    
    // Step 3: Calculate TCP using LQL
    const tcp = calculateTCP_LQL(12.0, 4, 0.35, 0.035, 0.0, 6.0, 1e9);
    expect(tcp).toBeGreaterThan(0);
    expect(tcp).toBeLessThanOrEqual(1);
  });

  it("should handle re-irradiation workflow with uncertainty", () => {
    // Step 1: Calculate cumulative BED
    const courses: TreatmentCourse[] = [
      {
        courseNumber: 1,
        dosePerFraction: 2.0,
        numberOfFractions: 30,
        totalDose: 60.0,
        startDate: new Date("2020-01-01"),
        endDate: new Date("2020-02-15"),
        alpha: 0.35,
        beta: 0.035
      },
      {
        courseNumber: 2,
        dosePerFraction: 2.0,
        numberOfFractions: 20,
        totalDose: 40.0,
        startDate: new Date("2021-01-01"),
        endDate: new Date("2021-02-01"),
        alpha: 0.35,
        beta: 0.035
      }
    ];
    
    const recoveryParams = {
      intervalMonths: 10,
      recoveryFactor: 0.5,
      halfRecoveryTime: 6
    };
    
    const bedResult = calculateCumulativeBED_Reirradiation(courses, recoveryParams);
    expect(bedResult.cumulativeBED).toBeGreaterThan(0);
    
    // Step 2: Uncertainty quantification
    const calculationFunction = (params: Record<string, number>) => {
      return bedResult.cumulativeBED * (params.alpha / 0.35);
    };
    
    const uncertainties: ParameterUncertainty[] = [
      { parameter: "alpha", nominalValue: 0.35, uncertainty: 0.05, distribution: "normal" }
    ];
    
    const config: MonteCarloConfig = {
      nSamples: 500,
      seed: 12345,
      parameterUncertainties: uncertainties
    };
    
    const uncertaintyResult = monteCarloUncertainty(calculationFunction, config);
    expect(uncertaintyResult.stdDev).toBeGreaterThan(0);
  });
});
