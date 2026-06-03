/**
 * Predictive Plan Optimization Service
 * 
 * Analyzes historical case data to provide optimization suggestions
 * for achieving better therapeutic windows and treatment outcomes
 */

import { z } from "zod";

export const OptimizationSuggestionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  suggestionType: z.enum([
    "dose_escalation",
    "dose_reduction",
    "fractionation_adjustment",
    "organ_sparing",
    "tcp_improvement",
    "ntcp_reduction",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  organ: z.string(),
  currentValue: z.number(),
  recommendedValue: z.number(),
  rationale: z.string(),
  expectedOutcome: z.string(),
  confidence: z.number().min(0).max(1), // 0-1 confidence score
  historicalBasis: z.object({
    similarCasesAnalyzed: z.number(),
    successRate: z.number(),
    averageOutcome: z.number(),
  }),
  timestamp: z.string().datetime(),
  implemented: z.boolean().default(false),
  implementedBy: z.string().optional(),
  implementedAt: z.string().datetime().optional(),
  outcome: z.string().optional(),
});

export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>;

interface HistoricalCase {
  caseId: string;
  tumorSite: string;
  totalDose: number;
  fractionSize: number;
  numberOfFractions: number;
  organs: Array<{
    name: string;
    type: "target" | "oar";
    tcp?: number;
    ntcp?: number;
    doseMetrics: {
      meanDose?: number;
      maxDose?: number;
      minDose?: number;
      v20?: number;
      v30?: number;
      v40?: number;
      v50?: number;
    };
  }>;
  therapeuticWindow: number;
  clinicalOutcome: "excellent" | "good" | "acceptable" | "poor";
  followUpMonths: number;
  complications?: string[];
}

/**
 * Predictive Plan Optimization Service
 */
export class PlanOptimizerService {
  private static historicalCases: HistoricalCase[] = [];
  private static optimizationSuggestions: OptimizationSuggestion[] = [];

  /**
   * Add historical case data for analysis
   */
  static addHistoricalCase(caseData: HistoricalCase): void {
    this.historicalCases.push(caseData);
  }

  /**
   * Find similar cases from historical data
   */
  static findSimilarCases(
    tumorSite: string,
    totalDose: number,
    fractionSize: number,
    tolerance: number = 0.1 // 10% tolerance
  ): HistoricalCase[] {
    return this.historicalCases.filter((c) => {
      const siteSimilar = c.tumorSite.toLowerCase() === tumorSite.toLowerCase();
      const doseSimilar =
        Math.abs(c.totalDose - totalDose) / totalDose <= tolerance;
      const fracSimilar =
        Math.abs(c.fractionSize - fractionSize) / fractionSize <= tolerance;

      return siteSimilar && doseSimilar && fracSimilar;
    });
  }

  /**
   * Analyze therapeutic window from historical cases
   */
  static analyzeTherapeuticWindow(
    tumorSite: string,
    targetOrgans: string[],
    oarOrgans: string[]
  ): {
    averageWindow: number;
    maxWindow: number;
    minWindow: number;
    optimalRange: { min: number; max: number };
  } {
    const similarCases = this.historicalCases.filter(
      (c) => c.tumorSite.toLowerCase() === tumorSite.toLowerCase()
    );

    if (similarCases.length === 0) {
      return {
        averageWindow: 0,
        maxWindow: 0,
        minWindow: 0,
        optimalRange: { min: 0, max: 0 },
      };
    }

    const windows = similarCases.map((c) => c.therapeuticWindow);
    const excellentCases = similarCases.filter(
      (c) => c.clinicalOutcome === "excellent"
    );

    const averageWindow = windows.reduce((a, b) => a + b, 0) / windows.length;
    const maxWindow = Math.max(...windows);
    const minWindow = Math.min(...windows);

    const excellentWindows = excellentCases.map((c) => c.therapeuticWindow);
    const optimalMin =
      excellentWindows.length > 0
        ? Math.min(...excellentWindows)
        : averageWindow * 0.8;
    const optimalMax =
      excellentWindows.length > 0
        ? Math.max(...excellentWindows)
        : averageWindow * 1.2;

    return {
      averageWindow,
      maxWindow,
      minWindow,
      optimalRange: { min: optimalMin, max: optimalMax },
    };
  }

