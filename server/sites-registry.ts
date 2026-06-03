/**
 * Cancer site registry with site-specific targets and OARs.
 * Literature: QUANTEC (IJROBP 2010 Suppl), RTOG, and engine site_params (desktop rbGyanX).
 */

export type CancerSiteId =
  | "BRAIN"
  | "HN"
  | "BREAST"
  | "LUNG"
  | "CERVIX"
  | "RECTUM"
  | "PROSTATE";

export interface CancerSiteDefinition {
  id: CancerSiteId;
  label: string;
  description: string;
  targets: string[];
  oars: string[];
  defaultOrgan: string;
  defaultTarget: string;
  tcpSiteKey: string;
}

export const CANCER_SITES: CancerSiteDefinition[] = [
  {
    id: "BRAIN",
    label: "Brain",
    description: "GBM / brain metastases — serial CNS OARs",
    targets: ["PTV", "GTV", "CTV"],
    oars: [
      "Brain",
      "Brainstem",
      "Spinal Cord",
      "Optic Nerve",
      "Chiasm",
      "Hippocampus",
      "Cochlea",
      "Lens",
    ],
    defaultOrgan: "Brain",
    defaultTarget: "PTV",
    tcpSiteKey: "BRAIN_GBM",
  },
  {
    id: "HN",
    label: "Head & Neck",
    description: "Squamous H&N — parallel and serial OARs",
    targets: ["PTV", "GTV", "CTV"],
    oars: [
      "Parotid",
      "Larynx",
      "Spinal Cord",
      "Brainstem",
      "Optic Nerve",
      "Mandible",
      "Pharyngeal Constrictor",
      "Submandibular",
    ],
    defaultOrgan: "Parotid",
    defaultTarget: "PTV",
    tcpSiteKey: "HN",
  },
  {
    id: "BREAST",
    label: "Breast",
    description: "Breast / chest wall",
    targets: ["PTV", "CTV"],
    oars: ["Breast", "Heart", "Lung", "Spinal Cord"],
    defaultOrgan: "Heart",
    defaultTarget: "PTV",
    tcpSiteKey: "BREAST",
  },
  {
    id: "LUNG",
    label: "Lung",
    description: "Thoracic NSCLC / lung SBRT",
    targets: ["PTV", "GTV", "ITV"],
    oars: ["Lung", "Heart", "Esophagus", "Spinal Cord", "Brachial Plexus"],
    defaultOrgan: "Lung",
    defaultTarget: "PTV",
    tcpSiteKey: "LUNG",
  },
  {
    id: "CERVIX",
    label: "Cervix",
    description: "Cervix / endometrium pelvic RT",
    targets: ["PTV", "CTV", "GTV"],
    oars: [
      "Bladder",
      "Rectum",
      "Bowel",
      "Femoral Head",
      "Spinal Cord",
    ],
    defaultOrgan: "Rectum",
    defaultTarget: "PTV",
    tcpSiteKey: "CERVIX",
  },
  {
    id: "RECTUM",
    label: "Rectum",
    description: "Rectal cancer pelvic RT",
    targets: ["PTV", "CTV", "GTV"],
    oars: ["Rectum", "Bladder", "Bowel", "Femoral Head", "Spinal Cord"],
    defaultOrgan: "Rectum",
    defaultTarget: "PTV",
    tcpSiteKey: "RECTUM",
  },
  {
    id: "PROSTATE",
    label: "Prostate",
    description: "Prostate / pelvic nodes",
    targets: ["PTV", "CTV"],
    oars: [
      "Prostate",
      "Rectum",
      "Bladder",
      "Femoral Head",
      "Bowel",
      "Penile Bulb",
    ],
    defaultOrgan: "Rectum",
    defaultTarget: "PTV",
    tcpSiteKey: "PROSTATE",
  },
];

export function getSiteById(id: string): CancerSiteDefinition | undefined {
  return CANCER_SITES.find((s) => s.id === id || s.tcpSiteKey === id);
}

export function organsForSite(
  siteId: CancerSiteId,
  role: "target" | "oar" | "all"
): string[] {
  const site = getSiteById(siteId);
  if (!site) return [];
  if (role === "target") return [...site.targets];
  if (role === "oar") return [...site.oars];
  return [...site.targets, ...site.oars];
}
