/**
 * Treatment delivery techniques — affects fractionation defaults and LQ validity flags.
 * IGRT is a guidance modality; radiobiology uses the underlying fractionation (IMRT/VMAT/SBRT).
 */

export type TechniqueId =
  | "3DCRT"
  | "IMRT"
  | "VMAT"
  | "IGRT"
  | "SRT"
  | "SBRT";

export interface TechniqueDefinition {
  id: TechniqueId;
  label: string;
  description: string;
  /** Typical fractionation for conventional sites (Gy, fx) */
  defaultTotalDoseGy: number;
  defaultFractions: number;
  /** Per-fraction dose above which linear-quadratic extrapolation needs caution (Gy) */
  lqValidMaxDosePerFractionGy: number;
  /** Use universal survival correction above lqValidMax (SBRT/SRT) */
  useUscForHypofractionation: boolean;
  /** Applicable to these delivery classes */
  notes: string;
}

export const TREATMENT_TECHNIQUES: TechniqueDefinition[] = [
  {
    id: "3DCRT",
    label: "3D-CRT",
    description: "Forward-planned conformal RT",
    defaultTotalDoseGy: 70,
    defaultFractions: 35,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: false,
    notes: "Standard LQ/BED/EQD2 applicable (2 Gy/fx).",
  },
  {
    id: "IMRT",
    label: "IMRT",
    description: "Inverse-planned IMRT",
    defaultTotalDoseGy: 70,
    defaultFractions: 35,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: false,
    notes: "Same radiobiology as 3D-CRT; DVH metrics from IMRT plan.",
  },
  {
    id: "VMAT",
    label: "VMAT",
    description: "Volumetric modulated arc therapy",
    defaultTotalDoseGy: 70,
    defaultFractions: 35,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: false,
    notes: "Arc delivery; use differential/cumulative DVH from TPS.",
  },
  {
    id: "IGRT",
    label: "IGRT",
    description: "Image-guided RT (online correction)",
    defaultTotalDoseGy: 70,
    defaultFractions: 35,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: false,
    notes:
      "IGRT is not a separate dose model — apply LQ to the actual fractionation delivered.",
  },
  {
    id: "SRT",
    label: "SRT",
    description: "Stereotactic RT (moderate hypofractionation)",
    defaultTotalDoseGy: 50,
    defaultFractions: 5,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: true,
    notes: "LQ caution when dose/fx > 10 Gy; review BED/EQD2 carefully.",
  },
  {
    id: "SBRT",
    label: "SBRT",
    description: "Stereotactic body RT (ablative)",
    defaultTotalDoseGy: 54,
    defaultFractions: 3,
    lqValidMaxDosePerFractionGy: 10,
    useUscForHypofractionation: true,
    notes:
      "Hypofractionated; α/β and USC-style caution per site (Timmerman, QUANTEC supplements).",
  },
];

export function getTechnique(id: string): TechniqueDefinition | undefined {
  return TREATMENT_TECHNIQUES.find((t) => t.id === id);
}

export function treatmentTimeDays(numFractions: number, dosePerFractionGy: number): number {
  return Math.max(1, Math.round(numFractions * Math.max(1, dosePerFractionGy / 2)));
}
