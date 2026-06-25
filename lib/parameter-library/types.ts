/**
 * Versioned parameter library — citation-first organ/model catalogue (v1.1.0).
 */

import type { OrganParameters } from "@/server/radiobiology";
import type { RadiobiologyModelId } from "@/server/parameters";

export const PARAMETER_LIBRARY_VERSION = "1.1.0";

export type ParameterCi95 = {
  low: number;
  high: number;
};

export type ParameterCitation = {
  authors: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
};

export type ParameterLibraryEntry = {
  id: string;
  organ: string;
  endpoint: string;
  model: RadiobiologyModelId;
  parameters: OrganParameters;
  cohort: string;
  fractionation: string;
  /** Published 95% CIs only — omit keys without literature support. */
  ci95?: Partial<Record<keyof OrganParameters, ParameterCi95>>;
  citation: ParameterCitation;
  category: string;
};

export type ParameterLibraryFilter = {
  organ?: string;
  model?: RadiobiologyModelId;
  query?: string;
  category?: string;
};
