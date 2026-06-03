/**
 * Institutional Audit Trail Service
 * 
 * Comprehensive logging for regulatory compliance and quality assurance
 * in radiation oncology departments
 */

import { z } from "zod";

export const AuditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.enum(["physicist", "oncologist", "dosimetrist", "admin"]),
  userDepartment: z.string(),
  action: z.enum([
    "case_created",
    "case_modified",
    "case_deleted",
    "calculation_performed",
    "report_generated",
    "report_exported",
    "case_reviewed",
    "case_approved",
    "case_rejected",
    "user_login",
    "user_logout",
    "settings_changed",
    "data_accessed",
  ]),
  caseId: z.string().optional(),
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  details: z.record(z.string(), z.any()),
  ipAddress: z.string().optional(),
  deviceInfo: z.string().optional(),
  status: z.enum(["success", "failure", "warning"]),
  errorMessage: z.string().optional(),
  changedFields: z.array(z.string()).optional(),
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
});

export const ComplianceCheckSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  checkType: z.enum([
    "dose_limit_exceeded",
    "tcp_below_threshold",
    "ntcp_above_threshold",
    "fractionation_mismatch",
    "organ_constraint_violated",
  ]),
  severity: z.enum(["info", "warning", "critical"]),
  caseId: z.string(),
  details: z.record(z.string(), z.any()),
  resolved: z.boolean().default(false),
  resolvedBy: z.string().optional(),
  resolutionTime: z.string().datetime().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

/**
 * Institutional Audit Trail Service
 */
export class AuditTrailService {
  private static auditLogs: AuditLog[] = [];
  private static complianceChecks: ComplianceCheck[] = [];
  private static sessionTokens: Map<string, { userId: string; expiry: number }> =
    new Map();

  /**
   * Authenticate user and create session
   */
  static async authenticateUser(
    userId: string,
    userName: string,
    userRole: string,
    userDepartment: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<{ token: string; expiresIn: number }> {
    const token = Math.random().toString(36).substring(2, 15);
    const expiresIn = 24 * 60 * 60 * 1000; // 24 hours
    const expiry = Date.now() + expiresIn;

    this.sessionTokens.set(token, { userId, expiry });

    // Log authentication
    await this.logAction(
      userId,
      userName,
      userRole,
      userDepartment,
      "user_login",
      {
        success: true,
      },
      ipAddress,
      deviceInfo,
      "success"
    );

    return { token, expiresIn };
  }

  /**
   * Verify session token
   */
  static verifyToken(token: string): { userId: string } | null {
    const session = this.sessionTokens.get(token);

    if (!session) return null;

    if (session.expiry < Date.now()) {
      this.sessionTokens.delete(token);
      return null;
    }

    return { userId: session.userId };
  }

  /**
   * Logout user
   */
  static async logoutUser(
    userId: string,
    userName: string,
    userRole: string,
    userDepartment: string,
    token: string
  ): Promise<boolean> {
    const session = this.sessionTokens.get(token);

    if (session && session.userId === userId) {
      this.sessionTokens.delete(token);

      await this.logAction(
        userId,
        userName,
        userRole,
        userDepartment,
        "user_logout",
        { success: true },
        undefined,
        undefined,
        "success"
      );

      return true;
    }

    return false;
  }

  /**
   * Log action for audit trail
   */
  static async logAction(
    userId: string,
    userName: string,
    userRole: string,
    userDepartment: string,
    action: string,
    details: any,
    ipAddress?: string,
    deviceInfo?: string,
    status: "success" | "failure" | "warning" = "success",
    errorMessage?: string,
    caseId?: string,
    patientId?: string,
    patientName?: string,
    changedFields?: string[],
    oldValues?: any,
    newValues?: any
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole: userRole as any,
      userDepartment,
      action: action as any,
      caseId,
      patientId,
      patientName,
      details,
      ipAddress,
      deviceInfo,
      status,
      errorMessage,
      changedFields,
      oldValues,
      newValues,
    };

    this.auditLogs.push(log);

    // Keep only last 10000 logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    return log;
  }

