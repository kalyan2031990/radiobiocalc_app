/**
 * Comprehensive Statistical Analysis Tools
 * 
 * Provides multiple statistical methods for radiobiology analysis with recommendations
 * Includes: descriptive statistics, hypothesis testing, confidence intervals, sensitivity analysis
 */

import { z } from "zod";

export interface StatisticalMethod {
  id: string;
  name: string;
  description: string;
  applicableTo: string[];
  assumptions: string[];
  recommendations: string;
  parameters: Record<string, unknown>;
}

export interface AnalysisResult {
  methodId: string;
  methodName: string;
  result: Record<string, number | string>;
  interpretation: string;
  recommendation: string;
  confidenceLevel: number;
}

/**
 * Statistical Methods Library
 */
export class StatisticalAnalysis {
  /**
   * Method 1: Bland-Altman Analysis (Agreement between methods)
   * Recommended for: Comparing two different calculation methods
   */
  static blandAltmanAnalysis(method1: number[], method2: number[]): AnalysisResult {
    if (method1.length !== method2.length) {
      throw new Error("Arrays must have equal length");
    }

    const n = method1.length;
    const differences: number[] = [];
    const means: number[] = [];

    for (let i = 0; i < n; i++) {
      const diff = method1[i] - method2[i];
      const mean = (method1[i] + method2[i]) / 2;
      differences.push(diff);
      means.push(mean);
    }

    const meanDiff = differences.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(
      differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n - 1)
    );

    const loa_upper = meanDiff + 1.96 * stdDev;
    const loa_lower = meanDiff - 1.96 * stdDev;

