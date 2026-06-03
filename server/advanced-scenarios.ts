/**
 * Advanced Treatment Scenarios for rbGyanX-genius evolved
 * 
 * Implements complex clinical scenarios:
 * - Treatment gaps with repopulation correction
 * - Re-irradiation with cumulative BED and recovery factors
 * - EBRT + Brachytherapy combination using gLQ
 * - Adaptive replanning with fast recalculation
 * 
 * References:
 * - Hendry JH et al. (1996). The constant low oxygen concentration in all the target cells for mouse tail radionecrosis. Radiat Res 145:55-63.
 * - Nieder C et al. (2006). Update of human spinal cord reirradiation tolerance based on additional data from 38 patients. Int J Radiat Oncol Biol Phys 66:1446-1449.
 * - Dale RG. (1989). Radiobiological assessment of permanent implants using tumour repopulation factors in the linear-quadratic model. Br J Radiol 62:241-244.
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TreatmentGap {
  startFraction: number;
  endFraction: number;
  durationDays: number;
}

export interface TreatmentCourse {
  courseNumber: number;
  dosePerFraction: number;
  numberOfFractions: number;
  totalDose: number;
  startDate: Date;
  endDate: Date;
  alpha: number;
  beta: number;
}

export interface CombinedTreatment {
  ebrtDose: number;
  ebrtFractions: number;
  ebrtDosePerFraction: number;
  brachyDose: number;
  brachyFractions: number;
  brachyDosePerFraction: number;
  alpha: number;
  beta: number;
}

export interface RepopulationParameters {
  Tk: number;        // Kickoff time for repopulation (days)
  Tpot: number;      // Potential doubling time (days)
  alpha: number;     // Linear parameter (Gy⁻¹)
}

export interface RecoveryParameters {
  intervalMonths: number;
  recoveryFactor: number;  // 0.0 (no recovery) to 1.0 (complete recovery)
  halfRecoveryTime: number; // months
}

// ============================================================================
// TREATMENT GAP CORRECTION
// ============================================================================

/**
 * Calculate repopulation correction for treatment gaps
 * 
 * Uses exponential repopulation model:
 * Repopulation dose = (ln(2) / (α × Tpot)) × max(0, T - Tk)
 * 
 * where:
 * - T is total treatment time (days)
 * - Tk is kickoff time for repopulation (typically 21-28 days)
 * - Tpot is potential doubling time (typically 3-5 days)
 * 
 * @param treatmentTimeDays - Total treatment time including gaps
 * @param params - Repopulation parameters
 * @returns Additional dose equivalent (Gy) to account for repopulation
 */
export function calculateRepopulationCorrection(
  treatmentTimeDays: number,
  params: RepopulationParameters
): number {
  const { Tk, Tpot, alpha } = params;
  
  if (treatmentTimeDays <= Tk) {
    return 0.0; // No repopulation before kickoff time
  }
  
  const effectiveTime = treatmentTimeDays - Tk;
  const repopulationDose = (Math.LN2 / (alpha * Tpot)) * effectiveTime;
  
  return repopulationDose;
}

/**
 * Calculate BED with treatment gap correction
 * 
 * BED_corrected = BED_physical - Repopulation_dose
 */
export function calculateBED_WithGaps(
  dosePerFraction: number,
  numberOfFractions: number,
  alphaOverBeta: number,
  gaps: TreatmentGap[],
  repopulationParams: RepopulationParameters
): { bedPhysical: number; repopulationDose: number; bedCorrected: number; totalTreatmentDays: number } {
  // Calculate physical BED
  const bedPhysical = numberOfFractions * dosePerFraction * (1 + dosePerFraction / alphaOverBeta);
  
  // Calculate total treatment time
  const totalTreatmentDays = numberOfFractions + gaps.reduce((sum, gap) => sum + gap.durationDays, 0);
  
  // Calculate repopulation correction
  const repopulationDose = calculateRepopulationCorrection(totalTreatmentDays, repopulationParams);
  
  // Corrected BED
  const bedCorrected = bedPhysical - repopulationDose;
  
  return {
    bedPhysical,
    repopulationDose,
    bedCorrected,
    totalTreatmentDays
  };
}

// ============================================================================
// RE-IRRADIATION
// ============================================================================

/**
 * Calculate recovery factor based on time interval
 * 
 * Uses exponential recovery model:
 * Recovery = 1 - exp(-ln(2) × t / t_half)
 * 
 * where:
 * - t is time interval (months)
 * - t_half is half-recovery time (typically 2-3 months for early effects, 6-12 months for late effects)
 */
