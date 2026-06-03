/**
 * Clinical Protocol Templates Service
 * 
 * Pre-configured templates for various tumor sites and treatment protocols
 * Based on QUANTEC, RTOG, and institutional guidelines
 */

import { z } from "zod";

export const ProtocolTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  tumorSite: z.string(),
  protocol: z.enum(["QUANTEC", "RTOG", "INSTITUTIONAL"]),
  ntcpModel: z.enum(["LKB_LogLogistic", "LKB_Probit", "Poisson"]),
  tcpModel: z.enum(["Poisson", "LKB_TCP"]),
  fractionation: z.object({
    totalDose: z.number(),
    fractionSize: z.number(),
    numberOfFractions: z.number(),
  }),
  organs: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["target", "oar"]),
      alphaBeta: z.number(),
      parameters: z.record(z.string(), z.any()),
      constraints: z.object({
        minDose: z.number().optional(),
        maxDose: z.number().optional(),
        maxVolume: z.number().optional(),
      }),
    })
  ),
  references: z.array(z.string()),
});

export type ProtocolTemplate = z.infer<typeof ProtocolTemplateSchema>;

// Type for organ parameters
export interface OrganParameters {
  D50?: number;
  m?: number;
  s?: number;
  [key: string]: number | undefined;
}

/**
 * Clinical Protocol Templates
 */
export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  // Head & Neck Cancer
  {
    id: "template-001",
    name: "Head & Neck - QUANTEC Standard",
    description:
      "Standard head and neck cancer treatment protocol based on QUANTEC guidelines",
    tumorSite: "Head & Neck",
    protocol: "QUANTEC",
    ntcpModel: "LKB_LogLogistic",
    tcpModel: "Poisson",
    fractionation: {
      totalDose: 70,
      fractionSize: 2,
      numberOfFractions: 35,
    },
    organs: [
      {
        name: "PTV",
        type: "target",
        alphaBeta: 10,
        parameters: {
          D50: 70,
          m: 0.15,
          s: 0.5,
        },
        constraints: {
          minDose: 66.5,
        },
      },
      {
        name: "Parotid Gland",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 26,
          m: 0.35,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 26,
        },
      },
      {
        name: "Spinal Cord",
        type: "oar",
        alphaBeta: 2,
        parameters: {
          D50: 66,
          m: 0.06,
          s: 0.5,
        },
        constraints: {
          maxDose: 50,
        },
      },
      {
        name: "Larynx",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 50,
          m: 0.25,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 50,
        },
      },
    ],
    references: [
      "Deasy et al. IJROBP 2010 - QUANTEC Head & Neck",
      "Eisbruch et al. IJROBP 2002 - Parotid Sparing",
    ],
  },

  // Prostate Cancer
  {
    id: "template-002",
    name: "Prostate - QUANTEC Standard",
    description:
      "Standard prostate cancer treatment protocol based on QUANTEC guidelines",
    tumorSite: "Prostate",
    protocol: "QUANTEC",
    ntcpModel: "LKB_LogLogistic",
    tcpModel: "Poisson",
    fractionation: {
      totalDose: 78,
      fractionSize: 2,
      numberOfFractions: 39,
    },
    organs: [
      {
        name: "PTV",
        type: "target",
        alphaBeta: 1.5,
        parameters: {
          D50: 78,
          m: 0.15,
          s: 0.5,
        },
        constraints: {
          minDose: 74.1,
        },
      },
      {
        name: "Rectum",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 76,
          m: 0.13,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 76,
        },
      },
      {
        name: "Bladder",
        type: "oar",
        alphaBeta: 5,
        parameters: {
          D50: 80,
          m: 0.11,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 80,
        },
      },
      {
        name: "Femoral Head",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 52,
          m: 0.25,
          s: 0.5,
        },
        constraints: {
          maxDose: 52,
        },
      },
    ],
    references: [
      "Michalski et al. IJROBP 2019 - QUANTEC Prostate",
      "Zelefsky et al. IJROBP 2012 - Dose Escalation",
    ],
  },

  // Lung Cancer
  {
    id: "template-003",
    name: "Lung - QUANTEC Standard",
    description:
      "Standard lung cancer treatment protocol based on QUANTEC guidelines",
    tumorSite: "Lung",
    protocol: "QUANTEC",
    ntcpModel: "LKB_LogLogistic",
    tcpModel: "Poisson",
    fractionation: {
      totalDose: 60,
      fractionSize: 2,
      numberOfFractions: 30,
    },
    organs: [
      {
        name: "PTV",
        type: "target",
        alphaBeta: 10,
        parameters: {
          D50: 60,
          m: 0.15,
          s: 0.5,
        },
        constraints: {
          minDose: 57,
        },
      },
      {
        name: "Lung",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 24.5,
          m: 0.37,
          s: 0.5,
        },
        constraints: {
          maxVolume: 20,
          maxDose: 20,
        },
      },
      {
        name: "Heart",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 48,
          m: 0.37,
          s: 0.5,
        },
        constraints: {
          maxVolume: 46,
          maxDose: 40,
        },
      },
      {
        name: "Esophagus",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 58,
          m: 0.19,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 50,
        },
      },
    ],
    references: [
      "Marks et al. IJROBP 2010 - QUANTEC Lung",
      "Bradley et al. IJROBP 2015 - Esophageal Toxicity",
    ],
  },

  // Breast Cancer
  {
    id: "template-004",
    name: "Breast - QUANTEC Standard",
    description:
      "Standard breast cancer treatment protocol based on QUANTEC guidelines",
    tumorSite: "Breast",
    protocol: "QUANTEC",
    ntcpModel: "LKB_LogLogistic",
    tcpModel: "Poisson",
    fractionation: {
      totalDose: 50,
      fractionSize: 2,
      numberOfFractions: 25,
    },
    organs: [
      {
        name: "PTV",
        type: "target",
        alphaBeta: 4,
        parameters: {
          D50: 50,
          m: 0.15,
          s: 0.5,
        },
        constraints: {
          minDose: 47.5,
        },
      },
      {
        name: "Heart",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 48,
          m: 0.37,
          s: 0.5,
        },
        constraints: {
          maxVolume: 5,
          maxDose: 25,
        },
      },
      {
        name: "Lung",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 24.5,
          m: 0.37,
          s: 0.5,
        },
        constraints: {
          maxVolume: 20,
          maxDose: 20,
        },
      },
    ],
    references: [
      "Gagliardi et al. IJROBP 2010 - QUANTEC Breast",
      "Darby et al. NEJM 2013 - Cardiac Toxicity",
    ],
  },

  // Rectum Cancer
  {
    id: "template-005",
    name: "Rectum - QUANTEC Standard",
    description:
      "Standard rectal cancer treatment protocol based on QUANTEC guidelines",
    tumorSite: "Rectum",
    protocol: "QUANTEC",
    ntcpModel: "LKB_LogLogistic",
    tcpModel: "Poisson",
    fractionation: {
      totalDose: 50.4,
      fractionSize: 1.8,
      numberOfFractions: 28,
    },
    organs: [
      {
        name: "PTV",
        type: "target",
        alphaBeta: 10,
        parameters: {
          D50: 50.4,
          m: 0.15,
          s: 0.5,
        },
        constraints: {
          minDose: 47.88,
        },
      },
      {
        name: "Rectum",
        type: "oar",
        alphaBeta: 3,
        parameters: {
          D50: 76,
          m: 0.13,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 76,
        },
      },
      {
        name: "Bladder",
        type: "oar",
        alphaBeta: 5,
        parameters: {
          D50: 80,
          m: 0.11,
          s: 0.5,
        },
        constraints: {
          maxVolume: 50,
          maxDose: 80,
        },
      },
    ],
    references: [
      "Michalski et al. IJROBP 2019 - QUANTEC Rectum",
      "Gunderson et al. IJROBP 2016 - Rectal Cancer",
    ],
  },
];

