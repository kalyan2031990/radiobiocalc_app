/**
 * Site- and organ-specific optional clinical fields (dropdown-first).
 * User-entered values adjust TCP/NTCP via log-odds covariates when provided.
 */

import type { CancerSiteId } from "@/server/sites-registry";

export type StructureRole = "target" | "oar";

export type ClinicalFieldType = "select" | "text" | "multiline";

export interface ClinicalFieldDefinition {
  id: string;
  label: string;
  type: ClinicalFieldType;
  options?: readonly string[];
  placeholder?: string;
  /** Which evaluation roles see this field */
  roles: StructureRole[] | "both";
  /** Cancer sites; omit = all sites */
  sites?: CancerSiteId[];
  /** Literature organ keys; omit = all organs for the role on that site */
  organs?: string[];
  section: "patient" | "disease" | "treatment" | "organ" | "notes";
}

/** Flat string map — keys are field ids */
export type ClinicalContext = Record<string, string>;

export const EMPTY_CLINICAL: ClinicalContext = {};

const ALL_SITES: CancerSiteId[] = [
  "BRAIN",
  "HN",
  "BREAST",
  "LUNG",
  "CERVIX",
  "RECTUM",
  "PROSTATE",
];

const YES_NO_UNK = ["Yes", "No", "Unknown"] as const;
const KPS = ["100", "90", "80", "70", "60 or less", "Unknown"] as const;
const INTENT = ["Curative", "Adjuvant", "Definitive", "Palliative", "Salvage"] as const;
const TNM_T = ["T0", "T1", "T2", "T3", "T4", "Tx", "Unknown"] as const;
const TNM_N = ["N0", "N1", "N2", "N3", "Nx", "Unknown"] as const;
const TNM_M = ["M0", "M1", "Mx", "Unknown"] as const;

