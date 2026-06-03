/**
 * Benchmark Comparison Service
 * 
 * Provides instant comparison of user results with QUANTEC/RTOG benchmark values
 * Includes clinical significance assessment and recommendations
 */

import { z } from "zod";

export interface BenchmarkValue {
  organName: string;
  modelType: string;
  tcpTarget: number;
  ntcpLimit: number;
  therapeuticWindowMin: number;
  therapeuticWindowMax: number;
  source: string;
  year: number;
}

export interface BenchmarkComparison {
  userTcp: number;
  userNtcp: number;
  benchmarkTcp: number;
  benchmarkNtcp: number;
  tcpDeviation: number;
  ntcpDeviation: number;
  clinicalSignificance: "excellent" | "good" | "acceptable" | "suboptimal" | "poor";
  recommendation: string;
  complianceStatus: "compliant" | "warning" | "non_compliant";
}

/**
 * QUANTEC/RTOG Benchmark Database
 */
export const BENCHMARK_DATABASE: Record<string, BenchmarkValue> = {
  // HEAD & NECK
  "Parotid_LKB": {
    organName: "Parotid Gland",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.85,
    ntcpLimit: 0.2,
    therapeuticWindowMin: 0.65,
    therapeuticWindowMax: 0.95,
    source: "QUANTEC",
    year: 2010,
  },
  "Larynx_LKB": {
    organName: "Larynx",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.9,
    ntcpLimit: 0.1,
    therapeuticWindowMin: 0.8,
    therapeuticWindowMax: 0.98,
    source: "QUANTEC",
    year: 2010,
  },
  "SpinalCord_LKB": {
    organName: "Spinal Cord",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.95,
    ntcpLimit: 0.05,
    therapeuticWindowMin: 0.9,
    therapeuticWindowMax: 0.99,
    source: "QUANTEC",
    year: 2010,
  },

  // THORAX
  "Lung_LKB": {
    organName: "Lung",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.8,
    ntcpLimit: 0.15,
    therapeuticWindowMin: 0.65,
    therapeuticWindowMax: 0.92,
    source: "QUANTEC",
    year: 2010,
  },
  "Heart_LKB": {
    organName: "Heart",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.85,
    ntcpLimit: 0.1,
    therapeuticWindowMin: 0.75,
    therapeuticWindowMax: 0.95,
    source: "QUANTEC",
    year: 2010,
  },
  "Esophagus_LKB": {
    organName: "Esophagus",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.88,
    ntcpLimit: 0.12,
    therapeuticWindowMin: 0.76,
    therapeuticWindowMax: 0.96,
    source: "QUANTEC",
    year: 2010,
  },

  // ABDOMEN & PELVIS
  "Rectum_LKB": {
    organName: "Rectum",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.85,
    ntcpLimit: 0.15,
    therapeuticWindowMin: 0.7,
    therapeuticWindowMax: 0.95,
    source: "QUANTEC",
    year: 2010,
  },
  "Bladder_LKB": {
    organName: "Bladder",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.82,
    ntcpLimit: 0.18,
    therapeuticWindowMin: 0.64,
    therapeuticWindowMax: 0.94,
    source: "QUANTEC",
    year: 2010,
  },
  "SmallBowel_LKB": {
    organName: "Small Bowel",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.8,
    ntcpLimit: 0.1,
    therapeuticWindowMin: 0.7,
    therapeuticWindowMax: 0.92,
    source: "QUANTEC",
    year: 2010,
  },

  // PROSTATE
  "Prostate_LKB": {
    organName: "Prostate",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.92,
    ntcpLimit: 0.08,
    therapeuticWindowMin: 0.84,
    therapeuticWindowMax: 0.98,
    source: "RTOG",
    year: 2015,
  },

  // BREAST
  "Breast_LKB": {
    organName: "Breast Tissue",
    modelType: "LKB Log-Logistic",
    tcpTarget: 0.88,
    ntcpLimit: 0.12,
    therapeuticWindowMin: 0.76,
    therapeuticWindowMax: 0.96,
    source: "QUANTEC",
    year: 2010,
  },

  // TARGETS
  "PTV_Poisson": {
    organName: "PTV (Planning Target Volume)",
    modelType: "Poisson",
    tcpTarget: 0.9,
    ntcpLimit: 0.0,
    therapeuticWindowMin: 0.85,
    therapeuticWindowMax: 0.99,
    source: "QUANTEC",
    year: 2010,
  },
  "GTV_Poisson": {
    organName: "GTV (Gross Tumor Volume)",
    modelType: "Poisson",
    tcpTarget: 0.95,
    ntcpLimit: 0.0,
    therapeuticWindowMin: 0.9,
    therapeuticWindowMax: 0.99,
    source: "QUANTEC",
    year: 2010,
  },
};

/**
 * Benchmark Comparison Engine
 */
export class BenchmarkComparator {
  /**
   * Get benchmark values for organ
   */
  static getBenchmarkValues(
    organName: string,
    modelType: string = "LKB"
  ): BenchmarkValue | null {
    const key = `${organName}_${modelType}`;
    return BENCHMARK_DATABASE[key] || null;
  }

