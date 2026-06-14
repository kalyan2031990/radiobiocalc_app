/** Shared DVH bundle shape — keep free of plan-evaluation imports. */

export type DVHPoint = { dose: number; volume: number };

export type ParsedDvhBundle = {
  patientInfo?: {
    patientId?: string;
    patientName?: string;
    modality?: string;
    studyDate?: string;
    prescribedDoseGy?: number;
    prescribedFractions?: number;
  };
  structures: { name: string; type?: string }[];
  dvhByStructure: Record<string, DVHPoint[]>;
  doseUnit?: string;
  volumeUnit?: string;
};