export const CLINICAL_FIELD_DEFINITIONS: ClinicalFieldDefinition[] = [
  // ── Patient (both TCP / NTCP) ──
  {
    id: "age",
    label: "Age (years)",
    type: "text",
    placeholder: "e.g. 58",
    roles: "both",
    section: "patient",
  },
  {
    id: "sex",
    label: "Sex",
    type: "select",
    options: ["Male", "Female", "Other", "Unknown"],
    roles: "both",
    section: "patient",
  },
  {
    id: "kps",
    label: "KPS / performance",
    type: "select",
    options: KPS,
    roles: "both",
    section: "patient",
  },
  {
    id: "bmi",
    label: "BMI (kg/m²)",
    type: "text",
    placeholder: "e.g. 24.5",
    roles: "both",
    section: "patient",
  },

  // ── Disease / site (both, site-filtered) ──
  {
    id: "intent",
    label: "Treatment intent",
    type: "select",
    options: INTENT,
    roles: "both",
    section: "disease",
  },
  {
    id: "histology",
    label: "Histology",
    type: "select",
    options: [
      "Squamous cell carcinoma",
      "Adenocarcinoma",
      "Other NSCLC",
      "SCLC",
      "Glioblastoma",
      "Brain metastasis",
      "Invasive ductal",
      "Adenocarcinoma prostate",
      "Cervical SCC",
      "Rectal adenocarcinoma",
      "Other",
      "Unknown",
    ],
    roles: "both",
    section: "disease",
  },
  {
    id: "stage_t",
    label: "T stage",
    type: "select",
    options: TNM_T,
    roles: "both",
    section: "disease",
  },
  {
    id: "stage_n",
    label: "N stage",
    type: "select",
    options: TNM_N,
    roles: "both",
    section: "disease",
  },
  {
    id: "stage_m",
    label: "M stage",
    type: "select",
    options: TNM_M,
    roles: "both",
    section: "disease",
  },

  // HN site
  {
    id: "hn_primary_site",
    label: "H&N primary subsite",
    type: "select",
    options: [
      "Oropharynx",
      "Larynx",
      "Hypopharynx",
      "Oral cavity",
      "Nasopharynx",
      "Unknown",
    ],
    roles: "both",
    sites: ["HN"],
    section: "disease",
  },
  {
    id: "hpv",
    label: "HPV status (p16)",
    type: "select",
    options: ["Positive", "Negative", "Unknown", "Not tested"],
    roles: "both",
    sites: ["HN"],
    section: "disease",
  },
  {
    id: "smoking",
    label: "Smoking status",
    type: "select",
    options: ["Never", "Former", "Current", "Unknown"],
    roles: "both",
    sites: ["HN", "LUNG"],
    section: "disease",
  },

  // Prostate site
  {
    id: "prostate_risk",
    label: "NCCN risk group",
    type: "select",
    options: ["Very low", "Low", "Intermediate", "High", "Very high", "Unknown"],
    roles: "both",
    sites: ["PROSTATE"],
    section: "disease",
  },
  {
    id: "gleason",
    label: "Gleason score",
    type: "select",
    options: ["6 (3+3)", "7 (3+4)", "7 (4+3)", "8", "9–10", "Unknown"],
    roles: "both",
    sites: ["PROSTATE"],
    section: "disease",
  },

  // Breast site
  {
    id: "breast_laterality",
    label: "Laterality",
    type: "select",
    options: ["Left", "Right", "Bilateral", "Unknown"],
    roles: "both",
    sites: ["BREAST"],
    section: "disease",
  },
  {
    id: "er_status",
    label: "ER status",
    type: "select",
    options: ["Positive", "Negative", "Unknown"],
    roles: "both",
    sites: ["BREAST"],
    section: "disease",
  },
  {
    id: "her2_status",
    label: "HER2 status",
    type: "select",
    options: ["Positive", "Negative", "Unknown"],
    roles: "both",
    sites: ["BREAST"],
    section: "disease",
  },

  // Cervix site
  {
    id: "figo_stage",
    label: "FIGO stage",
    type: "select",
    options: ["I", "II", "III", "IV", "Unknown"],
    roles: "both",
    sites: ["CERVIX"],
    section: "disease",
  },

  // Brain site
  {
    id: "brain_pathology",
    label: "Brain pathology",
    type: "select",
    options: ["GBM", "Grade 3 glioma", "Brain metastasis", "Meningioma", "Other", "Unknown"],
    roles: "both",
    sites: ["BRAIN"],
    section: "disease",
  },
  {
    id: "mgmt",
    label: "MGMT methylation",
    type: "select",
    options: ["Methylated", "Unmethylated", "Unknown", "Not tested"],
    roles: "both",
    sites: ["BRAIN"],
    section: "disease",
  },

  // Lung site
  {
    id: "lung_stage_group",
    label: "Stage group",
    type: "select",
    options: ["I", "II", "III", "IV", "Unknown"],
    roles: "both",
    sites: ["LUNG"],
    section: "disease",
  },

  // Rectum site
  {
    id: "rectum_neoadjuvant",
    label: "Neoadjuvant therapy",
    type: "select",
    options: ["None", "Long-course CRT", "Short-course RT", "TNT", "Unknown"],
    roles: "both",
    sites: ["RECTUM"],
    section: "disease",
  },

  // ── Treatment (both) ──
  {
    id: "prior_rt",
    label: "Prior RT to region",
    type: "select",
    options: YES_NO_UNK,
    roles: "both",
    section: "treatment",
  },
  {
    id: "concurrent_chemo",
    label: "Concurrent chemotherapy",
    type: "select",
    options: YES_NO_UNK,
    roles: "both",
    section: "treatment",
  },
  {
    id: "systemic_agent",
    label: "Systemic agent (if any)",
    type: "select",
    options: [
      "None",
      "Cisplatin",
      "Carboplatin",
      "Cetuximab",
      "Immunotherapy",
      "Hormonal",
      "Other",
      "Unknown",
    ],
    roles: "both",
    section: "treatment",
  },

  // ── Target-specific (TCP) ──
  {
    id: "target_type",
    label: "Target volume role",
    type: "select",
    options: ["GTV", "CTV", "PTV", "ITV", "Boost PTV", "Unknown"],
    roles: ["target"],
    section: "organ",
  },
  {
    id: "coverage_goal",
    label: "Coverage goal",
    type: "select",
    options: [
      "D95 ≥ 95% Rx",
      "D98 ≥ 95% Rx",
      "D99 ≥ 90% Rx",
      "SBRT conformal",
      "Other / institutional",
    ],
    roles: ["target"],
    section: "organ",
  },
  {
    id: "prior_tumor_rt",
    label: "Prior RT to this target",
    type: "select",
    options: YES_NO_UNK,
    roles: ["target"],
    section: "organ",
  },

  // ── OAR-specific (NTCP) ──
  {
    id: "ntcp_endpoint",
    label: "NTCP endpoint of interest",
    type: "select",
    options: [
      "Generic QUANTEC",
      "Xerostomia",
      "Dysphagia",
      "Laryngeal dysfunction",
      "Myelopathy",
      "Optic neuropathy",
      "Brain necrosis",
      "Pneumonitis",
      "Cardiac events",
      "Late GI toxicity",
      "Late GU toxicity",
      "Other",
    ],
    roles: ["oar"],
    section: "organ",
  },
  {
    id: "baseline_function",
    label: "Baseline organ function",
    type: "select",
    options: ["Normal", "Mildly impaired", "Moderately impaired", "Unknown"],
    roles: ["oar"],
    section: "organ",
  },

  // Parotid
  {
    id: "parotid_laterality",
    label: "Parotid evaluated",
    type: "select",
    options: ["Combined", "Ipsilateral", "Contralateral", "Single / unspecified"],
    roles: ["oar"],
    sites: ["HN"],
    organs: ["Parotid"],
    section: "organ",
  },
  {
    id: "saliva_baseline",
    label: "Baseline saliva / xerostomia",
    type: "select",
    options: ["Normal", "Mild dry mouth", "Moderate–severe", "Unknown"],
    roles: ["oar"],
    sites: ["HN"],
    organs: ["Parotid", "Submandibular"],
    section: "organ",
  },

  // Larynx
  {
    id: "voice_baseline",
    label: "Baseline voice / swallow",
    type: "select",
    options: ["Normal", "Hoarse / mild dysphagia", "Moderate–severe", "Unknown"],
    roles: ["oar"],
    organs: ["Larynx", "Pharyngeal Constrictor"],
    section: "organ",
  },

  // Spinal cord
  {
    id: "cord_context",
    label: "Cord irradiation context",
    type: "select",
    options: ["De novo", "Re-irradiation", "Prior spine RT", "Unknown"],
    roles: ["oar"],
    organs: ["Spinal Cord"],
    section: "organ",
  },

  // Rectum / bladder (pelvic)
  {
    id: "pelvic_oar_priority",
    label: "Pelvic OAR priority",
    type: "select",
    options: ["Standard QUANTEC", "Organ-sparing priority", "Dose-escalation plan", "Unknown"],
    roles: ["oar"],
    sites: ["PROSTATE", "CERVIX", "RECTUM"],
    organs: ["Rectum", "Bladder", "Bowel"],
    section: "organ",
  },

  // Lung
  {
    id: "lung_v20_context",
    label: "Lung toxicity context",
    type: "select",
    options: ["Conventionally fractionated", "Hypofractionated", "Post-operative", "Unknown"],
    roles: ["oar"],
    sites: ["LUNG", "BREAST"],
    organs: ["Lung"],
    section: "organ",
  },

  // Heart
  {
    id: "cardiac_history",
    label: "Cardiac history",
    type: "select",
    options: ["None", "CAD", "Heart failure", "Arrhythmia", "Unknown"],
    roles: ["oar"],
    organs: ["Heart"],
    section: "organ",
  },

  // Brain OARs
  {
    id: "cns_oar_context",
    label: "CNS OAR context",
    type: "select",
    options: ["Primary RT", "Post-op cavity", "Re-irradiation", "SRS adjacent", "Unknown"],
    roles: ["oar"],
    sites: ["BRAIN"],
    organs: ["Brain", "Brainstem", "Optic Nerve", "Chiasm", "Hippocampus", "Cochlea", "Lens"],
    section: "organ",
  },

  // Notes
  {
    id: "clinical_notes",
    label: "Clinical notes",
    type: "multiline",
    placeholder: "MDT context, constraints, questions for review…",
    roles: "both",
    section: "notes",
  },
];

