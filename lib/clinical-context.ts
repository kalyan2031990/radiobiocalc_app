/**
 * Re-exports clinical context types/helpers (schema-driven).
 */

export {
  type ClinicalContext,
  type ClinicalFieldDefinition,
  type StructureRole,
  EMPTY_CLINICAL,
  CLINICAL_FIELD_DEFINITIONS,
  getClinicalFieldsForContext,
  groupClinicalFields,
  SECTION_LABELS,
  parseClinicalContext,
  clinicalContextSummary,
  clinicalContextHasValues,
  defaultNtcpEndpointForOrgan,
} from "./clinical-fields-schema";
