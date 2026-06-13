/**
 * Patient store — Metro resolves patient-store.web.ts (browser) or
 * patient-store.native.ts (Android/iOS). This file satisfies TypeScript.
 */
export type { PatientCase } from "@/lib/patient-store.types";
export {
  savePatientCase,
  listPatientCases,
  deletePatientCase,
  loadPatientCase,
} from "@/lib/patient-store.web";
