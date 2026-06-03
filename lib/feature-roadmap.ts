/**
 * In-app feature roadmap — update as releases ship (no store redeploy for copy-only if using OTA later).
 */

export type RoadmapItemStatus = "shipped" | "in_progress" | "planned";

export type RoadmapItem = {
  id: string;
  title: string;
  status: RoadmapItemStatus;
  note?: string;
};

export const MOBILE_FEATURE_ROADMAP: RoadmapItem[] = [
  {
    id: "dvh-import",
    title: "DVH import (CSV/TXT, composite structures)",
    status: "shipped",
  },
  {
    id: "tcp-ntcp",
    title: "TCP/NTCP with literature parameters (QUANTEC-aligned)",
    status: "shipped",
  },
  {
    id: "therapeutic-window",
    title: "Therapeutic window (UTCP, P+, TWI) + fractionation-aware indices",
    status: "shipped",
  },
  {
    id: "rb-x-explain",
    title: "rb X explainability (single-plan, citation-linked)",
    status: "shipped",
  },
  {
    id: "reports",
    title: "PDF/DOCX plan evaluation reports",
    status: "shipped",
  },
  {
    id: "help-guide",
    title: "In-app user help & worked examples",
    status: "planned",
    note: "Document not created yet — see Product & validation screen.",
  },
  {
    id: "theme-polish",
    title: "Brand theme, logos, contrast pass",
    status: "in_progress",
  },
  {
    id: "validation-pack",
    title: "Published validation package (benchmark cases vs Python/desktop)",
    status: "planned",
  },
  {
    id: "dicom-mobile",
    title: "On-device DICOM import",
    status: "planned",
    note: "Use desktop rbGyanX for cohort DICOM + XAI today.",
  },
  {
    id: "benchmark-suite",
    title: "20–50 locked benchmark cases in automated test cycle",
    status: "planned",
  },
];
