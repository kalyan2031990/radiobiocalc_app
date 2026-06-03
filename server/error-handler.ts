/**
 * Robust Error Handling & Automatic Bug Fixing System
 * 
 * Provides comprehensive error handling, recovery, and automatic fixes
 * for runtime and execution errors in radiobiology calculations
 */

import { z } from "zod";

export interface ErrorContext {
  errorId: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  calculationId?: string;
}

export interface ErrorRecovery {
  errorId: string;
  recoveryMethod: string;
  recovered: boolean;
  recoveredValue?: unknown;
  fallbackUsed: boolean;
  recommendation: string;
}

/**
 * Error Classification & Analysis
 */
export class ErrorClassifier {
  static classifyError(error: Error): {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    recoverable: boolean;
  } {
    const message = error.message.toLowerCase();

    // DVH-related errors
    if (message.includes("dvh") || message.includes("dose-volume")) {
      return {
        type: "DVH_ERROR",
        severity: message.includes("invalid") ? "high" : "medium",
        recoverable: true,
      };
    }

    // Calculation errors
    if (message.includes("calculation") || message.includes("compute")) {
      return {
        type: "CALCULATION_ERROR",
        severity: "high",
        recoverable: true,
      };
    }

    // Parameter errors
    if (message.includes("parameter") || message.includes("invalid")) {
      return {
        type: "PARAMETER_ERROR",
        severity: "medium",
        recoverable: true,
      };
    }

    // File parsing errors
    if (message.includes("parse") || message.includes("dicom")) {
      return {
        type: "FILE_PARSE_ERROR",
        severity: "high",
        recoverable: true,
      };
    }

    // Network errors
    if (message.includes("network") || message.includes("timeout")) {
      return {
        type: "NETWORK_ERROR",
        severity: "medium",
        recoverable: true,
      };
    }

    // Database errors
    if (message.includes("database") || message.includes("query")) {
      return {
        type: "DATABASE_ERROR",
        severity: "high",
        recoverable: false,
      };
    }

    // Unknown errors
    return {
      type: "UNKNOWN_ERROR",
      severity: "high",
      recoverable: false,
    };
  }
}

/**
 * Automatic Error Recovery & Bug Fixing
 */
export class AutomaticErrorRecovery {
  /**
   * Attempt to recover from DVH errors
   */
  static recoverDVHError(
    dvhData: Array<{ dose: number; volume: number }>,
    error: Error
  ): ErrorRecovery {
    const errorId = `recovery_${Date.now()}`;

    try {
      // Check for monotonicity violation
      let isMonotonic = true;
      for (let i = 1; i < dvhData.length; i++) {
        if (dvhData[i].volume > dvhData[i - 1].volume) {
          isMonotonic = false;
          break;
        }
      }

      if (!isMonotonic) {
        // Auto-fix: Sort and enforce monotonicity
        const sorted = [...dvhData].sort((a, b) => b.dose - a.dose);
        const fixed = sorted.map((point, i) => ({
          dose: point.dose,
          volume: Math.min(point.volume, i === 0 ? 100 : sorted[i - 1].volume),
        }));

        return {
          errorId,
          recoveryMethod: "MONOTONICITY_ENFORCEMENT",
          recovered: true,
          recoveredValue: fixed,
          fallbackUsed: false,
          recommendation: "DVH was automatically corrected for monotonicity",
        };
      }

      // Check for outliers and smooth
      const smoothed = this.smoothDVH(dvhData);
      return {
        errorId,
        recoveryMethod: "DVH_SMOOTHING",
        recovered: true,
        recoveredValue: smoothed,
        fallbackUsed: false,
        recommendation: "DVH was automatically smoothed to remove noise",
      };
    } catch (recoveryError) {
      return {
        errorId,
        recoveryMethod: "DVH_RECOVERY_FAILED",
        recovered: false,
        fallbackUsed: true,
        recommendation: "Unable to auto-recover DVH data. Please re-import.",
      };
    }
  }

  /**
   * Attempt to recover from calculation errors
   */
  static recoverCalculationError(
    params: Record<string, number>,
    error: Error
  ): ErrorRecovery {
    const errorId = `recovery_${Date.now()}`;

    try {
      // Check for invalid parameter ranges
      const fixed: Record<string, number> = { ...params };

      // Clamp alpha/beta to valid range
      if (fixed.alphaBeta && (fixed.alphaBeta < 0.5 || fixed.alphaBeta > 50)) {
        fixed.alphaBeta = Math.max(0.5, Math.min(50, fixed.alphaBeta));
      }

      // Clamp D50 to valid range
      if (fixed.d50 && (fixed.d50 < 10 || fixed.d50 > 200)) {
        fixed.d50 = Math.max(10, Math.min(200, fixed.d50));
      }

      // Clamp gamma50 to valid range
      if (fixed.gamma50 && (fixed.gamma50 < 0.5 || fixed.gamma50 > 10)) {
        fixed.gamma50 = Math.max(0.5, Math.min(10, fixed.gamma50));
      }

      // Check if parameters were modified
      const modified = JSON.stringify(fixed) !== JSON.stringify(params);

      if (modified) {
        return {
          errorId,
          recoveryMethod: "PARAMETER_CLAMPING",
          recovered: true,
          recoveredValue: fixed,
          fallbackUsed: false,
          recommendation:
            "Parameters were automatically adjusted to valid ranges",
        };
      }

      return {
        errorId,
        recoveryMethod: "CALCULATION_RECOVERY_FAILED",
        recovered: false,
        fallbackUsed: true,
        recommendation: "Unable to auto-recover calculation. Check input data.",
      };
    } catch (recoveryError) {
      return {
        errorId,
        recoveryMethod: "CALCULATION_RECOVERY_FAILED",
        recovered: false,
        fallbackUsed: true,
        recommendation: "Calculation error recovery failed. Please retry.",
      };
    }
  }

