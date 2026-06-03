import { describe, it, expect } from "vitest";
import {
  ErrorClassifier,
  AutomaticErrorRecovery,
  GlobalErrorHandler,
} from "./error-handler";
import {
  BenchmarkComparator,
  BENCHMARK_DATABASE,
} from "./benchmark-comparison";

/**
 * Error Handling Tests
 */
describe("Error Handling & Auto-Recovery", () => {
  describe("ErrorClassifier", () => {
    it("should classify DVH errors correctly", () => {
      const error = new Error("Invalid DVH data: monotonicity violation");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("DVH_ERROR");
      expect(classification.recoverable).toBe(true);
      expect(classification.severity).toBe("high");
    });

    it("should classify calculation errors correctly", () => {
      const error = new Error("Calculation failed: invalid parameters");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("CALCULATION_ERROR");
      expect(classification.recoverable).toBe(true);
      expect(classification.severity).toBe("high");
    });

    it("should classify parameter errors correctly", () => {
      const error = new Error("Invalid parameter: alpha/beta out of range");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("PARAMETER_ERROR");
      expect(classification.recoverable).toBe(true);
      expect(classification.severity).toBe("medium");
    });

    it("should classify file parsing errors correctly", () => {
      const error = new Error("Failed to parse DICOM file");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("FILE_PARSE_ERROR");
      expect(classification.recoverable).toBe(true);
      expect(classification.severity).toBe("high");
    });

    it("should classify network errors correctly", () => {
      const error = new Error("Network timeout: connection refused");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("NETWORK_ERROR");
      expect(classification.recoverable).toBe(true);
      expect(classification.severity).toBe("medium");
    });

    it("should classify unknown errors correctly", () => {
      const error = new Error("Something went wrong");
      const classification = ErrorClassifier.classifyError(error);

      expect(classification.type).toBe("UNKNOWN_ERROR");
      expect(classification.recoverable).toBe(false);
      expect(classification.severity).toBe("high");
    });
  });

  describe("AutomaticErrorRecovery", () => {
    it("should recover from DVH monotonicity violations", () => {
      const invalidDvh = [
        { dose: 0, volume: 100 },
        { dose: 10, volume: 95 },
        { dose: 20, volume: 98 }, // Violates monotonicity
        { dose: 30, volume: 80 },
      ];

      const recovery = AutomaticErrorRecovery.recoverDVHError(
        invalidDvh,
        new Error("Monotonicity violation")
      );

      expect(recovery.recovered).toBe(true);
      expect(recovery.recoveryMethod).toBe("MONOTONICITY_ENFORCEMENT");
      expect(recovery.recoveredValue).toBeDefined();
      expect(Array.isArray(recovery.recoveredValue)).toBe(true);
    });

    it("should recover from parameter range violations", () => {
      const invalidParams = {
        alphaBeta: 100, // Out of range (should be 0.5-50)
        d50: 300, // Out of range (should be 10-200)
        gamma50: 0.2, // Out of range (should be 0.5-10)
      };

      const recovery = AutomaticErrorRecovery.recoverCalculationError(
        invalidParams,
        new Error("Parameter out of range")
      );

      expect(recovery.recovered).toBe(true);
      expect(recovery.recoveryMethod).toBe("PARAMETER_CLAMPING");
      const fixed = recovery.recoveredValue as Record<string, number>;
      expect(fixed.alphaBeta).toBeLessThanOrEqual(50);
      expect(fixed.alphaBeta).toBeGreaterThanOrEqual(0.5);
      expect(fixed.d50).toBeLessThanOrEqual(200);
      expect(fixed.d50).toBeGreaterThanOrEqual(10);
      expect(fixed.gamma50).toBeLessThanOrEqual(10);
      expect(fixed.gamma50).toBeGreaterThanOrEqual(0.5);
    });

    it("should recover from file parsing errors with flexible format", () => {
      const fileContent = `# DVH Data
dose,volume
0,100
10,95
20,85
30,70`;

      const recovery = AutomaticErrorRecovery.recoverParsingError(
        fileContent,
        new Error("Parse error")
      );

      expect(recovery.recovered).toBe(true);
      expect(recovery.recoveryMethod).toBe("FLEXIBLE_PARSING");
      expect(Array.isArray(recovery.recoveredValue)).toBe(true);
      const parsed = recovery.recoveredValue as Array<{
        dose: number;
        volume: number;
      }>;
      expect(parsed.length).toBe(4);
      expect(parsed[0].dose).toBe(0);
      expect(parsed[0].volume).toBe(100);
    });

    it("should handle network errors with exponential backoff", () => {
      const recovery1 = AutomaticErrorRecovery.recoverNetworkError(0, 3);
      expect(recovery1.recoveryMethod).toBe("EXPONENTIAL_BACKOFF_RETRY");
      expect(recovery1.recommendation).toContain("Retrying after 1000ms");

      const recovery2 = AutomaticErrorRecovery.recoverNetworkError(1, 3);
      expect(recovery2.recommendation).toContain("Retrying after 2000ms");

      const recovery3 = AutomaticErrorRecovery.recoverNetworkError(3, 3);
      expect(recovery3.recovered).toBe(false);
      expect(recovery3.recoveryMethod).toBe("NETWORK_RECOVERY_FAILED");
    });
  });

  describe("GlobalErrorHandler", () => {
    it("should log errors correctly", () => {
      GlobalErrorHandler.clearErrorLog();

      const error = new Error("Test error");
      GlobalErrorHandler.handleError(error, {
        userId: "user123",
        calculationId: "calc456",
      });

      const log = GlobalErrorHandler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].message).toBe("Test error");
      expect(log[0].userId).toBe("user123");
      expect(log[0].calculationId).toBe("calc456");
    });

    it("should maintain log size limit", () => {
      GlobalErrorHandler.clearErrorLog();

      // Add more errors than max log size
      for (let i = 0; i < 1100; i++) {
        GlobalErrorHandler.handleError(new Error(`Error ${i}`));
      }

      const log = GlobalErrorHandler.getErrorLog(100);
      expect(log.length).toBeLessThanOrEqual(100);
    });
  });
});