  /**
   * Compare user results with benchmark
   */
  static compareWithBenchmark(
    userTcp: number,
    userNtcp: number,
    benchmark: BenchmarkValue
  ): BenchmarkComparison {
    // Calculate deviations
    const tcpDeviation = ((userTcp - benchmark.tcpTarget) / benchmark.tcpTarget) * 100;
    const ntcpDeviation = ((userNtcp - benchmark.ntcpLimit) / benchmark.ntcpLimit) * 100;

    // Determine clinical significance
    let clinicalSignificance: "excellent" | "good" | "acceptable" | "suboptimal" | "poor";
    let complianceStatus: "compliant" | "warning" | "non_compliant";

    // Therapeutic window assessment
    const inTherapeuticWindow =
      userTcp >= benchmark.therapeuticWindowMin &&
      userTcp <= benchmark.therapeuticWindowMax &&
      userNtcp <= benchmark.ntcpLimit;

    if (inTherapeuticWindow && tcpDeviation > -5 && ntcpDeviation < 10) {
      clinicalSignificance = "excellent";
      complianceStatus = "compliant";
    } else if (
      userTcp >= benchmark.tcpTarget * 0.95 &&
      userNtcp <= benchmark.ntcpLimit * 1.1
    ) {
      clinicalSignificance = "good";
      complianceStatus = "compliant";
    } else if (
      userTcp >= benchmark.tcpTarget * 0.85 &&
      userNtcp <= benchmark.ntcpLimit * 1.2
    ) {
      clinicalSignificance = "acceptable";
      complianceStatus = "warning";
    } else if (userTcp >= benchmark.tcpTarget * 0.75) {
      clinicalSignificance = "suboptimal";
      complianceStatus = "warning";
    } else {
      clinicalSignificance = "poor";
      complianceStatus = "non_compliant";
    }

    // Generate recommendation
    let recommendation = "";
    if (userTcp < benchmark.tcpTarget) {
      recommendation += `TCP is ${Math.abs(tcpDeviation).toFixed(1)}% below benchmark. Consider dose escalation. `;
    }
    if (userNtcp > benchmark.ntcpLimit) {
      recommendation += `NTCP exceeds limit by ${ntcpDeviation.toFixed(1)}%. Consider dose reduction or organ-sparing techniques. `;
    }
    if (inTherapeuticWindow) {
      recommendation += "Plan is within optimal therapeutic window. Proceed with treatment.";
    }

    return {
      userTcp,
      userNtcp,
      benchmarkTcp: benchmark.tcpTarget,
      benchmarkNtcp: benchmark.ntcpLimit,
      tcpDeviation,
      ntcpDeviation,
      clinicalSignificance,
      recommendation: recommendation.trim(),
      complianceStatus,
    };
  }

  /**
   * Get all available benchmarks
   */
  static getAllBenchmarks(): BenchmarkValue[] {
    return Object.values(BENCHMARK_DATABASE);
  }

  /**
   * Get benchmarks by category
   */
  static getBenchmarksByCategory(category: string): BenchmarkValue[] {
    const categoryMap: Record<string, string[]> = {
      head_neck: ["Parotid", "Larynx", "SpinalCord"],
      thorax: ["Lung", "Heart", "Esophagus"],
      abdomen_pelvis: ["Rectum", "Bladder", "SmallBowel"],
      prostate: ["Prostate"],
      breast: ["Breast"],
      targets: ["PTV", "GTV"],
    };

    const organs = categoryMap[category] || [];
    return Object.values(BENCHMARK_DATABASE).filter((b) =>
      organs.some((o) => b.organName.includes(o))
    );
  }

  /**
   * Generate benchmark comparison report
   */
  static generateComparisonReport(
    comparison: BenchmarkComparison
  ): {
    summary: string;
    details: Record<string, unknown>;
    visualization: {
      tcpBar: { user: number; benchmark: number };
      ntcpBar: { user: number; benchmark: number };
      therapeuticWindow: { min: number; max: number; userValue: number };
    };
  } {
    return {
      summary: `${comparison.clinicalSignificance.toUpperCase()}: ${comparison.recommendation}`,
      details: {
        userTcp: (comparison.userTcp * 100).toFixed(2) + "%",
        benchmarkTcp: (comparison.benchmarkTcp * 100).toFixed(2) + "%",
        tcpDeviation: comparison.tcpDeviation.toFixed(2) + "%",
        userNtcp: (comparison.userNtcp * 100).toFixed(2) + "%",
        benchmarkNtcp: (comparison.benchmarkNtcp * 100).toFixed(2) + "%",
        ntcpDeviation: comparison.ntcpDeviation.toFixed(2) + "%",
        complianceStatus: comparison.complianceStatus,
      },
      visualization: {
        tcpBar: {
          user: comparison.userTcp,
          benchmark: comparison.benchmarkTcp,
        },
        ntcpBar: {
          user: comparison.userNtcp,
          benchmark: comparison.benchmarkNtcp,
        },
        therapeuticWindow: {
          min: 0.65,
          max: 0.95,
          userValue: comparison.userTcp,
        },
      },
    };
  }
}

/**
 * Benchmark Schema Validation
 */
export const BenchmarkValueSchema = z.object({
  organName: z.string(),
  modelType: z.string(),
  tcpTarget: z.number().min(0).max(1),
  ntcpLimit: z.number().min(0).max(1),
  therapeuticWindowMin: z.number().min(0).max(1),
  therapeuticWindowMax: z.number().min(0).max(1),
  source: z.string(),
  year: z.number(),
});

export const BenchmarkComparisonSchema = z.object({
  userTcp: z.number().min(0).max(1),
  userNtcp: z.number().min(0).max(1),
  benchmarkTcp: z.number().min(0).max(1),
  benchmarkNtcp: z.number().min(0).max(1),
  tcpDeviation: z.number(),
  ntcpDeviation: z.number(),
  clinicalSignificance: z.enum([
    "excellent",
    "good",
    "acceptable",
    "suboptimal",
    "poor",
  ]),
  recommendation: z.string(),
  complianceStatus: z.enum(["compliant", "warning", "non_compliant"]),
});
