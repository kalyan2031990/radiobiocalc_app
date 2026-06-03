/**
 * Robust 2-Tier Quality Assurance System
 * 
 * Tier 1: Automated validation checks
 * Tier 2: Clinical review and approval workflow
 */

import { z } from "zod";

export interface QACheckResult {
  checkId: string;
  checkName: string;
  status: "pass" | "fail" | "warning";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  recommendation?: string;
}

export interface QAReport {
  reportId: string;
  calculationId: string;
  tier1Checks: QACheckResult[];
  tier1Status: "pass" | "fail" | "warning";
  tier2Status: "pending" | "approved" | "rejected" | "revision_required";
  tier2Reviewer?: string;
  tier2ReviewDate?: string;
  tier2Comments?: string;
  overallStatus: "approved" | "pending" | "rejected";
  timestamp: string;
}

/**
 * TIER 1: Automated Validation Checks
 */
export class AutomatedQASystem {
  /**
   * Validate input DVH data
   */
  static validateDVHData(dvh: Array<{ dose: number; volume: number }>): QACheckResult[] {
    const results: QACheckResult[] = [];

    // Check 1: DVH monotonicity
    let isMonotonic = true;
    for (let i = 1; i < dvh.length; i++) {
      if (dvh[i].volume > dvh[i - 1].volume) {
        isMonotonic = false;
        break;
      }
    }
    results.push({
      checkId: "dvh_monotonic",
      checkName: "DVH Monotonicity",
      status: isMonotonic ? "pass" : "fail",
      severity: isMonotonic ? "low" : "critical",
      message: isMonotonic
        ? "DVH follows expected monotonic decreasing pattern"
        : "DVH violates monotonicity constraint",
      recommendation: !isMonotonic ? "Check DVH data source and re-import" : undefined,
    });

    // Check 2: DVH range validation
    const maxDose = Math.max(...dvh.map((d) => d.dose));
    const maxVolume = Math.max(...dvh.map((d) => d.volume));
    const doseValid = maxDose > 0 && maxDose < 200; // Reasonable dose range
    const volumeValid = maxVolume >= 0 && maxVolume <= 100;

    results.push({
      checkId: "dvh_range",
      checkName: "DVH Range Validation",
      status: doseValid && volumeValid ? "pass" : "fail",
      severity: doseValid && volumeValid ? "low" : "critical",
      message: `Max dose: ${maxDose.toFixed(2)} Gy, Max volume: ${maxVolume.toFixed(2)}%`,
      recommendation:
        !doseValid || !volumeValid
          ? "DVH values outside expected clinical range"
          : undefined,
    });

    // Check 3: DVH smoothness
    const derivatives: number[] = [];
    for (let i = 1; i < dvh.length; i++) {
      const dv = dvh[i].volume - dvh[i - 1].volume;
      const dd = dvh[i].dose - dvh[i - 1].dose;
      if (dd !== 0) derivatives.push(dv / dd);
    }
    const avgDerivative = derivatives.reduce((a, b) => a + b, 0) / derivatives.length;
    const variance = derivatives.reduce((sum, d) => sum + Math.pow(d - avgDerivative, 2), 0) / derivatives.length;
    const stdDev = Math.sqrt(variance);
    const isSmooth = stdDev < 0.5; // Threshold for smoothness

    results.push({
      checkId: "dvh_smoothness",
      checkName: "DVH Smoothness",
      status: isSmooth ? "pass" : "warning",
      severity: isSmooth ? "low" : "medium",
      message: `DVH smoothness coefficient: ${stdDev.toFixed(3)}`,
      recommendation: !isSmooth ? "Consider applying DVH smoothing filter" : undefined,
    });

    return results;
  }

