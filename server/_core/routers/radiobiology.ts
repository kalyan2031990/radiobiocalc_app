/**
 * Radiobiology Calculation API Router
 * 
 * Exposes radiobiology calculations via tRPC endpoints
 * Handles DVH input, parameter lookup, and result generation
 */

import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import {
  performCalculation,
  type CalculationRequest,
  type CalculationResult,
  calculateDoseMetrics,
  calculateBED,
  calculateEQD2,
  calculateGEUD,
} from "../../radiobiology";
import {
  getOrganParameters,
  getAvailableOrgans,
  getOrgansByCategory,
  getAllCategories,
  getOrganClassification,
  getDefaultAlphaBeta,
  MODEL_LABELS,
} from "../../parameters";
import { CANCER_SITES, organsForSite, getSiteById } from "../../sites-registry";
import { TREATMENT_TECHNIQUES } from "../../techniques";
import {
  getClinicalFieldsForContext,
  groupClinicalFields,
  SECTION_LABELS,
} from "../../../lib/clinical-fields-schema";
import {
  parseCSVDVH,
  validateDVH,
  smoothDVH,
  resampleDVH,
  convertToEQD2DVH,
  exportDVHToCSV,
  exportDVHToJSON,
  type DVHData,
  mergeDvhData,
} from "../../data-handler";
import { evaluateCompositePlan } from "../../composite-plan-evaluation";
import { loadKastooriDemoPlan } from "../../demo-kastoori";
import {
  getProvenanceFor,
  getReferenceLibrary,
} from "../../literature-references";
import { buildAnalysisReport } from "../../analysis-report";
import { BenchmarkComparator } from "../../benchmark-comparison";
import { benchmarkOrganKey } from "../../../lib/benchmark-organ-map";

const DVH_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const dvhSessionStore = new Map<
  string,
  { data: DVHData; expiresAt: number }
>();

function storeDvhSession(data: DVHData): string {
  const id = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  dvhSessionStore.set(id, {
    data,
    expiresAt: Date.now() + DVH_SESSION_TTL_MS,
  });
  if (dvhSessionStore.size > 200) {
    const now = Date.now();
    for (const [key, val] of dvhSessionStore) {
      if (val.expiresAt < now) dvhSessionStore.delete(key);
    }
  }
  return id;
}

function getDvhSessionData(sessionId: string): DVHData | null {
  const row = dvhSessionStore.get(sessionId);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    dvhSessionStore.delete(sessionId);
    return null;
  }
  return row.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas for Input Validation
// ─────────────────────────────────────────────────────────────────────────────

const DVHPointSchema = z.object({
  dose: z.number().min(0),
  volume: z.number().min(0),
});

const CalculationRequestSchema = z.object({
  dvh: z.array(DVHPointSchema),
  totalDose: z.number().min(0.1),
  numFractions: z.number().int().min(1),
  organ: z.string(),
  structureType: z.enum(["target", "oar"]),
  model: z.enum([
    "lkb_loglogit",
    "lkb_probit",
    "poisson",
    "zaider_minerbo",
    "poisson_dvh",
  ]),
  cancerSite: z.string().optional(),
  technique: z.string().optional(),
  targetType: z.string().optional(),
  lqMaxDosePerFractionGy: z.number().optional(),
  parameters: z
    .object({
      td50: z.number().optional(),
      gamma50: z.number().optional(),
      m: z.number().optional(),
      n: z.number().optional(),
      alphaBeta: z.number().optional(),
      d50: z.number().optional(),
      gamma: z.number().optional(),
      s: z.number().optional(),
    })
    .optional(),
  geudExponent: z.number().min(-20).max(20).optional(),
});

