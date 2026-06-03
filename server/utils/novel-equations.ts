/**
 * Novel Equations for rbGyanX Mobile App
 * 
 * Implements framework-level contributions:
 * 1. FDVH - Fractionation-Aware DVH Normalization
 * 2. uTCP - Uncertainty-Aware TCP
 * 3. TWI - Therapeutic Window Index
 * 4. CCS - Cohort-Consistency Score
 * 
 * References:
 * - Fowler JF (1989): Linear-quadratic formula
 * - McMahon SJ (2019): LQ model usage and challenges
 * - Niemierko A (1997): gEUD concept
 * - Zaider & Minerbo (2000): Time-dependent TCP
 * 
 * Author: rbGyanX Team
 * Version: 1.0.0
 */

/**
 * DVH Point (dose, volume pair)
 */
export interface DVHPoint {
  dose: number;      // Dose in Gy
  volume: number;    // Volume in % or cc
}

/**
 * DVH structure
 */
export interface DVH {
  type: 'cDVH' | 'dDVH';
  points: DVHPoint[];
  totalVolume?: number;
  organName?: string;
}

/**
 * Fractionation parameters
 */
export interface FractionationParams {
  totalDose: number;        // Total dose in Gy
  fractions: number;        // Number of fractions
  alphaBeta: number;        // α/β ratio in Gy
}

/**
 * TCP/NTCP result with uncertainty
 */
