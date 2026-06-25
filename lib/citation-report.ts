/**
 * Citation-first report sections (F5).
 */

import {
  collectCitationsForStructures,
  getLibraryEntryForOrganModel,
  getModelLabel,
  type ParameterLibraryEntry,
} from "@/lib/parameter-library";
import { getProvenanceFor } from "@/server/literature-references";

export type CitationReportItem = {
  organ: string;
  model: string;
  modelLabel: string;
  parameters: Record<string, number>;
  ci95Text?: string;
  citation: string;
  doi?: string;
  pmid?: string;
};

function formatCi(entry: ParameterLibraryEntry): string | undefined {
  if (!entry.ci95 || Object.keys(entry.ci95).length === 0) return undefined;
  const parts = Object.entries(entry.ci95).map(
    ([k, v]) => `${k} [${v.low}–${v.high}]`,
  );
  return parts.length ? `95% CI: ${parts.join("; ")}` : undefined;
}

export function buildCitationReportItems(
  structures: Array<{ organ: string; model: string; structureName?: string }>,
): CitationReportItem[] {
  const entries = collectCitationsForStructures(structures);
  return entries.map((e) => ({
    organ: e.organ,
    model: e.model,
    modelLabel: getModelLabel(e.model),
    parameters: { ...e.parameters } as Record<string, number>,
    ci95Text: formatCi(e),
    citation: `${e.citation.authors} ${e.citation.title}. ${e.citation.journal}. ${e.citation.year}.`,
    doi: e.citation.doi,
    pmid: e.citation.pmid,
  }));
}

export function citationReportHtmlSection(items: CitationReportItem[]): string {
  if (!items.length) return "";
  const rows = items
    .map((it) => {
      const paramStr = Object.entries(it.parameters)
        .filter(([k]) => ["td50", "d50", "gamma50", "gamma", "m", "n", "alphaBeta"].includes(k))
        .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`)
        .join(", ");
      const ci = it.ci95Text ? `<br/><em>${escapeHtml(it.ci95Text)}</em>` : "";
      const link = it.doi
        ? `<br/>DOI: ${escapeHtml(it.doi)}`
        : it.pmid
          ? `<br/>PMID: ${escapeHtml(it.pmid)}`
          : "";
      return `<li><strong>${escapeHtml(it.organ)}</strong> — ${escapeHtml(it.modelLabel)}<br/>${escapeHtml(paramStr)}${ci}<br/>${escapeHtml(it.citation)}${link}</li>`;
    })
    .join("");
  return `<h2>Parameters &amp; references</h2><p>Each model parameter set used in this calculation, with primary literature citation.</p><ul>${rows}</ul>`;
}

export function citationReportTextSection(items: CitationReportItem[]): string {
  if (!items.length) return "";
  const lines = [
    "",
    "Parameters & references",
    "─────────────────────",
    ...items.map((it) => {
      const prov = getProvenanceFor(it.organ, it.model);
      const paramStr = prov
        ? Object.entries(prov.parameters)
            .filter(([k]) => ["td50", "d50", "gamma50", "m", "n"].includes(k))
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")
        : "";
      return [
        `${it.organ} — ${it.modelLabel}`,
        `  ${paramStr}`,
        it.ci95Text ? `  ${it.ci95Text}` : "",
        `  ${it.citation}`,
        it.doi ? `  https://doi.org/${it.doi}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ];
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function structuresFromCompositeEval(
  structureResults: Array<{
    structureName: string;
    literatureOrgan: string | null;
    model: string;
  }>,
): Array<{ organ: string; model: string; structureName: string }> {
  return structureResults
    .filter((s) => s.literatureOrgan)
    .map((s) => ({
      organ: s.literatureOrgan!,
      model: s.model,
      structureName: s.structureName,
    }));
}

export function provenanceForStructure(
  organ: string,
  model: string,
): ParameterLibraryEntry | null {
  return getLibraryEntryForOrganModel(organ, model) ?? null;
}