    return {
      methodId: "bland_altman",
      methodName: "Bland-Altman Analysis",
      result: {
        mean_difference: meanDiff,
        std_dev: stdDev,
        loa_upper,
        loa_lower,
        sample_size: n,
      },
      interpretation: `Mean difference: ${meanDiff.toFixed(3)}, LOA: [${loa_lower.toFixed(3)}, ${loa_upper.toFixed(3)}]`,
      recommendation:
        Math.abs(meanDiff) < 0.05
          ? "Excellent agreement between methods"
          : "Consider investigating source of systematic bias",
      confidenceLevel: 0.95,
    };
  }

  /**
   * Method 2: Intraclass Correlation Coefficient (ICC)
   * Recommended for: Assessing reliability and consistency
   */
  static icc(measurements: number[][]): AnalysisResult {
    const n = measurements.length; // number of subjects
    const k = measurements[0].length; // number of raters/measurements

    // Calculate grand mean
    const allValues = measurements.flat();
    const grandMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    // Calculate between-subject variance
    const subjectMeans = measurements.map((m) => m.reduce((a, b) => a + b, 0) / k);
    const bsVar = subjectMeans.reduce((sum, m) => sum + Math.pow(m - grandMean, 2), 0) / (n - 1);

    // Calculate within-subject variance
    let wsVar = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        wsVar += Math.pow(measurements[i][j] - subjectMeans[i], 2);
      }
    }
    wsVar /= n * (k - 1);

    // ICC(3,1) - two-way mixed effects, absolute agreement, single measurement
    const icc = (bsVar - wsVar) / (bsVar + (k - 1) * wsVar);

    return {
      methodId: "icc",
      methodName: "Intraclass Correlation Coefficient (ICC)",
      result: {
        icc_value: icc,
        interpretation_level:
          icc > 0.9
            ? "Excellent"
            : icc > 0.75
              ? "Good"
              : icc > 0.5
                ? "Moderate"
                : "Poor",
      },
      interpretation: `ICC: ${icc.toFixed(3)} - ${icc > 0.75 ? "Good to Excellent" : "Moderate to Poor"} reliability`,
      recommendation:
        icc > 0.75
          ? "Measurements are reliable and can be used for clinical decisions"
          : "Consider improving measurement protocol or equipment",
      confidenceLevel: 0.95,
    };
  }

  /**
   * Method 3: Sensitivity Analysis
   * Recommended for: Assessing impact of parameter uncertainty
   */
  static sensitivityAnalysis(
    baselineResult: number,
    parameterName: string,
    parameterRange: { min: number; max: number },
    calculationFunction: (value: number) => number
  ): AnalysisResult {
    const steps = 10;
    const results: Array<{ value: number; output: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const paramValue = parameterRange.min + (i / steps) * (parameterRange.max - parameterRange.min);
      const output = calculationFunction(paramValue);
      results.push({ value: paramValue, output });
    }

    const maxOutput = Math.max(...results.map((r) => r.output));
    const minOutput = Math.min(...results.map((r) => r.output));
    const range = maxOutput - minOutput;
    const percentChange = (range / baselineResult) * 100;

    return {
      methodId: "sensitivity_analysis",
      methodName: "Sensitivity Analysis",
      result: {
        parameter: parameterName,
        baseline: baselineResult,
        min_output: minOutput,
        max_output: maxOutput,
        range,
        percent_change: percentChange,
      },
      interpretation: `${parameterName} causes ${percentChange.toFixed(1)}% variation in output`,
      recommendation:
        percentChange > 20
          ? `${parameterName} is a critical parameter - ensure accurate measurement`
          : `${parameterName} has moderate impact on results`,
      confidenceLevel: 0.9,
    };
  }

  /**
   * Method 4: Confidence Interval Estimation
   * Recommended for: Estimating uncertainty in predictions
   */
  static confidenceInterval(
    mean: number,
    stdDev: number,
    sampleSize: number,
    confidenceLevel: number = 0.95
  ): AnalysisResult {
    const tValue = this.getTValue(sampleSize - 1, confidenceLevel);
    const standardError = stdDev / Math.sqrt(sampleSize);
    const marginOfError = tValue * standardError;
    const lowerBound = mean - marginOfError;
    const upperBound = mean + marginOfError;

    return {
      methodId: "confidence_interval",
      methodName: "Confidence Interval Estimation",
      result: {
        mean,
        lower_bound: lowerBound,
        upper_bound: upperBound,
        margin_of_error: marginOfError,
        confidence_level: confidenceLevel * 100,
      },
      interpretation: `${(confidenceLevel * 100).toFixed(0)}% CI: [${lowerBound.toFixed(3)}, ${upperBound.toFixed(3)}]`,
      recommendation:
        marginOfError < mean * 0.1
          ? "Estimate is precise"
          : "Consider increasing sample size for better precision",
      confidenceLevel,
    };
  }

  /**
   * Method 5: Hypothesis Testing (Two-sample t-test)
   * Recommended for: Comparing treatment groups
   */
  static twoSampleTTest(
    group1: number[],
    group2: number[],
    alpha: number = 0.05
  ): AnalysisResult {
    const n1 = group1.length;
    const n2 = group2.length;

    const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = group2.reduce((a, b) => a + b, 0) / n2;

    const var1 = group1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
    const var2 = group2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);

    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const standardError = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
    const tStatistic = (mean1 - mean2) / standardError;
    const df = n1 + n2 - 2;

    // Approximate p-value (simplified)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));
    const significant = pValue < alpha;

    return {
      methodId: "t_test",
      methodName: "Two-Sample t-Test",
      result: {
        group1_mean: mean1,
        group2_mean: mean2,
        t_statistic: tStatistic,
        p_value: pValue,
        degrees_of_freedom: df,
        significant: significant ? "Yes" : "No",
      },
      interpretation: `t(${df}) = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}`,
      recommendation:
        significant
          ? "Significant difference between groups detected"
          : "No significant difference between groups",
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * Method 6: Correlation Analysis
   * Recommended for: Assessing relationships between variables
   */
  static pearsonCorrelation(x: number[], y: number[]): AnalysisResult {
    if (x.length !== y.length) {
      throw new Error("Arrays must have equal length");
    }

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const r = numerator / Math.sqrt(sumX2 * sumY2);
    const r2 = r * r;

    return {
      methodId: "pearson_correlation",
      methodName: "Pearson Correlation Analysis",
      result: {
        correlation_coefficient: r,
        r_squared: r2,
        strength:
          Math.abs(r) > 0.7
            ? "Strong"
            : Math.abs(r) > 0.4
              ? "Moderate"
              : "Weak",
      },
      interpretation: `r = ${r.toFixed(3)}, R² = ${r2.toFixed(3)}`,
      recommendation:
        Math.abs(r) > 0.7
          ? "Strong correlation detected - variables are closely related"
          : "Weak to moderate correlation - other factors may be involved",
      confidenceLevel: 0.95,
    };
  }

  /**
   * Helper: Get t-value for confidence interval
   */
  private static getTValue(df: number, confidenceLevel: number): number {
    // Simplified t-value lookup (in production, use statistical table or library)
    const tTable: Record<string, Record<string, number>> = {
      "0.9": { "10": 1.372, "20": 1.325, "30": 1.31 },
      "0.95": { "10": 2.228, "20": 2.086, "30": 2.042 },
      "0.99": { "10": 3.169, "20": 2.845, "30": 2.75 },
    };
    const key = confidenceLevel.toString();
    const dfKey = df.toString();
    return tTable[key]?.[dfKey] || 1.96;
  }

  /**
   * Helper: Normal CDF approximation
   */
  private static normalCDF(z: number, _unused?: number): number {
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  /**
   * Helper: Error function approximation
   */
  private static erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }
}