export function calculateRecoveryFactor(
  intervalMonths: number,
  halfRecoveryTime: number = 6.0
): number {
  const recovery = 1 - Math.exp(-Math.LN2 * intervalMonths / halfRecoveryTime);
  return Math.max(0, Math.min(1, recovery)); // Clamp to [0, 1]
}

/**
 * Calculate cumulative BED for re-irradiation
 * 
 * BED_cumulative = BED_1 × (1 - recovery) + BED_2
 * 
 * where recovery factor depends on time interval between courses
 */
export function calculateCumulativeBED_Reirradiation(
  courses: TreatmentCourse[],
  recoveryParams: RecoveryParameters
): {
  cumulativeBED: number;
  courseDetails: Array<{
    courseNumber: number;
    bed: number;
    recoveryFactor: number;
    effectiveBED: number;
    intervalMonths: number;
  }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const courseDetails: Array<{
    courseNumber: number;
    bed: number;
    recoveryFactor: number;
    effectiveBED: number;
    intervalMonths: number;
  }> = [];
  
  let cumulativeBED = 0;
  
  // Sort courses by start date
  const sortedCourses = [...courses].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  for (let i = 0; i < sortedCourses.length; i++) {
    const course = sortedCourses[i];
    const alphaOverBeta = course.alpha / course.beta;
    
    // Calculate BED for this course
    const bed = course.numberOfFractions * course.dosePerFraction * (1 + course.dosePerFraction / alphaOverBeta);
    
    let recoveryFactor = 0;
    let intervalMonths = 0;
    
    if (i > 0) {
      // Calculate time interval from previous course
      const prevCourse = sortedCourses[i - 1];
      const intervalMs = course.startDate.getTime() - prevCourse.endDate.getTime();
      intervalMonths = intervalMs / (1000 * 60 * 60 * 24 * 30.44); // Convert ms to months
      
      // Calculate recovery factor
      recoveryFactor = calculateRecoveryFactor(intervalMonths, recoveryParams.halfRecoveryTime);
      
      // Apply recovery to cumulative BED
      cumulativeBED *= (1 - recoveryFactor);
      
      if (intervalMonths < 6) {
        warnings.push(`Short interval between courses ${i} and ${i + 1}: ${intervalMonths.toFixed(1)} months. Limited recovery expected.`);
      }
    }
    
    // Add effective BED from this course
    const effectiveBED = bed;
    cumulativeBED += effectiveBED;
    
    courseDetails.push({
      courseNumber: course.courseNumber,
      bed,
      recoveryFactor,
      effectiveBED,
      intervalMonths
    });
  }
  
  // Check for high cumulative BED
  if (cumulativeBED > 120) {
    warnings.push(`High cumulative BED (${cumulativeBED.toFixed(1)} Gy₂). Exceeds typical spinal cord tolerance (120-135 Gy₂). Consider Monte Carlo NTCP for improved accuracy.`);
  }
  
  return {
    cumulativeBED,
    courseDetails,
    warnings
  };
}

// ============================================================================
// EBRT + BRACHYTHERAPY COMBINATION
// ============================================================================

/**
 * Calculate combined BED for EBRT + Brachytherapy using gLQ model
 * 
 * BED_total = BED_EBRT + BED_Brachy
 * 
 * For HDR brachy, use LQL model if dose per fraction >6 Gy
 */
