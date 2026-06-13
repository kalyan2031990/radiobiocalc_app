/**
 * Enrich PDF/DOCX export with full composite-plan evaluation from a stored DVH session.
 */

export type {
  CompositeReportExtras,
  CompositeReportStructureRow,
} from "@/lib/export-report-composite";
export { buildCompositeReportExtrasFromBundle } from "@/lib/export-report-composite";

export async function buildCompositeReportExtras(
  dvhSessionId: string | undefined,
  options: {
    totalDose: number;
    numFractions: number;
    cancerSite: string;
    technique: string;
  },
): Promise<import("@/lib/export-report-composite").CompositeReportExtras | null> {
  if (!dvhSessionId) return null;
  const { loadDvhSession } = await import("@/lib/dvh-session");
  const { buildCompositeReportExtrasFromBundle } = await import("@/lib/export-report-composite");
  const bundle = await loadDvhSession(dvhSessionId);
  if (!bundle) return null;
  return buildCompositeReportExtrasFromBundle(bundle, options);
}
