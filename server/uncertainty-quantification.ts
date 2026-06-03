/**
 * Uncertainty Quantification (UQ) for rbGyanX-genius evolved
 * 
 * Implements confidence/risk bands for TCP/NTCP calculations:
 * - Parameter uncertainty propagation
 * - Sensitivity analysis
 * - Monte Carlo uncertainty quantification (simplified)
 * - Confidence intervals (±1σ, ±2σ)
 * 
 * References:
 * - Nahum AE, Uzan J. (2012). (Radio)biological optimization of external-beam radiotherapy. Comput Math Methods Med 2012:329214.
 * - Søvik Å et al. (2014). Uncertainty analysis of TCP models and their application to treatment plan evaluation. Med Phys 41:011703.
 * - Warkentin B et al. (2004). A TCP-NTCP estimation module using DVHs and known radiobiological models and parameter sets. J Appl Clin Med Phys 5:50-63.
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ParameterUncertainty {
  parameter: string;
  nominalValue: number;
  uncertainty: number;  // Standard deviation
  distribution: "normal" | "lognormal" | "uniform";
}

export interface UncertaintyResult {
  nominalValue: number;
  mean: number;
  median: number;
  stdDev: number;
  confidenceIntervals: {
    ci68: { lower: number; upper: number };  // ±1σ
    ci95: { lower: number; upper: number };  // ±2σ
  };
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

export interface SensitivityResult {
  parameter: string;
  nominalValue: number;
  sensitivity: number;  // ∂Output/∂Parameter
  relativeImportance: number;  // Normalized to [0, 1]
}

export interface MonteCarloConfig {
  nSamples: number;
  seed?: number;
  parameterUncertainties: ParameterUncertainty[];
}

// ============================================================================
// PARAMETER UNCERTAINTY DATABASE
// ============================================================================

/**
 * Typical uncertainties for radiobiological parameters
 * Based on literature review and clinical experience
 */
export const TYPICAL_UNCERTAINTIES: Record<string, ParameterUncertainty> = {
  alpha: {
    parameter: "alpha",
    nominalValue: 0.35,
    uncertainty: 0.05,  // ±14% relative uncertainty
    distribution: "lognormal"
  },
  beta: {
    parameter: "beta",
    nominalValue: 0.035,
    uncertainty: 0.010,  // ±29% relative uncertainty
    distribution: "lognormal"
  },
  alphaBeta: {
    parameter: "alphaBeta",
    nominalValue: 10.0,
    uncertainty: 3.0,  // ±30% relative uncertainty
    distribution: "lognormal"
  },
  TD50: {
    parameter: "TD50",
    nominalValue: 50.0,
    uncertainty: 5.0,  // ±10% relative uncertainty
    distribution: "normal"
  },
  m: {
    parameter: "m",
    nominalValue: 0.15,
    uncertainty: 0.05,  // ±33% relative uncertainty
    distribution: "normal"
  },
  n: {
    parameter: "n",
    nominalValue: 0.5,
    uncertainty: 0.2,  // ±40% relative uncertainty
    distribution: "normal"
  },
  gamma50: {
    parameter: "gamma50",
    nominalValue: 2.0,
    uncertainty: 0.5,  // ±25% relative uncertainty
    distribution: "normal"
  }
};

// ============================================================================
// MONTE CARLO SAMPLING
// ============================================================================

/**
 * Simple random number generator (LCG) for reproducibility
 */
class SimpleRNG {
  private state: number;
  
  constructor(seed: number = 12345) {
    this.state = seed;
  }
  