const CSVUploadSchema = z.object({
  content: z.string(),
  fileName: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Router Definition
// ─────────────────────────────────────────────────────────────────────────────

export const radiobiologyRouter = router({
  /**
   * Calculate TCP/NTCP for a given DVH and parameters
   */
  calculate: publicProcedure
    .input(CalculationRequestSchema)
    .mutation(({ input }) => {
      try {
        // Validate DVH
        validateDVH(input.dvh);

        // Get default parameters for organ
        const defaultParams = getOrganParameters(input.organ, input.model);

        if (!defaultParams) {
          throw new Error(
            `No parameters found for organ: ${input.organ} with model: ${input.model}`
          );
        }

        // Perform calculation
        const result = performCalculation(
          input as CalculationRequest,
          defaultParams
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate multiple organs/models for comparison
   */
  calculateMultiple: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        organs: z.array(z.string()),
        models: z.array(z.enum(["lkb_loglogit", "lkb_probit", "poisson"])),
        structureType: z.enum(["target", "oar"]),
      })
    )
    .mutation(({ input }) => {
      try {
        validateDVH(input.dvh);

        const results: Record<string, Record<string, CalculationResult>> = {};

        for (const organ of input.organs) {
          results[organ] = {};

          for (const model of input.models) {
            const defaultParams = getOrganParameters(organ, model);

            if (defaultParams) {
              const result = performCalculation(
                {
                  dvh: input.dvh,
                  totalDose: input.totalDose,
                  numFractions: input.numFractions,
                  organ,
                  structureType: input.structureType,
                  model: model as any,
                } as CalculationRequest,
                defaultParams
              );

              results[organ][model] = result;
            }
          }
        }

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Parse CSV DVH file
   */
  parseCSV: publicProcedure
    .input(CSVUploadSchema)
    .mutation(({ input }) => {
      try {
        const dvhData = parseCSVDVH(input.content, input.fileName);
        const sessionId = storeDvhSession(dvhData);

        return {
          success: true,
          data: dvhData,
          sessionId,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  getDvhSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const data = getDvhSessionData(input.sessionId);
      if (!data) {
        return { success: false as const, error: "DVH session expired or not found" };
      }
      return { success: true as const, data };
    }),

  /** Dev/demo: HN composite DVH from RBGYANX_TEST_DATA (see loadKastooriDemoPlan). */
  getDemoKastooriPlan: publicProcedure.query(() => {
    try {
      const demo = loadKastooriDemoPlan();
      const serverDvhSessionId = storeDvhSession(demo.bundle);
      const hasTarget = demo.structureNames.some((n) =>
        /ptv|gtv|ctv/i.test(n),
      );
      const hasOar = demo.structureNames.length > 1 || /parot|prtd|combo/i.test(
        demo.oarStructure ?? "",
      );
      return {
        success: true as const,
        data: {
          serverDvhSessionId,
          fileName: demo.fileName,
          primaryTarget: demo.primaryTarget,
          oarStructure: demo.oarStructure,
          structureNames: demo.structureNames,
          composite: demo.composite,
          planScope: (demo.structureNames.length > 1
            ? "multi_structure"
            : "single_structure") as "multi_structure" | "single_structure",
          therapeuticWindowEligible:
            demo.structureNames.length > 1 && hasTarget && hasOar,
        },
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Demo plan unavailable",
      };
    }
  }),

  /**
   * Composite plan: TCP (target) + NTCP (OARs) + CI/HI/GI + UTCP/P+/TWI (Lee/Patel/rbGyanX).
   */
  mergeDvhSessions: publicProcedure
    .input(z.object({ sessionIds: z.array(z.string()).min(1) }))
    .mutation(({ input }) => {
      try {
        const parts: DVHData[] = [];
        for (const id of input.sessionIds) {
          const row = getDvhSessionData(id);
          if (row) parts.push(row);
        }
        if (parts.length === 0) {
          return {
            success: false as const,
            error: "No valid DVH sessions to merge",
          };
        }
        const merged = mergeDvhData(parts);
        const sessionId = storeDvhSession(merged);
        return { success: true as const, data: merged, sessionId };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  evaluateCompositePlan: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        cancerSite: z.string().optional(),
        technique: z.string().optional(),
        prescriptionGy: z.number().min(0.1).optional(),
        tcpModel: z
          .enum([
            "lkb_loglogit",
            "lkb_probit",
            "poisson",
            "zaider_minerbo",
            "poisson_dvh",
          ])
          .optional(),
        ntcpModel: z
          .enum([
            "lkb_loglogit",
            "lkb_probit",
            "poisson",
            "zaider_minerbo",
            "poisson_dvh",
          ])
          .optional(),
      }),
    )
    .mutation(({ input }) => {
      try {
        const data = getDvhSessionData(input.sessionId);
        if (!data) {
          return {
            success: false as const,
            error: "DVH session expired or not found",
          };
        }
        const evaluation = evaluateCompositePlan(data, {
          totalDose: input.totalDose,
          numFractions: input.numFractions,
          cancerSite: input.cancerSite,
          technique: input.technique,
          prescriptionGy: input.prescriptionGy ?? input.totalDose,
          fileHint: data.patientInfo?.patientName,
          tcpModel: input.tcpModel,
          ntcpModel: input.ntcpModel,
        });
        return { success: true as const, data: evaluation };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate dose metrics for a DVH
   */
  calculateDoseMetrics: publicProcedure
    .input(z.array(DVHPointSchema))
    .query(({ input }) => {
      try {
        validateDVH(input);
        const metrics = calculateDoseMetrics(input);

        return {
          success: true,
          data: metrics,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate BED and EQD2
   */
  calculateBED_EQD2: publicProcedure
    .input(
      z.object({
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        alphaBeta: z.number().min(0.1),
      })
    )
    .query(({ input }) => {
      try {
        const bed = calculateBED(
          input.totalDose,
          input.numFractions,
          input.alphaBeta
        );
        const eqd2 = calculateEQD2(
          input.totalDose,
          input.numFractions,
          input.alphaBeta
        );

        return {
          success: true,
          data: { bed, eqd2 },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Get available organs
   */
  getOrgans: publicProcedure.query(() => {
    try {
      const organs = getAvailableOrgans();

      return {
        success: true,
        data: organs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  getSites: publicProcedure.query(() => ({
    success: true,
    data: CANCER_SITES,
  })),

  getTechniques: publicProcedure.query(() => ({
    success: true,
    data: TREATMENT_TECHNIQUES,
  })),

  getModels: publicProcedure
    .input(z.object({ structureType: z.enum(["target", "oar"]) }))
    .query(({ input }) => {
      const targetModels = [
        "lkb_loglogit",
        "zaider_minerbo",
        "poisson_dvh",
        "poisson",
      ] as const;
      const oarModels = ["lkb_loglogit", "lkb_probit", "poisson"] as const;
      const ids = input.structureType === "target" ? targetModels : oarModels;
      return {
        success: true,
        data: ids.map((id) => ({ id, label: MODEL_LABELS[id] })),
      };
    }),

  getSiteOrgans: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        role: z.enum(["target", "oar", "all"]).default("all"),
      })
    )
    .query(({ input }) => {
      const site = getSiteById(input.siteId);
      if (!site) {
        return { success: false, error: `Unknown site: ${input.siteId}` };
      }
      return {
        success: true,
        data: organsForSite(site.id, input.role),
      };
    }),

  getClinicalFields: publicProcedure
    .input(
      z.object({
        siteId: z.string(),
        role: z.enum(["target", "oar"]),
        organ: z.string(),
      })
    )
    .query(({ input }) => {
      const fields = getClinicalFieldsForContext(
        input.siteId,
        input.role,
        input.organ
      );
      return {
        success: true,
        data: {
          fields,
          grouped: groupClinicalFields(fields),
          sectionLabels: SECTION_LABELS,
        },
      };
    }),

  /**
   * Get organs by category
   */
  getOrgansByCategory: publicProcedure
    .input(z.string())
    .query(({ input }) => {
      try {
        const organs = getOrgansByCategory(input);

        return {
          success: true,
          data: organs,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Get all categories
   */
  getCategories: publicProcedure.query(() => {
    try {
      const categories = getAllCategories();

      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Get organ classification info
   */
  getOrganInfo: publicProcedure.input(z.string()).query(({ input }) => {
    try {
      const classification = getOrganClassification(input);
      const parameters = getOrganParameters(input);
      const defaultAlphaBeta = getDefaultAlphaBeta(input);

      return {
        success: true,
        data: {
          classification,
          parameters,
          defaultAlphaBeta,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Get organ parameters for specific model
   */
  getParameters: publicProcedure
    .input(
      z.object({
        organ: z.string(),
        model: z.enum([
          "lkb_loglogit",
          "lkb_probit",
          "poisson",
          "zaider_minerbo",
          "poisson_dvh",
        ]),
      })
    )
    .query(({ input }) => {
      try {
        const parameters = getOrganParameters(input.organ, input.model);

        if (!parameters) {
          throw new Error(
            `No parameters found for ${input.organ} with model ${input.model}`
          );
        }

        return {
          success: true,
          data: parameters,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Descriptive DVH statistics for single-plan QA (not cohort analysis).
   */
  planDescriptiveStats: publicProcedure
    .input(z.object({ dvh: z.array(DVHPointSchema) }))
    .query(({ input }) => {
      try {
        validateDVH(input.dvh);
        const sorted = [...input.dvh].sort((a, b) => a.dose - b.dose);
        const doses = sorted.map((p) => p.dose);
        const volMax = Math.max(...sorted.map((p) => p.volume), 1);
        const relV = sorted.map((p) => p.volume / volMax);
        const mean = relV.reduce((s, v, i) => s + v * doses[i], 0);
        const variance =
          relV.reduce((s, v, i) => s + v * Math.pow(doses[i] - mean, 2), 0) /
          Math.max(relV.reduce((a, b) => a + b, 0), 1e-9);
        const std = Math.sqrt(variance);
        const mid = Math.floor(doses.length / 2);
        const median =
          doses.length % 2 === 0
            ? (doses[mid - 1] + doses[mid]) / 2
            : doses[mid];
        const cv = mean > 0 ? std / mean : 0;
        let interpretation = "Uniform dose distribution (low heterogeneity)";
        if (cv > 0.35) {
          interpretation =
            "High dose heterogeneity — review hot/cold spots for plan QA";
        } else if (cv > 0.2) {
          interpretation =
            "Moderate heterogeneity — typical for complex OAR DVHs";
        }
        return {
          success: true,
          data: {
            nPoints: input.dvh.length,
            doseMeanGy: mean,
            doseStdGy: std,
            doseMedianGy: median,
            doseMinGy: Math.min(...doses),
            doseMaxGy: Math.max(...doses),
            volumeTotalCc: volMax,
            doseCoeffVar: cv,
            interpretation,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Smooth DVH data
   */
  smoothDVH: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        windowSize: z.number().int().min(1).default(3),
      })
    )
    .mutation(({ input }) => {
      try {
        const smoothed = smoothDVH(input.dvh, input.windowSize);

        return {
          success: true,
          data: smoothed,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Resample DVH to specified number of points
   */
  resampleDVH: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        numPoints: z.number().int().min(10).default(1000),
      })
    )
    .mutation(({ input }) => {
      try {
        const resampled = resampleDVH(input.dvh, input.numPoints);

        return {
          success: true,
          data: resampled,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Convert DVH to EQD2
   */
  convertToEQD2: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        alphaBeta: z.number().min(0.1),
      })
    )
    .mutation(({ input }) => {
      try {
        const eqd2DVH = convertToEQD2DVH(
          input.dvh,
          input.totalDose,
          input.numFractions,
          input.alphaBeta
        );

        return {
          success: true,
          data: eqd2DVH,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Export DVH to CSV
   */
  exportCSV: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        structureName: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const csv = exportDVHToCSV(input.dvh, input.structureName);

        return {
          success: true,
          data: csv,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Export DVH to JSON
   */
  exportJSON: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        patientInfo: z.object({
          patientId: z.string(),
          patientName: z.string(),
        }),
        structureName: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const json = exportDVHToJSON({
          patientInfo: {
            ...input.patientInfo,
            modality: "DVH",
          },
          structures: [
            {
              name: input.structureName,
              type: "oar",
            },
          ],
          dvhByStructure: {
            [input.structureName]: input.dvh,
          },
          isDifferential: false,
          doseUnit: "Gy",
          volumeUnit: "cm3",
        } as DVHData);

        return {
          success: true,
          data: json,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // Novel Equations Endpoints
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convert physical DVH to Fractionation-Aware DVH (FDVH)
   * 
   * Creates BED-DVH for SBRT, SRS, and hypofractionated treatments
   */
  convertToFDVH: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        alphaBeta: z.number().min(0.1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { convertToFDVH, isFDVHNeeded } = await import("../../utils/novel-equations");
        
        // Check if FDVH is needed
        const needed = isFDVHNeeded(input.numFractions, input.totalDose);
        
        if (!needed) {
          return {
            success: true,
            data: {
              fdvh: input.dvh,
              isConverted: false,
              message: "FDVH conversion not needed for conventional fractionation",
            },
          };
        }
        
        // Convert to FDVH
        const fdvh = convertToFDVH(
          {
            type: "cDVH",
            points: input.dvh,
          },
          {
            totalDose: input.totalDose,
            fractions: input.numFractions,
            alphaBeta: input.alphaBeta,
          }
        );
        
        return {
          success: true,
          data: {
            fdvh: fdvh.points,
            isConverted: true,
            message: "DVH converted to biological dose (FDVH)",
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate Uncertainty-Aware TCP (uTCP)
   * 
   * Returns TCP with confidence intervals using Monte Carlo simulation
   */
  calculateUncertainTCP: publicProcedure
    .input(
      z.object({
        dvh: z.array(DVHPointSchema),
        totalDose: z.number().min(0.1),
        numFractions: z.number().int().min(1),
        organ: z.string(),
        model: z.enum(["poisson", "lkb"]),
        parameterUncertainties: z.record(
          z.string(),
          z.object({
            mean: z.number(),
            std: z.number(),
            distribution: z.enum(["normal", "lognormal", "uniform"]),
          })
        ),
        iterations: z.number().int().min(100).max(10000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { calculateUncertainTCP } = await import("../../utils/novel-equations");
        
        // Get default parameters
        const modelMapping: Record<string, string> = {
          poisson: 'poisson',
          lkb: 'lkb_loglogit',
        };
        const defaultParams = getOrganParameters(input.organ, modelMapping[input.model]);
        
        if (!defaultParams) {
          throw new Error(`No parameters found for organ: ${input.organ}`);
        }
        
        // Create TCP calculation function
        const tcpFunction = (params: any) => {
          const result = performCalculation(
            {
              dvh: input.dvh,
              totalDose: input.totalDose,
              numFractions: input.numFractions,
              organ: input.organ,
              structureType: "target",
              model: input.model as any,
              parameters: params,
            } as CalculationRequest,
            { ...defaultParams, ...params }
          );
          return result.tcp || 0;
        };
        
        // Calculate uncertain TCP
        const result = calculateUncertainTCP(
          tcpFunction,
          defaultParams,
          input.parameterUncertainties as any,
          input.iterations
        );
        
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate Therapeutic Window Index (TWI)
   * 
   * Computes TWI = TCP - λ × NTCP for plan comparison
   */
  calculateTWI: publicProcedure
    .input(
      z.object({
        tcp: z.number().min(0).max(1),
        ntcp: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]),
        lambda: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { calculateTWI, calculateMultiOARTWI } = await import("../../utils/novel-equations");
        
        // Single OAR case
        if (typeof input.ntcp === "number") {
          const lambda = typeof input.lambda === "number" ? input.lambda : 1.0;
          const result = calculateTWI(input.tcp, input.ntcp, lambda);
          
          return {
            success: true,
            data: result,
          };
        }
        
        // Multi-OAR case
        const lambdas = Array.isArray(input.lambda)
          ? input.lambda
          : new Array(input.ntcp.length).fill(1.0);
        
        const result = calculateMultiOARTWI(input.tcp, input.ntcp, lambdas);
        
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Calculate Cohort-Consistency Score (CCS)
   * 
   * Checks if patient is within training cohort distribution
   */
  calculateCCS: publicProcedure
    .input(
      z.object({
        patientFeatures: z.array(z.number()),
        cohortMean: z.array(z.number()),
        cohortCovariance: z.array(z.array(z.number())),
        featureNames: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      try {
        const { calculateCohortConsistencyScore } = await import("../../utils/novel-equations");
        
        const result = calculateCohortConsistencyScore(
          input.patientFeatures,
          {
            mean: input.cohortMean,
            covariance: input.cohortCovariance,
            featureNames: input.featureNames,
          }
        );
        
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  getLiteratureProvenance: publicProcedure
    .input(z.object({ organ: z.string(), model: z.string() }))
    .query(({ input }) => {
      const data = getProvenanceFor(input.organ, input.model);
      if (!data) {
        return { success: false as const, error: "No provenance for organ/model" };
      }
      return { success: true as const, data };
    }),

  getReferenceLibrary: publicProcedure.query(() => ({
    success: true as const,
    data: getReferenceLibrary(),
  })),

  compareToQuantecBenchmark: publicProcedure
    .input(
      z.object({
        organ: z.string(),
        structureType: z.enum(["target", "oar"]),
        tcp: z.number().min(0).max(1).optional(),
        ntcp: z.number().min(0).max(1).optional(),
      }),
    )
    .query(({ input }) => {
      const key = benchmarkOrganKey(input.organ);
      const modelSuffix = input.structureType === "target" ? "Poisson" : "LKB";
      const bench =
        BenchmarkComparator.getBenchmarkValues(key, modelSuffix) ??
        BenchmarkComparator.getBenchmarkValues(key, "LKB");
      if (!bench) {
        return { success: false as const, error: `No QUANTEC benchmark for ${input.organ}` };
      }
      const userTcp = input.tcp ?? (input.structureType === "target" ? 0.85 : 0);
      const userNtcp = input.ntcp ?? (input.structureType === "oar" ? 0.2 : 0);
      const comparison = BenchmarkComparator.compareWithBenchmark(userTcp, userNtcp, bench);
      return { success: true as const, data: { benchmark: bench, comparison } };
    }),

  generateAnalysisReport: publicProcedure
    .input(
      z.object({
        patientId: z.string(),
        planLabel: z.string(),
        organ: z.string(),
        structureName: z.string(),
        structureType: z.enum(["target", "oar"]),
        model: z.string(),
        cancerSite: z.string(),
        technique: z.string(),
        totalDose: z.number(),
        numFractions: z.number(),
        tcp: z.number().optional(),
        ntcp: z.number().optional(),
        bed: z.number(),
        eqd2: z.number(),
        meanDose: z.number(),
        maxDose: z.number(),
        gEUD: z.number(),
        doseMetricRows: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            note: z.string().optional(),
          }),
        ),
        includeClinicalInReport: z.boolean().optional(),
        clinicalSections: z
          .array(
            z.object({
              sectionTitle: z.string(),
              rows: z.array(
                z.object({
                  label: z.string(),
                  value: z.string(),
                }),
              ),
            }),
          )
          .optional(),
      }),
    )
    .mutation(({ input }) => {
      try {
        const report = buildAnalysisReport(input);
        return { success: true as const, data: report };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Report generation failed",
        };
      }
    }),
});
