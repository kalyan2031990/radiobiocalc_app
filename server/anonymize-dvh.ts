/**
 * Strip identifiable patient fields from DVH bundles used in demos / self-tests.
 */

import type { DVHData } from "./data-handler";

export const DEMO_PATIENT_ID = "HN-DEMO-001";
export const DEMO_PATIENT_LABEL = "Demo patient (anonymised head & neck plan)";
export const DEMO_PLAN_FILE_LABEL = "demo_hn_composite";

export function anonymizeDvhBundle(data: DVHData): DVHData {
  return {
    ...data,
    patientInfo: {
      patientId: DEMO_PATIENT_ID,
      patientName: DEMO_PATIENT_LABEL,
      modality: data.patientInfo?.modality ?? "Eclipse",
    },
  };
}