  /**
   * Log compliance check
   */
  static async logComplianceCheck(
    checkType: string,
    severity: "info" | "warning" | "critical",
    caseId: string,
    details: any
  ): Promise<ComplianceCheck> {
    const check: ComplianceCheck = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      checkType: checkType as any,
      severity,
      caseId,
      details,
      resolved: false,
    };

    this.complianceChecks.push(check);

    return check;
  }

  /**
   * Resolve compliance check
   */
  static async resolveComplianceCheck(
    checkId: string,
    resolvedBy: string
  ): Promise<boolean> {
    const check = this.complianceChecks.find((c) => c.id === checkId);

    if (check) {
      check.resolved = true;
      check.resolvedBy = resolvedBy;
      check.resolutionTime = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * Get audit logs for a user
   */
  static getUserAuditLogs(
    userId: string,
    limit: number = 100
  ): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs for a case
   */
  static getCaseAuditLogs(
    caseId: string,
    limit: number = 100
  ): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.caseId === caseId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs for a patient
   */
  static getPatientAuditLogs(
    patientId: string,
    limit: number = 100
  ): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.patientId === patientId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit logs by action type
   */
  static getAuditLogsByAction(
    action: string,
    limit: number = 100,
    startDate?: string,
    endDate?: string
  ): AuditLog[] {
    let logs = this.auditLogs.filter((log) => log.action === action);

    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter((log) => new Date(log.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter((log) => new Date(log.timestamp) <= end);
    }

    return logs.slice(-limit).reverse();
  }

  /**
   * Get unresolved compliance checks
   */
  static getUnresolvedComplianceChecks(caseId?: string): ComplianceCheck[] {
    let checks = this.complianceChecks.filter((c) => !c.resolved);

    if (caseId) {
      checks = checks.filter((c) => c.caseId === caseId);
    }

    return checks;
  }

  /**
   * Get compliance check summary
   */
  static getComplianceSummary(startDate?: string, endDate?: string): {
    totalChecks: number;
    resolvedChecks: number;
    unresolvedChecks: number;
    criticalIssues: number;
    warningIssues: number;
  } {
    let checks = this.complianceChecks;

    if (startDate) {
      const start = new Date(startDate);
      checks = checks.filter((c) => new Date(c.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      checks = checks.filter((c) => new Date(c.timestamp) <= end);
    }

    const resolved = checks.filter((c) => c.resolved).length;
    const unresolved = checks.filter((c) => !c.resolved).length;
    const critical = checks.filter((c) => c.severity === "critical").length;
    const warning = checks.filter((c) => c.severity === "warning").length;

    return {
      totalChecks: checks.length,
      resolvedChecks: resolved,
      unresolvedChecks: unresolved,
      criticalIssues: critical,
      warningIssues: warning,
    };
  }

  /**
   * Generate audit report
   */
  static generateAuditReport(
    startDate: string,
    endDate: string,
    userId?: string,
    action?: string
  ): {
    reportDate: string;
    period: { start: string; end: string };
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
    failedAttempts: number;
    logs: AuditLog[];
  } {
    let logs = this.auditLogs.filter(
      (log) =>
        new Date(log.timestamp) >= new Date(startDate) &&
        new Date(log.timestamp) <= new Date(endDate)
    );

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    if (action) {
      logs = logs.filter((log) => log.action === action);
    }

    const eventsByAction: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    let failedAttempts = 0;

    logs.forEach((log) => {
      eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
      eventsByUser[log.userName] = (eventsByUser[log.userName] || 0) + 1;

      if (log.status === "failure") {
        failedAttempts++;
      }
    });

    return {
      reportDate: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      totalEvents: logs.length,
      eventsByAction,
      eventsByUser,
      failedAttempts,
      logs: logs.reverse(),
    };
  }
}