export interface UncertainResult {
  value: number;            // Mean value
  uncertainty: number;      // Standard deviation
  ci95Lower: number;        // 95% CI lower bound
  ci95Upper: number;        // 95% CI upper bound
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Therapeutic Window Index result
 */
export interface TWIResult {
  twi: number;              // TWI value
  tcp: number;              // TCP value
  ntcp: number | number[];  // NTCP value(s)
  lambda: number | number[]; // Risk aversion parameter(s)
  interpretation: string;   // Clinical interpretation
}

/**
 * Cohort Consistency Score result
 */
export interface CCSResult {
  ccs: number;              // CCS value (0-1)
  inCohort: boolean;        // Whether patient is in cohort
  warning: string | null;   // Warning message if out-of-distribution
  mahalanobisDistance: number; // Mahalanobis distance
}

// ============================================================================
// 1. FDVH - Fractionation-Aware DVH Normalization
// ============================================================================

/**
 * Calculate BED (Biologically Effective Dose) for a single dose
 * 
 * Formula: BED = D × (1 + d / (α/β))
 * 
 * where:
 * - D = total dose
 * - d = dose per fraction
 * - α/β = tissue-specific ratio
 * 
 * @param totalDose Total dose in Gy
 * @param dosePerFraction Dose per fraction in Gy
 * @param alphaBeta α/β ratio in Gy
 * @returns BED in Gy
 */
export function calculateBED(
  totalDose: number,
  dosePerFraction: number,
  alphaBeta: number
): number {
  return totalDose * (1 + dosePerFraction / alphaBeta);
}

/**
 * Calculate biological dose for a single DVH bin
 * 
 * Formula: D_bio,i = n × d_i × (1 + d_i / (α/β))
 * 
 * where:
 * - n = number of fractions
 * - d_i = dose per fraction to bin i
 * - α/β = tissue-specific ratio
 * 
 * @param dose Physical dose in Gy
 * @param fractions Number of fractions
 * @param alphaBeta α/β ratio in Gy
 * @returns Biological dose in Gy
 */
export function calculateBiologicalDose(
  dose: number,
  fractions: number,
  alphaBeta: number
): number {
  const dosePerFraction = dose / fractions;
  return fractions * dosePerFraction * (1 + dosePerFraction / alphaBeta);
}

/**
 * Convert physical DVH to biological DVH (FDVH)
 * 
 * Creates a BED-DVH without voxel-level dose.
 * 
 * Formula: V_bio(D) = Σ V_i × I(D_bio,i ≥ D)
 * 
 * where:
 * - V_i = volume fraction in bin i
 * - D_bio,i = biological dose in bin i
 * - I = indicator function
 * 
 * @param dvh Physical DVH
 * @param params Fractionation parameters
 * @returns Biological DVH (FDVH)
 */
export function convertToFDVH(
  dvh: DVH,
  params: FractionationParams
): DVH {
  const { fractions, alphaBeta } = params;
  
  // Convert each DVH point to biological dose
  const biologicalPoints: DVHPoint[] = dvh.points.map(point => ({
    dose: calculateBiologicalDose(point.dose, fractions, alphaBeta),
    volume: point.volume,
  }));
  
  // Sort by dose (ascending)
  biologicalPoints.sort((a, b) => a.dose - b.dose);
  
  return {
    type: dvh.type,
    points: biologicalPoints,
    totalVolume: dvh.totalVolume,
    organName: dvh.organName,
  };
}

/**
 * Check if fractionation-aware processing is needed
 * 
 * FDVH is needed for:
 * - SBRT (dose per fraction > 5 Gy)
 * - SRS (single fraction > 10 Gy)
 * - HDR brachytherapy
 * - Re-irradiation
 * 
 * @param fractions Number of fractions
 * @param totalDose Total dose in Gy
 * @returns Whether FDVH is recommended
 */
export function isFDVHNeeded(fractions: number, totalDose: number): boolean {
  const dosePerFraction = totalDose / fractions;
  
  // SBRT/SRS threshold
  if (dosePerFraction > 5) {
    return true;
  }
  
  // Single fraction SRS
  if (fractions === 1 && totalDose > 10) {
    return true;
  }
  
  return false;
}

// ============================================================================
// 2. uTCP - Uncertainty-Aware TCP
// ============================================================================

/**
 * Parameter uncertainty specification
 */
export interface ParameterUncertainty {
  mean: number;
  std: number;
  distribution: 'normal' | 'lognormal' | 'uniform';
}

/**
 * Sample from normal distribution (Box-Muller transform)
 */
function sampleNormal(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z0;
}

/**
 * Sample from lognormal distribution
 */
function sampleLognormal(mean: number, std: number): number {
  const normal = sampleNormal(0, 1);
  const mu = Math.log(mean) - 0.5 * Math.log(1 + (std / mean) ** 2);
  const sigma = Math.sqrt(Math.log(1 + (std / mean) ** 2));
  return Math.exp(mu + sigma * normal);
}

/**
 * Sample from uniform distribution
 */
function sampleUniform(mean: number, std: number): number {
  const range = std * Math.sqrt(12);
  const min = mean - range / 2;
  const max = mean + range / 2;
  return min + Math.random() * (max - min);
}

/**
 * Sample parameter from distribution
 */
function sampleParameter(uncertainty: ParameterUncertainty): number {
  switch (uncertainty.distribution) {
    case 'normal':
      return sampleNormal(uncertainty.mean, uncertainty.std);
    case 'lognormal':
      return sampleLognormal(uncertainty.mean, uncertainty.std);
    case 'uniform':
      return sampleUniform(uncertainty.mean, uncertainty.std);
    default:
      throw new Error(`Unknown distribution: ${uncertainty.distribution}`);
  }
}

/**
 * Calculate uncertainty-aware TCP using Monte Carlo simulation
 * 
 * Formula: uTCP = E[TCP] ± σ_TCP
 * 
 * where:
 * - E[TCP] = expected TCP value
 * - σ_TCP = standard deviation of TCP
 * 
 * Uncertainty propagation:
 * σ_TCP^2 = Σ (∂TCP/∂θ_j)^2 × σ_θ_j^2
 * 
 * @param tcpFunction TCP calculation function
 * @param baseParams Base parameters
 * @param uncertainties Parameter uncertainties
 * @param iterations Number of Monte Carlo iterations (default: 1000)
 * @returns Uncertainty-aware TCP result
 */
export function calculateUncertainTCP(
  tcpFunction: (params: any) => number,
  baseParams: any,
  uncertainties: Record<string, ParameterUncertainty>,
  iterations: number = 1000
): UncertainResult {
  const samples: number[] = [];
  
  // Monte Carlo simulation
  for (let i = 0; i < iterations; i++) {
    // Sample parameters
    const sampledParams: any = { ...baseParams };
    for (const [key, uncertainty] of Object.entries(uncertainties)) {
      sampledParams[key] = sampleParameter(uncertainty);
    }
    
    // Calculate TCP with sampled parameters
    try {
      const tcp = tcpFunction(sampledParams);
      if (!isNaN(tcp) && tcp >= 0 && tcp <= 1) {
        samples.push(tcp);
      }
    } catch (error) {
      // Skip invalid samples
      continue;
    }
  }
  
  if (samples.length === 0) {
    throw new Error('No valid samples generated');
  }
  
  // Sort samples for percentile calculation
  samples.sort((a, b) => a - b);
  
  // Calculate statistics
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;
  const std = Math.sqrt(variance);
  const ci95Lower = samples[Math.floor(samples.length * 0.025)];
  const ci95Upper = samples[Math.floor(samples.length * 0.975)];
  
  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high';
  const relativeUncertainty = std / mean;
  if (relativeUncertainty > 0.3) {
    confidence = 'low';
  } else if (relativeUncertainty > 0.15) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }
  