  /**
   * Validate calculation parameters
   */
  static validateCalculationParameters(params: {
    alphaBeta: number;
    d50: number;
    gamma50: number;
    fractionDose: number;
    totalDose: number;
    fractions: number;
  }): QACheckResult[] {
    const results: QACheckResult[] = [];

    // Check 1: Alpha/Beta ratio validity
    const alphaBetaValid = params.alphaBeta > 0.5 && params.alphaBeta < 50;
    results.push({
      checkId: "alpha_beta_valid",
      checkName: "Alpha/Beta Ratio Validation",
      status: alphaBetaValid ? "pass" : "fail",
      severity: alphaBetaValid ? "low" : "critical",
      message: `Alpha/Beta: ${params.alphaBeta.toFixed(2)}`,
      recommendation: !alphaBetaValid ? "Alpha/Beta ratio outside typical clinical range" : undefined,
    });

    // Check 2: D50 parameter validity
    const d50Valid = params.d50 > 10 && params.d50 < 200;
    results.push({
      checkId: "d50_valid",
      checkName: "D50 Parameter Validation",
      status: d50Valid ? "pass" : "fail",
      severity: d50Valid ? "low" : "high",
      message: `D50: ${params.d50.toFixed(2)} Gy`,
      recommendation: !d50Valid ? "D50 outside typical range for selected organ" : undefined,
    });

    // Check 3: Fractionation consistency
    const expectedTotalDose = params.fractionDose * params.fractions;
    const doseConsistent = Math.abs(expectedTotalDose - params.totalDose) < 0.1;
    results.push({
      checkId: "fractionation_consistent",
      checkName: "Fractionation Consistency",
      status: doseConsistent ? "pass" : "warning",
      severity: doseConsistent ? "low" : "medium",
      message: `Expected: ${expectedTotalDose.toFixed(2)} Gy, Actual: ${params.totalDose.toFixed(2)} Gy`,
      recommendation: !doseConsistent ? "Verify fractionation scheme" : undefined,
    });

    // Check 4: Gamma50 validity
    const gammaValid = params.gamma50 > 0.5 && params.gamma50 < 10;
    results.push({
      checkId: "gamma50_valid",
      checkName: "Gamma50 Parameter Validation",
      status: gammaValid ? "pass" : "fail",
      severity: gammaValid ? "low" : "high",
      message: `Gamma50: ${params.gamma50.toFixed(2)}`,
      recommendation: !gammaValid ? "Gamma50 outside typical range" : undefined,
    });

    return results;
  }

  /**
   * Validate calculation results
   */
  static validateResults(results: {
    tcp: number;
    ntcp: number;
    bed: number;
    eqd2: number;
  }): QACheckResult[] {
    const checks: QACheckResult[] = [];

    // Check 1: TCP/NTCP range
    const probabilityValid = results.tcp >= 0 && results.tcp <= 1 && results.ntcp >= 0 && results.ntcp <= 1;
    checks.push({
      checkId: "probability_range",
      checkName: "Probability Range Validation",
      status: probabilityValid ? "pass" : "fail",
      severity: probabilityValid ? "low" : "critical",
      message: `TCP: ${(results.tcp * 100).toFixed(2)}%, NTCP: ${(results.ntcp * 100).toFixed(2)}%`,
      recommendation: !probabilityValid ? "Probabilities must be between 0 and 1" : undefined,
    });

    // Check 2: Therapeutic window
    const therapeuticWindow = results.tcp > 0.6 && results.ntcp < 0.2;
    checks.push({
      checkId: "therapeutic_window",
      checkName: "Therapeutic Window Assessment",
      status: therapeuticWindow ? "pass" : "warning",
      severity: therapeuticWindow ? "low" : "medium",
      message: therapeuticWindow
        ? "Plan within optimal therapeutic window"
        : "Plan outside optimal therapeutic window",
      recommendation: !therapeuticWindow
        ? "Consider dose escalation or de-escalation"
        : undefined,
    });

    // Check 3: BED/EQD2 consistency
    const bedEqd2Ratio = results.eqd2 / results.bed;
    const ratioValid = bedEqd2Ratio > 0.8 && bedEqd2Ratio < 1.2;
    checks.push({
      checkId: "bed_eqd2_ratio",
      checkName: "BED/EQD2 Ratio Validation",
      status: ratioValid ? "pass" : "warning",
      severity: ratioValid ? "low" : "medium",
      message: `BED: ${results.bed.toFixed(2)} Gy, EQD2: ${results.eqd2.toFixed(2)} Gy`,
      recommendation: !ratioValid ? "Check fractionation and alpha/beta parameters" : undefined,
    });

    return checks;
  }