/**
 * Benchmark Comparison Tests
 */
describe("Benchmark Comparison", () => {
  describe("BenchmarkComparator", () => {
    it("should retrieve benchmark values for organs", () => {
      const benchmark = BenchmarkComparator.getBenchmarkValues(
        "Rectum",
        "LKB"
      );

      expect(benchmark).toBeDefined();
      expect(benchmark?.organName).toBe("Rectum");
      expect(benchmark?.tcpTarget).toBe(0.85);
      expect(benchmark?.ntcpLimit).toBe(0.15);
    });

    it("should return null for unknown organs", () => {
      const benchmark = BenchmarkComparator.getBenchmarkValues(
        "UnknownOrgan",
        "LKB"
      );

      expect(benchmark).toBeNull();
    });

    it("should compare results with benchmarks - excellent case", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.85, // User TCP matches benchmark
        0.14, // User NTCP below limit
        benchmark
      );

      expect(comparison.clinicalSignificance).toBe("excellent");
      expect(comparison.complianceStatus).toBe("compliant");
      expect(comparison.tcpDeviation).toBeLessThan(5);
    });

    it("should compare results with benchmarks - good case", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.82, // User TCP slightly below benchmark
        0.15, // User NTCP at limit
        benchmark
      );

      expect(comparison.clinicalSignificance).toBe("excellent");
      expect(comparison.complianceStatus).toBe("compliant");
    });

    it("should compare results with benchmarks - warning case", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.75, // User TCP below benchmark
        0.18, // User NTCP above limit
        benchmark
      );

      expect(comparison.clinicalSignificance).toBe("acceptable");
      expect(comparison.complianceStatus).toBe("warning");
      expect(comparison.recommendation).toContain("Consider");
    });

    it("should compare results with benchmarks - non-compliant case", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.65, // User TCP well below benchmark
        0.25, // User NTCP well above limit
        benchmark
      );

      expect(comparison.clinicalSignificance).toBe("suboptimal");
      expect(comparison.complianceStatus).toBe("warning");
    });

    it("should calculate deviations correctly", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.82, // 3.5% below benchmark
        0.14, // 6.7% below limit
        benchmark
      );

      expect(Math.abs(comparison.tcpDeviation - (-3.5))).toBeLessThan(0.1);
      expect(Math.abs(comparison.ntcpDeviation - (-6.7))).toBeLessThan(0.1);
    });

    it("should get all benchmarks", () => {
      const allBenchmarks = BenchmarkComparator.getAllBenchmarks();

      expect(Array.isArray(allBenchmarks)).toBe(true);
      expect(allBenchmarks.length).toBeGreaterThan(0);
      expect(allBenchmarks[0]).toHaveProperty("organName");
      expect(allBenchmarks[0]).toHaveProperty("tcpTarget");
      expect(allBenchmarks[0]).toHaveProperty("ntcpLimit");
    });

    it("should get benchmarks by category", () => {
      const headNeckBenchmarks =
        BenchmarkComparator.getBenchmarksByCategory("head_neck");

      expect(Array.isArray(headNeckBenchmarks)).toBe(true);
      expect(headNeckBenchmarks.length).toBeGreaterThan(0);
      expect(
        headNeckBenchmarks.some((b) => b.organName.includes("Parotid"))
      ).toBe(true);
    });

    it("should generate comparison reports", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];
      const comparison = BenchmarkComparator.compareWithBenchmark(
        0.85,
        0.14,
        benchmark
      );

      const report = BenchmarkComparator.generateComparisonReport(comparison);

      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("details");
      expect(report).toHaveProperty("visualization");
      expect(report.details).toHaveProperty("userTcp");
      expect(report.details).toHaveProperty("benchmarkTcp");
      expect(report.visualization).toHaveProperty("tcpBar");
      expect(report.visualization).toHaveProperty("ntcpBar");
      expect(report.visualization).toHaveProperty("therapeuticWindow");
    });

    it("should include recommendations in comparison", () => {
      const benchmark = BENCHMARK_DATABASE["Rectum_LKB"];

      // Case 1: TCP below benchmark
      const comparison1 = BenchmarkComparator.compareWithBenchmark(
        0.75,
        0.14,
        benchmark
      );
      expect(comparison1.recommendation).toContain("dose escalation");

      // Case 2: NTCP above limit
      const comparison2 = BenchmarkComparator.compareWithBenchmark(
        0.85,
        0.2,
        benchmark
      );
      expect(comparison2.recommendation).toContain("dose reduction");

      // Case 3: Both good
      const comparison3 = BenchmarkComparator.compareWithBenchmark(
        0.85,
        0.14,
        benchmark
      );
      expect(comparison3.recommendation).toContain("Proceed");
    });
  });

  describe("Benchmark Database", () => {
    it("should have comprehensive organ coverage", () => {
      const organs = Object.values(BENCHMARK_DATABASE).map(
        (b) => b.organName
      );

      expect(organs).toContain("Parotid Gland");
      expect(organs).toContain("Rectum");
      expect(organs).toContain("Lung");
      expect(organs).toContain("Heart");
      expect(organs).toContain("Prostate");
    });

    it("should have valid benchmark values", () => {
      Object.values(BENCHMARK_DATABASE).forEach((benchmark) => {
        expect(benchmark.tcpTarget).toBeGreaterThanOrEqual(0);
        expect(benchmark.tcpTarget).toBeLessThanOrEqual(1);
        expect(benchmark.ntcpLimit).toBeGreaterThanOrEqual(0);
        expect(benchmark.ntcpLimit).toBeLessThanOrEqual(1);
        expect(benchmark.therapeuticWindowMin).toBeGreaterThanOrEqual(0);
        expect(benchmark.therapeuticWindowMax).toBeLessThanOrEqual(1);
        expect(benchmark.therapeuticWindowMin).toBeLessThan(
          benchmark.therapeuticWindowMax
        );
      });
    });

    it("should have proper citations", () => {
      Object.values(BENCHMARK_DATABASE).forEach((benchmark) => {
        expect(benchmark.source).toBeTruthy();
        expect(benchmark.year).toBeGreaterThan(2000);
        expect(benchmark.year).toBeLessThanOrEqual(new Date().getFullYear());
      });
    });
  });
});