  /**
   * Attempt to recover from file parsing errors
   */
  static recoverParsingError(
    fileContent: string,
    error: Error
  ): ErrorRecovery {
    const errorId = `recovery_${Date.now()}`;

    try {
      // Try alternative parsing strategies
      const lines = fileContent.split("\n");

      // Strategy 1: Skip header rows
      let dataLines = lines.filter((line) => line.trim() && !line.startsWith("#"));

      // Strategy 2: Handle different delimiters
      let delimiter = ",";
      if (dataLines.some((line) => line.includes("\t"))) {
        delimiter = "\t";
      } else if (dataLines.some((line) => line.includes(";"))) {
        delimiter = ";";
      }

      // Strategy 3: Parse with flexible format
      const parsed = dataLines
        .map((line) => {
          const parts = line.split(delimiter).map((p) => p.trim());
          return {
            dose: parseFloat(parts[0]),
            volume: parseFloat(parts[1]),
          };
        })
        .filter((p) => !isNaN(p.dose) && !isNaN(p.volume));

      if (parsed.length > 0) {
        return {
          errorId,
          recoveryMethod: "FLEXIBLE_PARSING",
          recovered: true,
          recoveredValue: parsed,
          fallbackUsed: false,
          recommendation: "File was successfully parsed with flexible format",
        };
      }

      return {
        errorId,
        recoveryMethod: "PARSING_RECOVERY_FAILED",
        recovered: false,
        fallbackUsed: true,
        recommendation: "Unable to parse file. Check format and try again.",
      };
    } catch (recoveryError) {
      return {
        errorId,
        recoveryMethod: "PARSING_RECOVERY_FAILED",
        recovered: false,
        fallbackUsed: true,
        recommendation: "File parsing failed. Please verify file format.",
      };
    }
  }

  /**
   * Attempt to recover from network errors
   */
  static recoverNetworkError(
    retryCount: number = 0,
    maxRetries: number = 3
  ): ErrorRecovery {
    const errorId = `recovery_${Date.now()}`;

    if (retryCount < maxRetries) {
      // Exponential backoff
      const backoffMs = Math.pow(2, retryCount) * 1000;

      return {
        errorId,
        recoveryMethod: "EXPONENTIAL_BACKOFF_RETRY",
        recovered: false,
        fallbackUsed: false,
        recommendation: `Retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`,
      };
    }

    return {
      errorId,
      recoveryMethod: "NETWORK_RECOVERY_FAILED",
      recovered: false,
      fallbackUsed: true,
      recommendation: "Network error persists. Check connectivity and retry.",
    };
  }

  /**
   * Helper: Smooth DVH data
   */
  private static smoothDVH(
    dvhData: Array<{ dose: number; volume: number }>,
    windowSize: number = 3
  ): Array<{ dose: number; volume: number }> {
    if (dvhData.length < windowSize) return dvhData;

    const smoothed: Array<{ dose: number; volume: number }> = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < dvhData.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(dvhData.length, i + halfWindow + 1);
      const window = dvhData.slice(start, end);

      const avgVolume =
        window.reduce((sum, p) => sum + p.volume, 0) / window.length;
      smoothed.push({
        dose: dvhData[i].dose,
        volume: avgVolume,
      });
    }

    return smoothed;
  }
}

/**
 * Global Error Handler
 */
export class GlobalErrorHandler {
  private static errorLog: ErrorContext[] = [];
  private static maxLogSize = 1000;

  /**
   * Log and handle error
   */
  static handleError(error: Error, context?: Partial<ErrorContext>): void {
    const classification = ErrorClassifier.classifyError(error);

    const errorContext: ErrorContext = {
      errorId: `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: classification.severity,
      errorType: classification.type,
      message: error.message,
      stack: error.stack,
      ...context,
    };

    // Log error
    this.errorLog.push(errorContext);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[${errorContext.errorType}]`, errorContext);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToErrorTracking(errorContext);
    }
  }

  /**
   * Get error log
   */
  static getErrorLog(limit: number = 100): ErrorContext[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Send to error tracking service
   */
  private static sendToErrorTracking(errorContext: ErrorContext): void {
    // Placeholder for error tracking service integration
    // In production, send to Sentry, LogRocket, or similar
    console.error("Error tracking would be sent here:", errorContext);
  }
}

/**
 * Error Handler Schema
 */
export const ErrorContextSchema = z.object({
  errorId: z.string(),
  timestamp: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  errorType: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().optional(),
  calculationId: z.string().optional(),
});

export const ErrorRecoverySchema = z.object({
  errorId: z.string(),
  recoveryMethod: z.string(),
  recovered: z.boolean(),
  recoveredValue: z.unknown().optional(),
  fallbackUsed: z.boolean(),
  recommendation: z.string(),
});