  return {
    value: mean,
    uncertainty: std,
    ci95Lower,
    ci95Upper,
    confidence,
  };
}

/**
 * Calculate uncertainty-aware NTCP using Monte Carlo simulation
 * 
 * Same approach as uTCP but for NTCP models
 * 
 * @param ntcpFunction NTCP calculation function
 * @param baseParams Base parameters
 * @param uncertainties Parameter uncertainties
 * @param iterations Number of Monte Carlo iterations (default: 1000)
 * @returns Uncertainty-aware NTCP result
 */
export function calculateUncertainNTCP(
  ntcpFunction: (params: any) => number,
  baseParams: any,
  uncertainties: Record<string, ParameterUncertainty>,
  iterations: number = 1000
): UncertainResult {
  return calculateUncertainTCP(ntcpFunction, baseParams, uncertainties, iterations);
}

// ============================================================================
// 3. TWI - Therapeutic Window Index
// ============================================================================

/**
 * Calculate Therapeutic Window Index (TWI) for single OAR
 * 
 * Formula: TWI = TCP - λ × NTCP
 * 
 * where:
 * - TCP = tumor control probability
 * - NTCP = normal tissue complication probability
 * - λ = risk aversion parameter (clinician-selected)
 * 
 * Interpretation:
 * - TWI > 0: Favorable plan (benefit > risk)
 * - TWI < 0: Unfavorable plan (risk > benefit)
 * - Higher TWI = better therapeutic window
 * 
 * @param tcp Tumor control probability (0-1)
 * @param ntcp Normal tissue complication probability (0-1)
 * @param lambda Risk aversion parameter (default: 1.0)
 * @returns TWI result
 */
export function calculateTWI(
  tcp: number,
  ntcp: number,
  lambda: number = 1.0
): TWIResult {
  const twi = tcp - lambda * ntcp;
  
  let interpretation: string;
  if (twi > 0.2) {
    interpretation = 'Excellent therapeutic window - strong benefit over risk';
  } else if (twi > 0.1) {
    interpretation = 'Good therapeutic window - favorable benefit-risk ratio';
  } else if (twi > 0) {
    interpretation = 'Acceptable therapeutic window - benefit slightly exceeds risk';
  } else if (twi > -0.1) {
    interpretation = 'Marginal therapeutic window - benefit and risk are balanced';
  } else {
    interpretation = 'Poor therapeutic window - risk may exceed benefit';
  }
  
  return {
    twi,
    tcp,
    ntcp,
    lambda,
    interpretation,
  };
}

/**
 * Calculate Multi-OAR Therapeutic Window Index
 * 
 * Formula: TWI_multi = TCP - Σ λ_k × NTCP_k
 * 
 * where:
 * - TCP = tumor control probability
 * - NTCP_k = complication probability for OAR k
 * - λ_k = risk aversion parameter for OAR k (organ-specific)
 * 
 * @param tcp Tumor control probability (0-1)
 * @param ntcps Array of NTCP values for multiple OARs
 * @param lambdas Array of risk aversion parameters (one per OAR)
 * @returns Multi-OAR TWI result
 */
export function calculateMultiOARTWI(
  tcp: number,
  ntcps: number[],
  lambdas: number[]
): TWIResult {
  if (ntcps.length !== lambdas.length) {
    throw new Error('Number of NTCPs must match number of lambdas');
  }
  
  // Calculate weighted sum of NTCPs
  const weightedNTCP = ntcps.reduce((sum, ntcp, i) => sum + lambdas[i] * ntcp, 0);
  
  const twi = tcp - weightedNTCP;
  
  let interpretation: string;
  if (twi > 0.2) {
    interpretation = 'Excellent multi-OAR therapeutic window';
  } else if (twi > 0.1) {
    interpretation = 'Good multi-OAR therapeutic window';
  } else if (twi > 0) {
    interpretation = 'Acceptable multi-OAR therapeutic window';
  } else if (twi > -0.1) {
    interpretation = 'Marginal multi-OAR therapeutic window';
  } else {
    interpretation = 'Poor multi-OAR therapeutic window - consider plan revision';
  }
  
  return {
    twi,
    tcp,
    ntcp: ntcps,
    lambda: lambdas,
    interpretation,
  };
}

/**
 * Rank plans by TWI
 * 
 * Allows plan comparison without automation.
 * Clinician makes final decision based on TWI ranking.
 * 
 * @param plans Array of plan TWI results
 * @returns Sorted plans (highest TWI first)
 */