/**
 * Protocol Templates Service
 */
export class ProtocolTemplatesService {
  /**
   * Get all available templates
   */
  static getAllTemplates(): ProtocolTemplate[] {
    return PROTOCOL_TEMPLATES;
  }

  /**
   * Get templates by tumor site
   */
  static getTemplatesByTumorSite(tumorSite: string): ProtocolTemplate[] {
    return PROTOCOL_TEMPLATES.filter((t) => t.tumorSite === tumorSite);
  }

  /**
   * Get template by ID
   */
  static getTemplateById(id: string): ProtocolTemplate | undefined {
    return PROTOCOL_TEMPLATES.find((t) => t.id === id);
  }

  /**
   * Get unique tumor sites
   */
  static getTumorSites(): string[] {
    return [...new Set(PROTOCOL_TEMPLATES.map((t) => t.tumorSite))];
  }

  /**
   * Get templates by protocol
   */
  static getTemplatesByProtocol(
    protocol: "QUANTEC" | "RTOG" | "INSTITUTIONAL"
  ): ProtocolTemplate[] {
    return PROTOCOL_TEMPLATES.filter((t) => t.protocol === protocol);
  }

  /**
   * Create custom template from existing template
   */
  static createCustomTemplate(
    baseTemplateId: string,
    customizations: Partial<ProtocolTemplate>
  ): ProtocolTemplate | null {
    const baseTemplate = this.getTemplateById(baseTemplateId);
    if (!baseTemplate) return null;

    return {
      ...baseTemplate,
      id: crypto.randomUUID(),
      ...customizations,
    };
  }

  /**
   * Get template recommendations for a case
   */
  static getRecommendations(tumorSite: string): ProtocolTemplate[] {
    return this.getTemplatesByTumorSite(tumorSite).slice(0, 3);
  }
}