  /**
   * Generate optimization suggestions
   */
  static async generateOptimizationSuggestions(
    caseId: string,
    tumorSite: string,
    currentDose: number,
    currentFractionSize: number,
    currentNumberOfFractions: number,
    organData: Array<{
      name: string;
      type: "target" | "oar";
      currentTCP?: number;
      currentNTCP?: number;
      currentMeanDose?: number;
    }>
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const similarCases = this.findSimilarCases(
      tumorSite,
      currentDose,
      currentFractionSize,
      0.15
    );

    if (similarCases.length < 3) {
      // Not enough data for reliable suggestions
      return suggestions;
    }

    // Analyze target organs (TCP improvement)
    const targetOrgans = organData.filter((o) => o.type === "target");
    for (const organ of targetOrgans) {
      const similarOrganData = similarCases
        .map((c) => c.organs.find((o) => o.name === organ.name))
        .filter((o) => o !== undefined) as any[];

      if (similarOrganData.length > 0) {
        const avgTCP =
          similarOrganData.reduce((sum, o) => sum + (o.tcp || 0), 0) /
          similarOrganData.length;
        const maxTCP = Math.max(...similarOrganData.map((o) => o.tcp || 0));

        if (organ.currentTCP && organ.currentTCP < maxTCP * 0.95) {
          // Suggest dose escalation
          const doseIncrease = (maxTCP - organ.currentTCP) * 2; // Heuristic: 2 Gy per 1% TCP increase

          suggestions.push({
            id: Math.random().toString(36).substring(2, 11),
            caseId,
            suggestionType: "dose_escalation",
            priority: organ.currentTCP < 0.7 ? "high" : "medium",
            organ: organ.name,
            currentValue: currentDose,
            recommendedValue: Math.min(
              currentDose + doseIncrease,
              currentDose * 1.1
            ), // Max 10% increase
            rationale: `Historical data shows similar cases achieve TCP of ${(avgTCP * 100).toFixed(1)}% at current fractionation. Dose escalation may improve TCP.`,
            expectedOutcome: `Potential TCP improvement from ${(organ.currentTCP * 100).toFixed(1)}% to ${(Math.min(organ.currentTCP + doseIncrease / 10, maxTCP) * 100).toFixed(1)}%`,
            confidence: Math.min(similarOrganData.length / 10, 1),
            historicalBasis: {
              similarCasesAnalyzed: similarOrganData.length,
              successRate:
                similarOrganData.filter((o) => o.tcp && o.tcp > 0.8).length /
                similarOrganData.length,
              averageOutcome: avgTCP,
            },
            timestamp: new Date().toISOString(),
            implemented: false,
          });
        }
      }
    }

    // Analyze OAR organs (NTCP reduction)
    const oarOrgans = organData.filter((o) => o.type === "oar");
    for (const organ of oarOrgans) {
      const similarOrganData = similarCases
        .map((c) => c.organs.find((o) => o.name === organ.name))
        .filter((o) => o !== undefined) as any[];

      if (similarOrganData.length > 0) {
        const avgNTCP =
          similarOrganData.reduce((sum, o) => sum + (o.ntcp || 0), 0) /
          similarOrganData.length;
        const minNTCP = Math.min(...similarOrganData.map((o) => o.ntcp || 0));

        if (organ.currentNTCP && organ.currentNTCP > minNTCP * 1.1) {
          // Suggest dose reduction or organ sparing
          const doseReduction = (organ.currentNTCP - minNTCP) * 3; // Heuristic

          suggestions.push({
            id: Math.random().toString(36).substring(2, 11),
            caseId,
            suggestionType: "organ_sparing",
            priority: organ.currentNTCP > 0.3 ? "high" : "medium",
            organ: organ.name,
            currentValue: organ.currentMeanDose || 0,
            recommendedValue: Math.max(
              (organ.currentMeanDose || 0) - doseReduction,
              0
            ),
            rationale: `Historical data shows similar cases achieve NTCP of ${(avgNTCP * 100).toFixed(1)}% at lower doses. Consider organ sparing techniques.`,
            expectedOutcome: `Potential NTCP reduction from ${(organ.currentNTCP * 100).toFixed(1)}% to ${(Math.max(organ.currentNTCP - doseReduction / 10, minNTCP) * 100).toFixed(1)}%`,
            confidence: Math.min(similarOrganData.length / 10, 1),
            historicalBasis: {
              similarCasesAnalyzed: similarOrganData.length,
              successRate:
                similarOrganData.filter((o) => o.ntcp && o.ntcp < 0.2).length /
                similarOrganData.length,
              averageOutcome: avgNTCP,
            },
            timestamp: new Date().toISOString(),
            implemented: false,
          });
        }
      }
    }

    // Analyze fractionation
    const excellentCases = similarCases.filter(
      (c) => c.clinicalOutcome === "excellent"
    );
    if (excellentCases.length > 0) {
      const avgExcellentFracSize =
        excellentCases.reduce((sum, c) => sum + c.fractionSize, 0) /
        excellentCases.length;

      if (
        Math.abs(currentFractionSize - avgExcellentFracSize) /
          avgExcellentFracSize >
        0.1
      ) {
        suggestions.push({
          id: Math.random().toString(36).substring(2, 11),
          caseId,
          suggestionType: "fractionation_adjustment",
          priority: "medium",
          organ: "treatment_plan",
          currentValue: currentFractionSize,
          recommendedValue: avgExcellentFracSize,
          rationale: `Excellent outcomes in similar cases use ${avgExcellentFracSize} Gy fractionation. Consider adjustment.`,
          expectedOutcome: `Improved treatment outcome consistency based on historical data`,
          confidence: Math.min(excellentCases.length / 10, 1),
          historicalBasis: {
            similarCasesAnalyzed: excellentCases.length,
            successRate: 1.0, // All are excellent cases
            averageOutcome: avgExcellentFracSize,
          },
          timestamp: new Date().toISOString(),
          implemented: false,
        });
      }
    }

    this.optimizationSuggestions.push(...suggestions);
    return suggestions;
  }