export function rankPlansByTWI(plans: TWIResult[]): TWIResult[] {
  return [...plans].sort((a, b) => b.twi - a.twi);
}

// ============================================================================
// 4. CCS - Cohort-Consistency Score
// ============================================================================

/**
 * Training cohort statistics
 */
export interface CohortStatistics {
  mean: number[];           // Mean feature vector
  covariance: number[][];   // Covariance matrix
  featureNames: string[];   // Feature names
}

/**
 * Calculate Mahalanobis distance
 * 
 * Formula: D = √((x - μ)^T × Σ^(-1) × (x - μ))
 * 
 * where:
 * - x = feature vector
 * - μ = mean feature vector
 * - Σ = covariance matrix
 * 
 * @param x Feature vector
 * @param mean Mean feature vector
 * @param covarianceInv Inverse covariance matrix
 * @returns Mahalanobis distance
 */
function calculateMahalanobisDistance(
  x: number[],
  mean: number[],
  covarianceInv: number[][]
): number {
  const n = x.length;
  const diff = x.map((xi, i) => xi - mean[i]);
  
  // Calculate (x - μ)^T × Σ^(-1)
  const temp: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      temp[i] += diff[j] * covarianceInv[j][i];
    }
  }
  
  // Calculate (x - μ)^T × Σ^(-1) × (x - μ)
  let distance = 0;
  for (let i = 0; i < n; i++) {
    distance += temp[i] * diff[i];
  }
  
  return Math.sqrt(Math.abs(distance));
}

/**
 * Invert matrix using Gaussian elimination
 * 
 * Simple implementation for small matrices (< 10x10)
 * For larger matrices, use a proper linear algebra library
 * 
 * @param matrix Square matrix
 * @returns Inverse matrix
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  
  // Create augmented matrix [A | I]
  const augmented: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)),
  ]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Make diagonal 1
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) {
      throw new Error('Matrix is singular');
    }
    
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  // Extract inverse matrix
  return augmented.map(row => row.slice(n));
}

/**
 * Calculate Cohort-Consistency Score (CCS)
 * 
 * Formula: CCS = exp(-0.5 × (x - μ)^T × Σ^(-1) × (x - μ))
 * 
 * where:
 * - x = new patient feature vector
 * - μ = training cohort mean
 * - Σ = training cohort covariance matrix
 * 
 * Interpretation:
 * - CCS ≈ 1: Patient is within training cohort (safe to use model)
 * - CCS ≪ 1: Patient is out-of-distribution (unsafe to use model)
 * 
 * Threshold:
 * - CCS > 0.1: In cohort
 * - CCS ≤ 0.1: Out of cohort (warning)
 * 
 * @param patientFeatures Patient feature vector
 * @param cohortStats Training cohort statistics
 * @returns CCS result
 */
export function calculateCohortConsistencyScore(
  patientFeatures: number[],
  cohortStats: CohortStatistics
): CCSResult {
  const { mean, covariance } = cohortStats;
  
  // Validate input
  if (patientFeatures.length !== mean.length) {
    throw new Error('Feature vector length mismatch');
  }
  
  // Invert covariance matrix
  let covarianceInv: number[][];
  try {
    covarianceInv = invertMatrix(covariance);
  } catch (error) {
    throw new Error('Failed to invert covariance matrix: ' + error);
  }
  
  // Calculate Mahalanobis distance
  const mahalanobisDistance = calculateMahalanobisDistance(
    patientFeatures,
    mean,
    covarianceInv
  );
  
  // Calculate CCS
  const ccs = Math.exp(-0.5 * mahalanobisDistance ** 2);
  
  // Determine if in cohort
  const threshold = 0.1;
  const inCohort = ccs > threshold;
  
  // Generate warning if out of cohort
  let warning: string | null = null;
  if (!inCohort) {
    warning = `Patient is out-of-distribution (CCS = ${ccs.toFixed(3)}). ` +
              `Model predictions may be unreliable. ` +
              `Consider using physics-based models only or consulting with experts.`;
  }
  
  return {
    ccs,
    inCohort,
    warning,
    mahalanobisDistance,
  };
}

/**
 * Create default cohort statistics for testing
 * 
 * In production, these should be loaded from training data
 * 
 * @param featureNames Feature names
 * @returns Default cohort statistics
 */
export function createDefaultCohortStatistics(featureNames: string[]): CohortStatistics {
  const n = featureNames.length;
  
  // Default mean (zeros)
  const mean = new Array(n).fill(0);
  
  // Default covariance (identity matrix)
  const covariance = Array(n).fill(0).map((_, i) =>
    Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))
  );
  
  return {
    mean,
    covariance,
    featureNames,
  };
}
