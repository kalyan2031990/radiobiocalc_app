/**
 * Patient Data Privacy & Security Service
 * 
 * HIPAA/GDPR compliant data handling, encryption, and anonymization
 * for protected health information (PHI) and personally identifiable information (PII)
 */

import { z } from "zod";
import crypto from "crypto";

export const EncryptionConfigSchema = z.object({
  algorithm: z.enum(["AES-256-GCM", "AES-256-CBC"]),
  keyDerivation: z.enum(["PBKDF2", "Argon2"]),
  saltLength: z.number().default(16),
  iterations: z.number().default(100000),
});

export const DataClassificationSchema = z.object({
  id: z.string(),
  dataType: z.enum([
    "PHI",
    "PII",
    "CLINICAL_DATA",
    "CALCULATION_RESULT",
    "METADATA",
  ]),
  sensitivityLevel: z.enum(["public", "internal", "confidential", "restricted"]),
  requiresEncryption: z.boolean(),
  requiresAnonymization: z.boolean(),
  retentionDays: z.number(),
  accessControl: z.array(z.string()), // User roles allowed
});

export const AnonymizationRuleSchema = z.object({
  id: z.string(),
  field: z.string(),
  method: z.enum([
    "remove",
    "hash",
    "generalize",
    "perturb",
    "aggregate",
  ]),
  parameters: z.record(z.string(), z.any()).optional(),
});

export const ConsentRecordSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  consentType: z.enum([
    "data_collection",
    "data_processing",
    "research_use",
    "publication",
    "third_party_sharing",
  ]),
  consentDate: z.string().datetime(),
  consentVersion: z.string(),
  consentText: z.string(),
  givenBy: z.string(), // Patient or authorized representative
  witnessed: z.boolean(),
  witnessName: z.string().optional(),
  revokedDate: z.string().datetime().optional(),
  revokedReason: z.string().optional(),
});

export const DataAccessLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userId: z.string(),
  userRole: z.string(),
  dataType: z.string(),
  patientId: z.string().optional(), // Anonymized
  action: z.enum(["read", "write", "delete", "export", "anonymize"]),
  purpose: z.string(),
  ipAddress: z.string().optional(),
  result: z.enum(["success", "denied", "failed"]),
  denyReason: z.string().optional(),
});

export type EncryptionConfig = z.infer<typeof EncryptionConfigSchema>;
export type DataClassification = z.infer<typeof DataClassificationSchema>;
export type AnonymizationRule = z.infer<typeof AnonymizationRuleSchema>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type DataAccessLog = z.infer<typeof DataAccessLogSchema>;

/**
 * Patient Data Privacy & Security Service
 */
export class PrivacySecurityService {
  private static encryptionKey: string = process.env.ENCRYPTION_KEY || "default-key";
  private static dataClassifications: Map<string, DataClassification> = new Map();
  private static anonymizationRules: Map<string, AnonymizationRule> = new Map();
  private static consentRecords: ConsentRecord[] = [];
  private static dataAccessLogs: DataAccessLog[] = [];
  private static encryptionConfig: EncryptionConfig = {
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2",
    saltLength: 16,
    iterations: 100000,
  };

  /**
   * Initialize encryption with key derivation
   */
  static initializeEncryption(masterKey: string): void {
    this.encryptionKey = masterKey;
  }