  /**
   * Generate Tier 1 QA report
   */
  static generateTier1Report(
    calculationId: string,
    dvhData: Array<{ dose: number; volume: number }>,
    params: {
      alphaBeta: number;
      d50: number;
      gamma50: number;
      fractionDose: number;
      totalDose: number;
      fractions: number;
    },
    results: { tcp: number; ntcp: number; bed: number; eqd2: number }
  ): QACheckResult[] {
    const allChecks: QACheckResult[] = [];
    allChecks.push(...this.validateDVHData(dvhData));
    allChecks.push(...this.validateCalculationParameters(params));
    allChecks.push(...this.validateResults(results));
    return allChecks;
  }
}

/**
 * TIER 2: Clinical Review and Approval Workflow
 */
export class ClinicalReviewSystem {
  /**
   * Create clinical review task
   */
  static createReviewTask(
    calculationId: string,
    tier1Checks: QACheckResult[],
    requiredReviewers: number = 1
  ): {
    taskId: string;
    calculationId: string;
    status: "pending" | "in_review" | "approved" | "rejected";
    requiredReviewers: number;
    assignedReviewers: string[];
    createdAt: string;
  } {
    return {
      taskId: `review_${calculationId}_${Date.now()}`,
      calculationId,
      status: "pending",
      requiredReviewers,
      assignedReviewers: [],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Submit clinical review
   */
  static submitReview(
    taskId: string,
    reviewerId: string,
    approved: boolean,
    comments: string
  ): {
    reviewId: string;
    taskId: string;
    reviewerId: string;
    approved: boolean;
    comments: string;
    timestamp: string;
  } {
    return {
      reviewId: `rev_${taskId}_${Date.now()}`,
      taskId,
      reviewerId,
      approved,
      comments,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Determine final approval status
   */
  static determineFinalStatus(
    tier1Checks: QACheckResult[],
    tier2Reviews: Array<{ approved: boolean }>
  ): "approved" | "pending" | "rejected" {
    // Tier 1: Check for critical failures
    const hasCriticalFailure = tier1Checks.some((c) => c.severity === "critical" && c.status === "fail");
    if (hasCriticalFailure) return "rejected";

    // Tier 2: Check reviewer consensus
    if (tier2Reviews.length === 0) return "pending";
    const approvedCount = tier2Reviews.filter((r) => r.approved).length;
    const approvalRate = approvedCount / tier2Reviews.length;

    if (approvalRate >= 0.8) return "approved";
    if (approvalRate >= 0.5) return "pending";
    return "rejected";
  }
}

/**
 * QA System Schema Validation
 */
export const QACheckResultSchema = z.object({
  checkId: z.string(),
  checkName: z.string(),
  status: z.enum(["pass", "fail", "warning"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  message: z.string(),
  recommendation: z.string().optional(),
});

export const QAReportSchema = z.object({
  reportId: z.string(),
  calculationId: z.string(),
  tier1Checks: z.array(QACheckResultSchema),
  tier1Status: z.enum(["pass", "fail", "warning"]),
  tier2Status: z.enum(["pending", "approved", "rejected", "revision_required"]),
  tier2Reviewer: z.string().optional(),
  tier2ReviewDate: z.string().optional(),
  tier2Comments: z.string().optional(),
  overallStatus: z.enum(["approved", "pending", "rejected"]),
  timestamp: z.string(),
});
