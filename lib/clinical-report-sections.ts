/**
 * Site-specific clinical covariates for PDF/DOCX reports (opt-in; does not alter TCP/NTCP).
 */

import type { ClinicalContext, StructureRole } from "@/lib/clinical-context";
import {
  getClinicalFieldsForContext,
  groupClinicalFields,
  SECTION_LABELS,
  clinicalContextHasValues,
} from "@/lib/clinical-fields-schema";
import { getSiteById } from "@/server/sites-registry";

export type ClinicalReportRow = { label: string; value: string };
export type ClinicalReportSection = { sectionTitle: string; rows: ClinicalReportRow[] };

export function buildClinicalReportSections(
  ctx: ClinicalContext,
  siteId: string,
  role: StructureRole,
  organ: string,
): ClinicalReportSection[] {
  const site = (siteId || "UNKNOWN").toUpperCase();
  const fields = getClinicalFieldsForContext(site, role, organ);
  const grouped = groupClinicalFields(fields);
  const sections: ClinicalReportSection[] = [];

  for (const [sectionKey, sectionFields] of Object.entries(grouped)) {
    const rows: ClinicalReportRow[] = [];
    for (const f of sectionFields) {
      const v = ctx[f.id]?.trim();
      if (v) rows.push({ label: f.label, value: v });
    }
    if (rows.length > 0) {
      sections.push({
        sectionTitle: SECTION_LABELS[sectionKey] ?? sectionKey,
        rows,
      });
    }
  }
  return sections;
}

export function clinicalReportSiteLabel(siteId: string): string {
  const def = getSiteById(siteId);
  if (def) return def.label;
  if (siteId === "UNKNOWN" || !siteId) return "Not specified";
  return siteId;
}

export function clinicalReportDisclaimer(includeClinical: boolean): string {
  if (!includeClinical) return "";
  return (
    "Clinical covariates below are optional documentation for MDT traceability. " +
    "TCP/NTCP values in this report are computed from DVH and literature LQ parameters only " +
    "(clinical presets do not adjust dose–response math unless a future opt-in model is enabled)."
  );
}

export function hasClinicalContentForReport(
  ctx: ClinicalContext,
  siteId: string,
  role: StructureRole,
  organ: string,
): boolean {
  return clinicalContextHasValues(ctx) && buildClinicalReportSections(ctx, siteId, role, organ).length > 0;
}
