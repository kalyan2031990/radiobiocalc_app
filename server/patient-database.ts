/**
 * Patient Database Service
 * 
 * Manages local storage of patient cases, calculations, and reports
 * Uses SQLite for persistent storage
 */

import { z } from "zod";

export const PatientCaseSchema = z.object({
  id: z.string().uuid(),
  patientName: z.string(),
  patientID: z.string(),
  studyDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  diagnosis: z.string().optional(),
  site: z.string().optional(),
  notes: z.string().optional(),
});

export const CalculationRecordSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  structureName: z.string(),
  structureType: z.enum(["target", "oar"]),
  model: z.enum(["lkb-loglogit", "lkb-probit", "poisson"]),
  tcp: z.number().optional(),
  ntcp: z.number().optional(),
  bed: z.number(),
  eqd2: z.number(),
  meanDose: z.number(),
  maxDose: z.number(),
  minDose: z.number(),
  volume: z.number(),
  fractionation: z.object({
    totalDose: z.number(),
    numFractions: z.number(),
    dosePerFraction: z.number(),
  }),
  createdAt: z.string().datetime(),
});

export const ReportRecordSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  format: z.enum(["pdf", "html", "csv", "json"]),
  fileName: z.string(),
  fileSize: z.number(),
  uri: z.string(),
  createdAt: z.string().datetime(),
});

export type PatientCase = z.infer<typeof PatientCaseSchema>;
export type CalculationRecord = z.infer<typeof CalculationRecordSchema>;
export type ReportRecord = z.infer<typeof ReportRecordSchema>;

/**
 * Patient Database Service
 * 
 * In production, this would connect to SQLite via Drizzle ORM
 * For now, it provides the interface and mock implementations
 */
export class PatientDatabaseService {
  /**
   * Create a new patient case
   */
  static async createCase(data: Omit<PatientCase, "id" | "createdAt" | "updatedAt">): Promise<PatientCase> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const caseData: PatientCase = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // In production: await db.insert(patientCases).values(caseData);
    return caseData;
  }

  /**
   * Get all patient cases
   */
  static async getAllCases(): Promise<PatientCase[]> {
    // In production: return await db.query.patientCases.findMany();
    return [];
  }

  /**
   * Get a specific patient case
   */
  static async getCase(caseId: string): Promise<PatientCase | null> {
    // In production: return await db.query.patientCases.findFirst({ where: eq(patientCases.id, caseId) });
    return null;
  }

  /**
   * Update a patient case
   */
  static async updateCase(caseId: string, data: Partial<Omit<PatientCase, "id" | "createdAt">>): Promise<PatientCase | null> {
    const now = new Date().toISOString();
    // In production: return await db.update(patientCases).set({ ...data, updatedAt: now }).where(eq(patientCases.id, caseId));
    return null;
  }

  /**
   * Delete a patient case
   */
  static async deleteCase(caseId: string): Promise<boolean> {
    // In production: await db.delete(patientCases).where(eq(patientCases.id, caseId));
    return true;
  }

  /**
   * Save a calculation record
   */
  static async saveCalculation(data: Omit<CalculationRecord, "id" | "createdAt">): Promise<CalculationRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: CalculationRecord = {
      id,
      ...data,
      createdAt: now,
    };

    // In production: await db.insert(calculations).values(record);
    return record;
  }

  /**
   * Get calculations for a case
   */
  static async getCalculations(caseId: string): Promise<CalculationRecord[]> {
    // In production: return await db.query.calculations.findMany({ where: eq(calculations.caseId, caseId) });
    return [];
  }

  /**
   * Save a report record
   */
  static async saveReport(data: Omit<ReportRecord, "id" | "createdAt">): Promise<ReportRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: ReportRecord = {
      id,
      ...data,
      createdAt: now,
    };

    // In production: await db.insert(reports).values(record);
    return record;
  }

  /**
   * Get reports for a case
   */
  static async getReports(caseId: string): Promise<ReportRecord[]> {
    // In production: return await db.query.reports.findMany({ where: eq(reports.caseId, caseId) });
    return [];
  }

  /**
   * Search cases by patient name or ID
   */
  static async searchCases(query: string): Promise<PatientCase[]> {
    // In production: return await db.query.patientCases.findMany({
    //   where: or(
    //     like(patientCases.patientName, `%${query}%`),
    //     like(patientCases.patientID, `%${query}%`)
    //   )
    // });
    return [];
  }

  /**
   * Get statistics for a case
   */
  static async getCaseStatistics(caseId: string): Promise<{
    totalCalculations: number;
    totalReports: number;
    lastUpdated: string;
    structures: string[];
  }> {
    const calculations = await this.getCalculations(caseId);
    const reports = await this.getReports(caseId);

    return {
      totalCalculations: calculations.length,
      totalReports: reports.length,
      lastUpdated: new Date().toISOString(),
      structures: [...new Set(calculations.map((c) => c.structureName))],
    };
  }
}