export function normalizeOrganKey(organ: string): string {
  return organ.trim();
}

export function getClinicalFieldsForContext(
  siteId: string,
  role: StructureRole,
  organ: string
): ClinicalFieldDefinition[] {
  const site = siteId.toUpperCase() as CancerSiteId;
  const organKey = normalizeOrganKey(organ);

  return CLINICAL_FIELD_DEFINITIONS.filter((f) => {
    if (f.roles !== "both" && !f.roles.includes(role)) return false;
    if (f.sites && !f.sites.includes(site)) return false;
    if (f.organs && !f.organs.some((o) => o.toLowerCase() === organKey.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export function groupClinicalFields(
  fields: ClinicalFieldDefinition[]
): Record<string, ClinicalFieldDefinition[]> {
  const order = ["patient", "disease", "treatment", "organ", "notes"];
  const groups: Record<string, ClinicalFieldDefinition[]> = {};
  for (const f of fields) {
    if (!groups[f.section]) groups[f.section] = [];
    groups[f.section].push(f);
  }
  const sorted: Record<string, ClinicalFieldDefinition[]> = {};
  for (const key of order) {
    if (groups[key]?.length) sorted[key] = groups[key];
  }
  return sorted;
}

export const SECTION_LABELS: Record<string, string> = {
  patient: "Patient",
  disease: "Disease & site",
  treatment: "Treatment",
  organ: "Structure-specific",
  notes: "Notes",
};

/** Legacy flat keys from earlier mobile build */
const LEGACY_KEY_MAP: Record<string, string> = {
  priorRt: "prior_rt",
  concurrentChemo: "concurrent_chemo",
  diagnosis: "histology",
  stage: "stage_t",
  siteNotes: "clinical_notes",
  clinicalNotes: "clinical_notes",
};

export function parseClinicalContext(json?: string): ClinicalContext {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as Record<string, string>;
    const out: ClinicalContext = { ...raw };
    for (const [legacy, modern] of Object.entries(LEGACY_KEY_MAP)) {
      if (raw[legacy] && !out[modern]) {
        out[modern] = raw[legacy];
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function clinicalContextSummary(
  ctx: ClinicalContext,
  siteId: string,
  role: StructureRole,
  organ: string
): { label: string; value: string }[] {
  const fields = getClinicalFieldsForContext(siteId, role, organ);
  const rows: { label: string; value: string }[] = [];
  for (const f of fields) {
    const v = ctx[f.id]?.trim();
    if (v) rows.push({ label: f.label, value: v });
  }
  return rows;
}

export function clinicalContextHasValues(ctx: ClinicalContext): boolean {
  return Object.values(ctx).some((v) => String(v ?? "").trim().length > 0);
}

export function defaultNtcpEndpointForOrgan(organ: string): string {
  const o = organ.toLowerCase();
  if (o.includes("parotid") || o.includes("submand")) return "Xerostomia";
  if (o.includes("larynx") || o.includes("constrict")) return "Laryngeal dysfunction";
  if (o.includes("cord")) return "Myelopathy";
  if (o.includes("optic") || o.includes("chiasm")) return "Optic neuropathy";
  if (o.includes("brain")) return "Brain necrosis";
  if (o.includes("lung")) return "Pneumonitis";
  if (o.includes("heart")) return "Cardiac events";
  if (o.includes("rectum") || o.includes("bowel")) return "Late GI toxicity";
  if (o.includes("bladder") || o.includes("prostate")) return "Late GU toxicity";
  return "Generic QUANTEC";
}