  next(): number {
    // Linear congruential generator
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  
  normal(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }
  
  lognormal(mean: number, stdDev: number): number {
    // Lognormal distribution
    const mu = Math.log(mean / Math.sqrt(1 + (stdDev * stdDev) / (mean * mean)));
    const sigma = Math.sqrt(Math.log(1 + (stdDev * stdDev) / (mean * mean)));
    return Math.exp(this.normal(mu, sigma));
  }
  
  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

/**
 * Sample parameter value based on uncertainty distribution
 */
export function sampleParameter(
  uncertainty: ParameterUncertainty,
  rng: SimpleRNG
): number {
  const { nominalValue, uncertainty: stdDev, distribution } = uncertainty;
  
  switch (distribution) {
    case "normal":
      return rng.normal(nominalValue, stdDev);
    case "lognormal":
      return rng.lognormal(nominalValue, stdDev);
    case "uniform":
      return rng.uniform(nominalValue - stdDev, nominalValue + stdDev);
    default:
      return nominalValue;
  }
}

// ============================================================================
// MONTE CARLO UNCERTAINTY PROPAGATION
// ============================================================================

/**
 * Perform Monte Carlo uncertainty propagation for TCP/NTCP
 * 
 * @param calculationFunction - Function that calculates TCP/NTCP given parameters
 * @param config - Monte Carlo configuration
 * @returns Uncertainty result with confidence intervals
 */
export function monteCarloUncertainty(
  calculationFunction: (params: Record<string, number>) => number,
  config: MonteCarloConfig
): UncertaintyResult {
  const { nSamples, seed, parameterUncertainties } = config;
  const rng = new SimpleRNG(seed);
  
  const results: number[] = [];
  
  // Perform Monte Carlo sampling
  for (let i = 0; i < nSamples; i++) {
    const sampledParams: Record<string, number> = {};
    
    // Sample all parameters
    for (const uncertainty of parameterUncertainties) {
      sampledParams[uncertainty.parameter] = sampleParameter(uncertainty, rng);
    }
    
    // Calculate result with sampled parameters
    const result = calculationFunction(sampledParams);
    results.push(result);
  }
  
  // Sort results for percentile calculation
  results.sort((a, b) => a - b);
  
  // Calculate statistics
  const nominalParams: Record<string, number> = {};
  for (const uncertainty of parameterUncertainties) {
    nominalParams[uncertainty.parameter] = uncertainty.nominalValue;
  }
  const nominalValue = calculationFunction(nominalParams);
  
  const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
  const median = results[Math.floor(results.length / 2)];
  const variance = results.reduce((sum, val) => sum + (val - mean) ** 2, 0) / results.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate confidence intervals
  const ci68Lower = results[Math.floor(results.length * 0.16)];
  const ci68Upper = results[Math.floor(results.length * 0.84)];
  const ci95Lower = results[Math.floor(results.length * 0.025)];
  const ci95Upper = results[Math.floor(results.length * 0.975)];
  
  // Calculate percentiles
  const p5 = results[Math.floor(results.length * 0.05)];
  const p25 = results[Math.floor(results.length * 0.25)];
  const p50 = median;
  const p75 = results[Math.floor(results.length * 0.75)];
  const p95 = results[Math.floor(results.length * 0.95)];
  
  return {
    nominalValue,
    mean,
    median,
    stdDev,
    confidenceIntervals: {
      ci68: { lower: ci68Lower, upper: ci68Upper },
      ci95: { lower: ci95Lower, upper: ci95Upper }
    },
    percentiles: {
      p5,
      p25,
      p50,
      p75,
      p95
    }
  };
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

/**
 * Perform sensitivity analysis using finite differences
 * 
 * Sensitivity = ∂Output/∂Parameter ≈ (f(p + Δp) - f(p)) / Δp
 */
export function sensitivityAnalysis(
  calculationFunction: (params: Record<string, number>) => number,
  nominalParams: Record<string, number>,
  parameterNames: string[],
  delta: number = 0.01  // 1% perturbation
): SensitivityResult[] {
  const nominalValue = calculationFunction(nominalParams);
  const sensitivities: SensitivityResult[] = [];
  
  for (const paramName of parameterNames) {
    const perturbedParams = { ...nominalParams };
    const nominalParamValue = nominalParams[paramName];
    
    // Perturb parameter
    perturbedParams[paramName] = nominalParamValue * (1 + delta);
    
    // Calculate perturbed result
    const perturbedValue = calculationFunction(perturbedParams);
    
    // Calculate sensitivity
    const sensitivity = (perturbedValue - nominalValue) / (nominalParamValue * delta);
    
    sensitivities.push({
      parameter: paramName,
      nominalValue: nominalParamValue,
      sensitivity,
      relativeImportance: 0  // Will be normalized later
    });
  }
  
  // Normalize relative importance
  const maxAbsSensitivity = Math.max(...sensitivities.map(s => Math.abs(s.sensitivity)));
  for (const s of sensitivities) {
    s.relativeImportance = Math.abs(s.sensitivity) / maxAbsSensitivity;
  }
  
  // Sort by relative importance (descending)
  sensitivities.sort((a, b) => b.relativeImportance - a.relativeImportance);
  
  return sensitivities;
}

// ============================================================================
// CONFIDENCE BAND VISUALIZATION
// ============================================================================

/**
 * Generate confidence band data for dose-response curves
 * 
 * @param doseRange - Array of dose values
 * @param calculationFunction - Function that calculates TCP/NTCP for a given dose
 * @param config - Monte Carlo configuration
 * @returns Dose-response curve with confidence bands
 */
export function generateConfidenceBands(
  doseRange: number[],
  calculationFunction: (dose: number, params: Record<string, number>) => number,
  config: MonteCarloConfig
): {
  dose: number[];
  nominal: number[];
  ci68Lower: number[];
  ci68Upper: number[];
  ci95Lower: number[];
  ci95Upper: number[];
} {
  const { nSamples, seed, parameterUncertainties } = config;
  const rng = new SimpleRNG(seed);
  
  const dose: number[] = [];
  const nominal: number[] = [];
  const ci68Lower: number[] = [];
  const ci68Upper: number[] = [];
  const ci95Lower: number[] = [];
  const ci95Upper: number[] = [];
  
  // Nominal parameters
  const nominalParams: Record<string, number> = {};
  for (const uncertainty of parameterUncertainties) {
    nominalParams[uncertainty.parameter] = uncertainty.nominalValue;
  }
  
  for (const d of doseRange) {
    dose.push(d);
    
    // Calculate nominal value
    nominal.push(calculationFunction(d, nominalParams));
    
    // Monte Carlo sampling for this dose
    const results: number[] = [];
    for (let i = 0; i < nSamples; i++) {
      const sampledParams: Record<string, number> = {};
      for (const uncertainty of parameterUncertainties) {
        sampledParams[uncertainty.parameter] = sampleParameter(uncertainty, rng);
      }
      results.push(calculationFunction(d, sampledParams));
    }
    
    // Sort and extract confidence intervals
    results.sort((a, b) => a - b);
    ci68Lower.push(results[Math.floor(results.length * 0.16)]);
    ci68Upper.push(results[Math.floor(results.length * 0.84)]);
    ci95Lower.push(results[Math.floor(results.length * 0.025)]);
    ci95Upper.push(results[Math.floor(results.length * 0.975)]);
  }
  
  return {
    dose,
    nominal,
    ci68Lower,
    ci68Upper,
    ci95Lower,
    ci95Upper
  };
}

// ============================================================================
// RISK CATEGORIZATION
// ============================================================================

/**
 * Categorize risk based on TCP/NTCP value and uncertainty
 */
export function categorizeRisk(
  tcpOrNtcp: number,
  uncertainty: UncertaintyResult,
  isTarget: boolean
): {
  category: "low" | "medium" | "high";
  confidence: "high" | "medium" | "low";
  rationale: string;
} {
  const { ci95 } = uncertainty.confidenceIntervals;
  const range = ci95.upper - ci95.lower;
  const relativeUncertainty = range / tcpOrNtcp;
  
  let category: "low" | "medium" | "high";
  let confidence: "high" | "medium" | "low";
  let rationale: string;
  
  if (isTarget) {
    // TCP risk categorization
    if (tcpOrNtcp > 0.9) {
      category = "low";
      rationale = "High TCP (>90%). Excellent tumor control expected.";
    } else if (tcpOrNtcp > 0.7) {
      category = "medium";
      rationale = "Moderate TCP (70-90%). Good tumor control expected.";
    } else {
      category = "high";
      rationale = "Low TCP (<70%). Suboptimal tumor control. Consider dose escalation.";
    }
  } else {
    // NTCP risk categorization
    if (tcpOrNtcp < 0.05) {
      category = "low";
      rationale = "Low NTCP (<5%). Minimal complication risk.";
    } else if (tcpOrNtcp < 0.20) {
      category = "medium";
      rationale = "Moderate NTCP (5-20%). Acceptable complication risk.";
    } else {
      category = "high";
      rationale = "High NTCP (>20%). Significant complication risk. Consider dose reduction or replanning.";
    }
  }
  
  // Confidence assessment based on relative uncertainty
  if (relativeUncertainty < 0.2) {
    confidence = "high";
  } else if (relativeUncertainty < 0.5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }
  
  return {
    category,
    confidence,
    rationale
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ParameterUncertaintySchema = z.object({
  parameter: z.string(),
  nominalValue: z.number(),
  uncertainty: z.number().positive(),
  distribution: z.enum(["normal", "lognormal", "uniform"])
});

export const MonteCarloConfigSchema = z.object({
  nSamples: z.number().int().positive().max(10000),
  seed: z.number().int().optional(),
  parameterUncertainties: z.array(ParameterUncertaintySchema)
});