/**
 * Integration Tests
 */
describe("Integration Tests", () => {
  it("should handle complete error recovery workflow", () => {
    // Simulate error detection and recovery
    const invalidDvh = [
      { dose: 0, volume: 100 },
      { dose: 10, volume: 98 }, // Violates monotonicity
      { dose: 20, volume: 99 },
    ];

    const error = new Error("DVH validation failed");
    const classification = ErrorClassifier.classifyError(error);

    expect(classification.recoverable).toBe(true);

    const recovery = AutomaticErrorRecovery.recoverDVHError(
      invalidDvh,
      error
    );

    expect(recovery.recovered).toBe(true);
    expect(recovery.recoveredValue).toBeDefined();

    // Log the recovery
    GlobalErrorHandler.handleError(error, {
      calculationId: "test_calc",
    });

    const log = GlobalErrorHandler.getErrorLog();
    expect(log.length).toBeGreaterThan(0);
  });

  it("should handle complete benchmark comparison workflow", () => {
    // Get benchmark
    const benchmark = BenchmarkComparator.getBenchmarkValues("Rectum", "LKB");
    expect(benchmark).toBeDefined();

    // Compare results
    const comparison = BenchmarkComparator.compareWithBenchmark(
      0.82,
      0.14,
      benchmark!
    );

    expect(comparison.clinicalSignificance).toBeDefined();
    expect(comparison.complianceStatus).toBeDefined();

    // Generate report
    const report = BenchmarkComparator.generateComparisonReport(comparison);

    expect(report.summary.toUpperCase()).toContain(comparison.clinicalSignificance.toUpperCase());
    expect(report.details.userTcp).toBeDefined();
    expect(report.visualization.tcpBar).toBeDefined();
  });
});
