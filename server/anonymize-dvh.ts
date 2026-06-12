/**
 * Server-side DVH anonymization — delegates to lib/anonymize (ParsedDvhBundle).
 */

import type { DVHData } from "./data-handler";
export {
  anonymizeDvhBundle as anonymizeParsedBundle,
  pseudonymizePatientId,
  stripPatientName,
  PSEUDO_PREFIX,
} from "@/lib/anonymize";

import { anonymizeDvhBundle as anonymizeParsedBundle } from "@/lib/anonymize";

export const DEMO_PATIENT_ID = "HN-DEMO-001";
export const DEMO_PATIENT_LABEL = "Demo patient (anonymised head & neck plan)";
export const DEMO_PLAN_FILE_LABEL = "demo_hn_composite";

/** Anonymize server DVHData (used by demo-kastoori and tests). */
export function anonymizeDvhBundle(data: DVHData): DVHData {
  const bundle = {
    patientInfo: data.patientInfo,
    structures: data.structures.map((s) => ({ name: s.name, type: s.type })),
    dvhByStructure: data.dvhByStructure,
  };
  const anon = anonymizeParsedBundle(bundle);
  return {
    ...data,
    patientInfo: {
      patientId: anon.patientInfo?.patientId ?? DEMO_PATIENT_ID,
      patientName: anon.patientInfo?.patientName ?? DEMO_PATIENT_LABEL,
      modality: data.patientInfo?.modality ?? "Eclipse",
    },
  };
}