  /**
   * Mark suggestion as implemented
   */
  static async implementSuggestion(
    suggestionId: string,
    implementedBy: string
  ): Promise<boolean> {
    const suggestion = this.optimizationSuggestions.find(
      (s) => s.id === suggestionId
    );

    if (suggestion) {
      suggestion.implemented = true;
      suggestion.implementedBy = implementedBy;
      suggestion.implementedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * Record outcome of implemented suggestion
   */
  static async recordSuggestionOutcome(
    suggestionId: string,
    outcome: string
  ): Promise<boolean> {
    const suggestion = this.optimizationSuggestions.find(
      (s) => s.id === suggestionId
    );

    if (suggestion) {
      suggestion.outcome = outcome;
      return true;
    }

    return false;
  }

  /**
   * Get suggestions for a case
   */
  static getCaseSuggestions(caseId: string): OptimizationSuggestion[] {
    return this.optimizationSuggestions.filter((s) => s.caseId === caseId);
  }

  /**
   * Get optimization statistics
   */
  static getOptimizationStats(): {
    totalSuggestions: number;
    implementedSuggestions: number;
    successfulOutcomes: number;
    averageConfidence: number;
  } {
    const total = this.optimizationSuggestions.length;
    const implemented = this.optimizationSuggestions.filter(
      (s) => s.implemented
    ).length;
    const successful = this.optimizationSuggestions.filter(
      (s) => s.outcome === "successful"
    ).length;
    const avgConfidence =
      total > 0
        ? this.optimizationSuggestions.reduce((sum, s) => sum + s.confidence, 0) /
          total
        : 0;

    return {
      totalSuggestions: total,
      implementedSuggestions: implemented,
      successfulOutcomes: successful,
      averageConfidence: avgConfidence,
    };
  }
}