export function calculateCombinedBED_EBRT_Brachy(
  treatment: CombinedTreatment
): {
  bedEBRT: number;
  bedBrachy: number;
  bedTotal: number;
  eqd2: number;
  recommendations: string[];
} {
  const { ebrtDose, ebrtFractions, ebrtDosePerFraction, brachyDose, brachyFractions, brachyDosePerFraction, alpha, beta } = treatment;
  
  const alphaOverBeta = alpha / beta;
  const recommendations: string[] = [];
  
  // Calculate EBRT BED
  const bedEBRT = ebrtFractions * ebrtDosePerFraction * (1 + ebrtDosePerFraction / alphaOverBeta);
  
  // Calculate Brachy BED
  let bedBrachy: number;
  if (brachyDosePerFraction > 6.0) {
    // Use LQL model for high dose per fraction
    recommendations.push("High dose per fraction in brachytherapy (>6 Gy). LQL model recommended for improved accuracy.");
    // Simplified LQL: assume dt = 6 Gy, gamma = 0
    const dt = 6.0;
    const lqPart = alpha * dt + beta * dt * dt;
    const linearPart = (alpha + 2 * beta * dt) * (brachyDosePerFraction - dt);
    bedBrachy = brachyFractions * (lqPart + linearPart) / alpha;
  } else {
    // Standard LQ model
    bedBrachy = brachyFractions * brachyDosePerFraction * (1 + brachyDosePerFraction / alphaOverBeta);
  }
  
  // Total BED
  const bedTotal = bedEBRT + bedBrachy;
  
  // Convert to EQD2
  const eqd2 = bedTotal / (1 + 2.0 / alphaOverBeta);
  
  // Recommendations
  if (bedTotal > 100) {
    recommendations.push(`High combined BED (${bedTotal.toFixed(1)} Gy${alphaOverBeta.toFixed(1)}). Verify dose constraints for organs at risk.`);
  }
  
  recommendations.push(`EBRT: ${ebrtDose.toFixed(1)} Gy in ${ebrtFractions} fx (BED = ${bedEBRT.toFixed(1)} Gy${alphaOverBeta.toFixed(1)})`);
  recommendations.push(`Brachy: ${brachyDose.toFixed(1)} Gy in ${brachyFractions} fx (BED = ${bedBrachy.toFixed(1)} Gy${alphaOverBeta.toFixed(1)})`);
  recommendations.push(`Total BED: ${bedTotal.toFixed(1)} Gy${alphaOverBeta.toFixed(1)} (EQD2 = ${eqd2.toFixed(1)} Gy)`);
  
  return {
    bedEBRT,
    bedBrachy,
    bedTotal,
    eqd2,
    recommendations
  };
}

// ============================================================================
// ADAPTIVE REPLANNING
// ============================================================================

/**
 * Fast TCP/NTCP recalculation for adaptive replanning
 * 
 * Uses EUD-based approach for rapid plan comparison
 */
export function fastRecalculation_Adaptive(
  dvh: { dose: number[]; volume: number[] },
  alpha: number,
  beta: number,
  a: number,  // EUD parameter
  isTarget: boolean
): {
  eud: number;
  tcp_ntcp: number;
  calculationTime: number;
} {
  const startTime = performance.now();
  
  // Calculate gEUD
  let eud = 0;
  for (let i = 0; i < dvh.dose.length; i++) {
    eud += dvh.volume[i] * Math.pow(dvh.dose[i], a);
  }
  eud = Math.pow(eud, 1 / a);
  
  // Calculate TCP or NTCP based on EUD
  let tcp_ntcp: number;
  if (isTarget) {
    // TCP calculation (Poisson model)
    const sf = Math.exp(-alpha * eud - beta * eud * eud);
    tcp_ntcp = Math.exp(-1e9 * sf);
  } else {
    // NTCP calculation (simplified LKB)
    const td50 = 50.0; // Placeholder
    const m = 0.15;    // Placeholder
    const t = (eud - td50) / (m * td50);
    tcp_ntcp = 0.5 * (1 + erf(t / Math.sqrt(2)));
  }
  
  const calculationTime = performance.now() - startTime;
  
  return {
    eud,
    tcp_ntcp,
    calculationTime
  };
}

/**
 * Error function (erf) approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const TreatmentGapSchema = z.object({
  startFraction: z.number().int().positive(),
  endFraction: z.number().int().positive(),
  durationDays: z.number().int().positive()
});

export const TreatmentCourseSchema = z.object({
  courseNumber: z.number().int().positive(),
  dosePerFraction: z.number().positive(),
  numberOfFractions: z.number().int().positive(),
  totalDose: z.number().positive(),
  startDate: z.date(),
  endDate: z.date(),
  alpha: z.number().positive(),
  beta: z.number().positive()
});

export const CombinedTreatmentSchema = z.object({
  ebrtDose: z.number().positive(),
  ebrtFractions: z.number().int().positive(),
  ebrtDosePerFraction: z.number().positive(),
  brachyDose: z.number().positive(),
  brachyFractions: z.number().int().positive(),
  brachyDosePerFraction: z.number().positive(),
  alpha: z.number().positive(),
  beta: z.number().positive()
});

export const RepopulationParametersSchema = z.object({
  Tk: z.number().positive().default(21),  // Kickoff time (days)
  Tpot: z.number().positive().default(3), // Potential doubling time (days)
  alpha: z.number().positive()
});

export const RecoveryParametersSchema = z.object({
  intervalMonths: z.number().nonnegative(),
  recoveryFactor: z.number().min(0).max(1),
  halfRecoveryTime: z.number().positive().default(6)
});