  /**
   * Encrypt sensitive data
   */
  static encryptData(plaintext: string, dataType: string): {
    ciphertext: string;
    iv: string;
    authTag: string;
    salt: string;
  } {
    const salt = crypto.randomBytes(this.encryptionConfig.saltLength);
    const iv = crypto.randomBytes(16);

    // Derive key from master key and salt
    const derivedKey = crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      this.encryptionConfig.iterations,
      32,
      "sha256"
    );

    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      derivedKey,
      iv
    );

    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      salt: salt.toString("hex"),
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decryptData(
    encrypted: {
      ciphertext: string;
      iv: string;
      authTag: string;
      salt: string;
    },
    dataType: string
  ): string {
    const salt = Buffer.from(encrypted.salt, "hex");
    const iv = Buffer.from(encrypted.iv, "hex");
    const authTag = Buffer.from(encrypted.authTag, "hex");

    // Derive key using same salt
    const derivedKey = crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      this.encryptionConfig.iterations,
      32,
      "sha256"
    );

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      derivedKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(encrypted.ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hashData(data: string, salt?: string): string {
    const hashSalt = salt || crypto.randomBytes(16).toString("hex");
    return crypto
      .pbkdf2Sync(data, hashSalt, 100000, 64, "sha256")
      .toString("hex");
  }

  /**
   * Anonymize patient data
   */
  static anonymizePatientData(
    patientData: any,
    rules: AnonymizationRule[]
  ): any {
    const anonymized = { ...patientData };

    for (const rule of rules) {
      if (anonymized[rule.field]) {
        switch (rule.method) {
          case "remove":
            delete anonymized[rule.field];
            break;
          case "hash":
            anonymized[rule.field] = this.hashData(
              String(anonymized[rule.field])
            );
            break;
          case "generalize":
            // Generalize to broader category
            if (rule.parameters?.categories) {
              const value = anonymized[rule.field];
              const category = rule.parameters.categories.find(
                (c: any) => c.min <= value && value <= c.max
              );
              anonymized[rule.field] = category?.label || "Unknown";
            }
            break;
          case "perturb":
            // Add noise to numerical data
            if (typeof anonymized[rule.field] === "number") {
              const noise =
                (Math.random() - 0.5) * (rule.parameters?.noiseFactor || 0.1);
              anonymized[rule.field] = anonymized[rule.field] * (1 + noise);
            }
            break;
          case "aggregate":
            // Aggregate to group level
            anonymized[rule.field] = rule.parameters?.groupLabel || "Aggregated";
            break;
        }
      }
    }

    return anonymized;
  }

  /**
   * Register data classification
   */
  static registerDataClassification(
    classification: DataClassification
  ): void {
    this.dataClassifications.set(classification.id, classification);
  }

  /**
   * Register anonymization rule
   */
  static registerAnonymizationRule(rule: AnonymizationRule): void {
    this.anonymizationRules.set(rule.id, rule);
  }

  /**
   * Record consent
   */
  static async recordConsent(
    patientId: string,
    consentType: string,
    consentText: string,
    givenBy: string,
    witnessed: boolean = false,
    witnessName?: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: Math.random().toString(36).substring(2, 11),
      patientId,
      consentType: consentType as any,
      consentDate: new Date().toISOString(),
      consentVersion: "1.0",
      consentText,
      givenBy,
      witnessed,
      witnessName,
    };

    this.consentRecords.push(consent);
    return consent;
  }

  /**
   * Revoke consent
   */
  static async revokeConsent(
    consentId: string,
    reason: string
  ): Promise<boolean> {
    const consent = this.consentRecords.find((c) => c.id === consentId);

    if (consent) {
      consent.revokedDate = new Date().toISOString();
      consent.revokedReason = reason;
      return true;
    }

    return false;
  }

  /**
   * Check if consent is valid
   */
  static isConsentValid(
    patientId: string,
    consentType: string
  ): boolean {
    const consent = this.consentRecords.find(
      (c) =>
        c.patientId === patientId &&
        c.consentType === consentType &&
        !c.revokedDate
    );

    return !!consent;
  }

  /**
   * Log data access
   */
  static async logDataAccess(
    userId: string,
    userRole: string,
    dataType: string,
    action: string,
    purpose: string,
    ipAddress?: string,
    result: "success" | "denied" | "failed" = "success",
    denyReason?: string,
    patientId?: string
  ): Promise<DataAccessLog> {
    const log: DataAccessLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      dataType,
      patientId: patientId ? this.hashData(patientId) : undefined,
      action: action as any,
      purpose,
      ipAddress,
      result,
      denyReason,
    };

    this.dataAccessLogs.push(log);

    // Keep only last 100000 logs
    if (this.dataAccessLogs.length > 100000) {
      this.dataAccessLogs = this.dataAccessLogs.slice(-100000);
    }

    return log;
  }

  /**
   * Get data access logs
   */
  static getDataAccessLogs(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): DataAccessLog[] {
    let logs = this.dataAccessLogs;

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter((log) => new Date(log.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter((log) => new Date(log.timestamp) <= end);
    }

    return logs.reverse();
  }

  /**
   * Generate privacy impact assessment
   */
  static generatePrivacyImpactAssessment(): {
    totalDataTypes: number;
    encryptedDataTypes: number;
    anonymizedDataTypes: number;
    consentRecords: number;
    accessLogs: number;
    deniedAccess: number;
    complianceScore: number;
  } {
    const totalDataTypes = this.dataClassifications.size;
    const encryptedDataTypes = Array.from(
      this.dataClassifications.values()
    ).filter((d) => d.requiresEncryption).length;
    const anonymizedDataTypes = Array.from(
      this.dataClassifications.values()
    ).filter((d) => d.requiresAnonymization).length;
    const consentRecords = this.consentRecords.filter(
      (c) => !c.revokedDate
    ).length;
    const accessLogs = this.dataAccessLogs.length;
    const deniedAccess = this.dataAccessLogs.filter(
      (log) => log.result === "denied"
    ).length;

    // Calculate compliance score (0-100)
    const encryptionScore = totalDataTypes > 0 ? (encryptedDataTypes / totalDataTypes) * 30 : 0;
    const consentScore = consentRecords > 0 ? 30 : 0;
    const accessControlScore = deniedAccess > 0 ? 20 : 0;
    const loggingScore = accessLogs > 0 ? 20 : 0;

    const complianceScore = Math.min(
      100,
      encryptionScore + consentScore + accessControlScore + loggingScore
    );

    return {
      totalDataTypes,
      encryptedDataTypes,
      anonymizedDataTypes,
      consentRecords,
      accessLogs,
      deniedAccess,
      complianceScore,
    };
  }

  /**
   * Export data for GDPR right to be forgotten
   */
  static async deletePatientData(patientId: string): Promise<{
    recordsDeleted: number;
    timestamp: string;
  }> {
    const hashedPatientId = this.hashData(patientId);

    // Remove consent records
    const consentCount = this.consentRecords.filter(
      (c) => c.patientId === patientId
    ).length;
    this.consentRecords = this.consentRecords.filter(
      (c) => c.patientId !== patientId
    );

    // Remove access logs
    const logCount = this.dataAccessLogs.filter(
      (log) => log.patientId === hashedPatientId
    ).length;
    this.dataAccessLogs = this.dataAccessLogs.filter(
      (log) => log.patientId !== hashedPatientId
    );

    return {
      recordsDeleted: consentCount + logCount,
      timestamp: new Date().toISOString(),
    };
  }
}