/**
 * Statistical Method Recommendations Engine
 */
export class RecommendationEngine {
  static getRecommendedMethods(
    analysisType: "comparison" | "reliability" | "uncertainty" | "relationship"
  ): StatisticalMethod[] {
    const methods: Record<string, StatisticalMethod[]> = {
      comparison: [
        {
          id: "t_test",
          name: "Two-Sample t-Test",
          description: "Compare means between two groups",
          applicableTo: ["treatment_comparison", "plan_comparison"],
          assumptions: ["Normal distribution", "Equal variances", "Independent samples"],
          recommendations:
            "Use when comparing TCP/NTCP between two treatment plans or patient groups",
          parameters: { alpha: 0.05 },
        },
        {
          id: "bland_altman",
          name: "Bland-Altman Analysis",
          description: "Assess agreement between two measurement methods",
          applicableTo: ["method_comparison", "validation"],
          assumptions: ["Continuous data", "Two measurement methods"],
          recommendations:
            "Use when validating new calculation method against established reference",
          parameters: { confidence_level: 0.95 },
        },
      ],
      reliability: [
        {
          id: "icc",
          name: "Intraclass Correlation Coefficient",
          description: "Assess consistency and reliability of measurements",
          applicableTo: ["reproducibility", "quality_assurance"],
          assumptions: ["Multiple measurements", "Same subjects"],
          recommendations:
            "Use to verify consistency of calculations across different operators or time points",
          parameters: { confidence_level: 0.95 },
        },
      ],
      uncertainty: [
        {
          id: "sensitivity_analysis",
          name: "Sensitivity Analysis",
          description: "Assess impact of parameter uncertainty on results",
          applicableTo: ["uncertainty_quantification", "robustness"],
          assumptions: ["Known parameter ranges"],
          recommendations:
            "Use to identify critical parameters and assess result robustness",
          parameters: { steps: 10 },
        },
        {
          id: "confidence_interval",
          name: "Confidence Interval Estimation",
          description: "Estimate uncertainty in predictions",
          applicableTo: ["uncertainty_quantification"],
          assumptions: ["Normal distribution", "Known standard deviation"],
          recommendations:
            "Use to quantify uncertainty in TCP/NTCP predictions",
          parameters: { confidence_level: 0.95 },
        },
      ],
      relationship: [
        {
          id: "pearson_correlation",
          name: "Pearson Correlation Analysis",
          description: "Assess linear relationships between variables",
          applicableTo: ["variable_relationship", "correlation_analysis"],
          assumptions: ["Linear relationship", "Continuous data"],
          recommendations:
            "Use to assess relationship between dose metrics and TCP/NTCP",
          parameters: { confidence_level: 0.95 },
        },
      ],
    };

    return methods[analysisType] || [];
  }
}

/**
 * Statistical Analysis Schema
 */
export const StatisticalMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  applicableTo: z.array(z.string()),
  assumptions: z.array(z.string()),
  recommendations: z.string(),
  parameters: z.record(z.string(), z.unknown()),
});

export const AnalysisResultSchema = z.object({
  methodId: z.string(),
  methodName: z.string(),
  result: z.record(z.string(), z.union([z.number(), z.string()])),
  interpretation: z.string(),
  recommendation: z.string(),
  confidenceLevel: z.number(),
});
