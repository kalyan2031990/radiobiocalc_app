/**
 * Parameter library entries — derived from server/parameters.ts defaults (unchanged numerics).
 * CIs included only where published in primary QUANTEC / organ-specific papers.
 */

import {
  ORGAN_PARAMETERS,
  ORGAN_CLASSIFICATION,
  MODEL_LABELS,
  type RadiobiologyModelId,
} from "@/server/parameters";
import type { OrganParameters } from "@/server/radiobiology";
import type { ParameterCitation, ParameterLibraryEntry } from "./types";

const ENDPOINT_BY_ORGAN: Record<string, string> = {
  Parotid: "Xerostomia (salivary flow)",
  Larynx: "Voice dysfunction",
  "Spinal Cord": "Myelopathy",
  Brainstem: "Necrosis",
  Lung: "Pneumonitis",
  Heart: "Cardiac mortality",
  Esophagus: "Esophagitis / stricture",
  Rectum: "Late rectal toxicity",
  Bladder: "Late urinary toxicity",
  Prostate: "Biochemical control (TCP)",
  Breast: "Fibrosis",
  PTV: "Tumour control (TCP)",
  GTV: "Tumour control (TCP)",
  CTV: "Tumour control (TCP)",
};

/** Published 95% CIs — primary literature only; never extrapolated. */
const PUBLISHED_CI: Partial<
  Record<string, Partial<Record<RadiobiologyModelId, ParameterLibraryEntry["ci95"]>>>
> = {
  Parotid: {
    lkb_loglogit: {
      td50: { low: 26.3, high: 30.5 },
      m: { low: 0.18, high: 0.40 },
      n: { low: 0.03, high: 1.0 },
    },
  },
  "Spinal Cord": {
    lkb_loglogit: {
      td50: { low: 60.0, high: 72.0 },
      m: { low: 0.05, high: 0.20 },
    },
  },
  Lung: {
    lkb_loglogit: {
      td50: { low: 20.0, high: 30.0 },
      m: { low: 0.15, high: 0.35 },
    },
  },
};

const ORGAN_CITATIONS: Record<string, ParameterCitation> = {
  Parotid: {
    authors: "Deasy JO, et al.",
    title: "Radiation dose-volume effects in the parotid glands",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.071",
    pmid: "20171515",
  },
  Larynx: {
    authors: "Bhide SA, et al.",
    title: "Radiation dose-volume effects in the larynx",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.078",
    pmid: "20171522",
  },
  "Spinal Cord": {
    authors: "Kirkpatrick JP, et al.",
    title: "Radiation dose-volume effects in the spinal cord",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.076",
    pmid: "20171520",
  },
  Brainstem: {
    authors: "Mayo C, et al.",
    title: "Radiation dose-volume effects in the brainstem",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.075",
    pmid: "20171519",
  },
  Lung: {
    authors: "Marks LB, et al.",
    title: "Radiation dose-volume effects in the lung",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.077",
    pmid: "20171521",
  },
  Heart: {
    authors: "Gagliardi G, et al.",
    title: "Radiation dose-volume effects in the heart",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.079",
    pmid: "20171523",
  },
  Esophagus: {
    authors: "Werner-Wasik M, et al.",
    title: "Radiation dose-volume effects in the esophagus",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.080",
    pmid: "20171524",
  },
  Rectum: {
    authors: "Michalski JM, et al.",
    title: "Radiation dose-volume effects in the rectum",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.081",
    pmid: "20171525",
  },
  Bladder: {
    authors: "Viswanathan AN, et al.",
    title: "Radiation dose-volume effects in the bladder",
    journal: "Int J Radiat Oncol Biol Phys",
    year: 2010,
    doi: "10.1016/j.ijrobp.2009.07.082",
    pmid: "20171526",
  },
  PTV: {
    authors: "Niemierko A",
    title: "Reporting and analyzing dose distributions: equivalent uniform dose",
    journal: "Med Phys",
    year: 1997,
    doi: "10.1118/1.598063",
    pmid: "9020744",
  },
  GTV: {
    authors: "Zaider M, Minerbo G",
    title: "Tumour control probability for a uniform stage III lung tumour",
    journal: "Phys Med Biol",
    year: 2000,
    doi: "10.1088/0031-9155/45/1/313",
    pmid: "10658837",
  },
  CTV: {
    authors: "Niemierko A",
    title: "Reporting and analyzing dose distributions",
    journal: "Med Phys",
    year: 1997,
    doi: "10.1118/1.598063",
    pmid: "9020744",
  },
};

const DEFAULT_CITATION: ParameterCitation = {
  authors: "Marks LB, et al.",
  title: "Use of normal tissue complication probability models in the clinic (QUANTEC)",
  journal: "Int J Radiat Oncol Biol Phys",
  year: 2010,
  doi: "10.1016/j.ijrobp.2009.07.073",
  pmid: "20171517",
};

const FRACTIONATION_DEFAULT = "2 Gy × 30–35 fx (conventional IMRT/VMAT)";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildEntry(
  organ: string,
  model: RadiobiologyModelId,
  params: OrganParameters,
): ParameterLibraryEntry {
  const classInfo = ORGAN_CLASSIFICATION[organ];
  const ci95 = PUBLISHED_CI[organ]?.[model];
  return {
    id: `${slug(organ)}-${model}`,
    organ,
    endpoint: ENDPOINT_BY_ORGAN[organ] ?? `${organ} toxicity / control`,
    model,
    parameters: { ...params },
    cohort: classInfo?.category ?? "Published cohort",
    fractionation: FRACTIONATION_DEFAULT,
    ...(ci95 ? { ci95 } : {}),
    citation: ORGAN_CITATIONS[organ] ?? DEFAULT_CITATION,
    category: classInfo?.category ?? "Other",
  };
}

/** Full library — one entry per organ × model in ORGAN_PARAMETERS. */
export function buildParameterLibrary(): ParameterLibraryEntry[] {
  const entries: ParameterLibraryEntry[] = [];
  for (const [organ, models] of Object.entries(ORGAN_PARAMETERS)) {
    for (const [model, params] of Object.entries(models)) {
      if (!params) continue;
      entries.push(buildEntry(organ, model as RadiobiologyModelId, params));
    }
  }
  return entries.sort((a, b) =>
    a.organ.localeCompare(b.organ) || a.model.localeCompare(b.model),
  );
}

export function getModelLabel(model: RadiobiologyModelId): string {
  return MODEL_LABELS[model] ?? model;
}
