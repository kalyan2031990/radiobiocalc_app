/**
 * Analysis report — HTML + plain DOCX-friendly text for export (Phase 2a).
 */

import { getProvenanceFor } from "./literature-references";
import { buildDocxFromText } from "./docx-builder";
import { bytesToBase64 } from "../lib/base64-bytes";
import {
  clinicalReportDisclaimer,
  clinicalReportSiteLabel,
  type ClinicalReportSection,
} from "../lib/clinical-report-sections";
import { chartDocxSummaryLines } from "../lib/enrich-report-charts";
import {
  buildCitationReportItems,
  citationReportHtmlSection,
  citationReportTextSection,
} from "../lib/citation-report";

export type AnalysisReportInput = {
  patientId: string;
  planLabel: string;
  organ: string;
  structureName: string;
  structureType: "target" | "oar";
  model: string;
  cancerSite: string;
  technique: string;
  totalDose: number;
  numFractions: number;
  tcp?: number;
  ntcp?: number;
  /** When covariate adjustment applied */
  baseTcp?: number;
  baseNtcp?: number;
  covariatesApplied?: boolean;
  clinicalDataNote?: string;
  bed: number;
  eqd2: number;
  meanDose: number;
  maxDose: number;
  gEUD: number;
  doseMetricRows: { label: string; value: string; note?: string }[];
  /** Opt-in: site- and structure-specific clinical presets in PDF/DOCX */
  includeClinicalInReport?: boolean;
  clinicalSections?: ClinicalReportSection[];
  /** Full composite plan (all structures from DVH session) */
  isCompositePlan?: boolean;
  structureCount?: number;
  primaryStructureName?: string;
  compositeStructures?: Array<{
    structureName: string;
    structureType: "target" | "oar";
    organ: string;
    model: string;
    probabilityLabel: string;
    meanDose: string;
    maxDose: string;
    d95: string;
    doseMetricRows: { label: string; value: string; note?: string }[];
    modelProbes?: Array<{ model: string; label: string; valuePct: number; isDefault: boolean }>;
    covariateNote?: string;
  }>;
  planIndexRows?: { label: string; value: string; note?: string }[];
  therapeuticSummaryLines?: string[];
  abbreviationNotes?: string[];
  /** Composite plan therapeutic window (uncapped TCP, composite NTCP). */
  planTherapeuticTcp?: number;
  planTherapeuticNtcp?: number;
  therapeuticWindowChartParams?: import("../lib/report-chart-svg").TherapeuticWindowDoseResponseParams;
  therapeuticWindowChartSvg?: string;
  therapeuticWindowChartCaption?: string;
};

export type AnalysisReportOutput = {
  html: string;
  docxText: string;
  docxBase64: string;
  filenameBase: string;
};

export function buildAnalysisReport(input: AnalysisReportInput): AnalysisReportOutput {
  const prov = getProvenanceFor(input.organ, input.model);
  const prob =
    input.structureType === "target"
      ? input.tcp != null
        ? `TCP ${(input.tcp * 100).toFixed(1)}%`
        : "TCP —"
      : input.ntcp != null
        ? `NTCP ${(input.ntcp * 100).toFixed(1)}%`
        : "NTCP —";

  const covariateNote =
    input.covariatesApplied && input.structureType === "target" && input.baseTcp != null && input.tcp != null
      ? ` (base ${(input.baseTcp * 100).toFixed(1)}% — TCP covariate term inactive at ceiling when base ≥99.5%)`
      : input.covariatesApplied && input.structureType === "oar" && input.baseNtcp != null && input.ntcp != null
        ? ` (base ${(input.baseNtcp * 100).toFixed(1)}% → adjusted ${(input.ntcp * 100).toFixed(1)}%)`
        : "";

  const clinicalSourceLine = input.clinicalDataNote
    ? `<p><em>Clinical data: ${escapeHtml(input.clinicalDataNote)}</em></p>`
    : "";

  const generatedAt = new Date().toISOString();
  const filenameSuffix = input.isCompositePlan ? "composite" : input.structureName;
  const filenameBase = `rbGyanX_${input.patientId}_${filenameSuffix}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );

  const metricRows = input.doseMetricRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td><td>${escapeHtml(r.note ?? "")}</td></tr>`,
    )
    .join("");

  const refs = (prov?.references ?? [])
    .map((r) => `<li>${escapeHtml(r.citation)}</li>`)
    .join("");

  const compositeCiteItems =
    input.isCompositePlan && input.compositeStructures?.length
      ? buildCitationReportItems(
          input.compositeStructures.map((s) => ({
            organ: s.organ,
            model: s.model,
            structureName: s.structureName,
          })),
        )
      : buildCitationReportItems([{ organ: input.organ, model: input.model, structureName: input.structureName }]);
  const paramsRefsHtml = citationReportHtmlSection(compositeCiteItems);
  const paramsRefsDocx = citationReportTextSection(compositeCiteItems);

  const includeClinical = input.includeClinicalInReport === true;
  const clinicalHtml = includeClinical
    ? formatClinicalHtml(
        input.clinicalSections ?? [],
        input.cancerSite,
        includeClinical,
        input.covariatesApplied,
      )
    : "";
  const clinicalDocx = includeClinical
    ? formatClinicalDocx(
        input.clinicalSections ?? [],
        input.cancerSite,
        includeClinical,
        input.covariatesApplied,
      )
    : [];

  const compositeHtml = formatCompositeHtml(input);
  const compositeDocx = formatCompositeDocx(input);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>rbGyanX Report</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#2c3e50;line-height:1.5}
h1{color:#2c3e50;border-bottom:3px solid #3498db;padding-bottom:8px}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#e8eef4}
.chart-block{margin:20px 0;text-align:center}
.chart-block svg{max-width:100%;height:auto}
.disclaimer{font-size:11px;color:#666;margin-top:24px}
</style></head><body>
<h1>rbGyanX — Plan Evaluation Report</h1>
<p><strong>One Patient · One Plan · Complete Evaluation</strong></p>
<p>Generated: ${escapeHtml(generatedAt)}</p>
<h2>Patient / Plan</h2>
<p>Patient ID: ${escapeHtml(input.patientId)}<br/>
Plan: ${escapeHtml(input.planLabel)}<br/>
Site: ${escapeHtml(input.cancerSite)} · Technique: ${escapeHtml(input.technique)}<br/>
Fractionation: ${input.totalDose} Gy / ${input.numFractions} fx</p>
<h2>Structure</h2>
<p>${escapeHtml(input.structureName)} (${input.structureType}) · Literature organ: ${escapeHtml(input.organ)}${input.isCompositePlan && input.structureCount ? ` · Composite plan (${input.structureCount} structures)` : ""}</p>
<h2>Radiobiology (${escapeHtml(prov?.modelLabel ?? input.model)})</h2>
<p><strong>${prob}${covariateNote}</strong> · BED ${input.bed.toFixed(2)} Gy · EQD2 ${input.eqd2.toFixed(2)} Gy</p>
${clinicalSourceLine}
<p>Mean ${input.meanDose.toFixed(2)} Gy · Max ${input.maxDose.toFixed(2)} Gy · gEUD ${input.gEUD.toFixed(2)} Gy</p>
<h2>Dose metrics (QUANTEC-oriented)</h2>
<table><tr><th>Metric</th><th>Value</th><th>Note</th></tr>${metricRows}</table>
${formatChartsHtml(input)}
${compositeHtml}
${formatAbbreviationsHtml(input)}
${clinicalHtml}
${prov?.organCitation ? `<h2>Organ guideline</h2><p>${escapeHtml(prov.organCitation)}</p>` : ""}
${paramsRefsHtml}
<h2>Model references</h2><ul>${refs}</ul>
<p class="disclaimer">Research and educational tool only — not for primary clinical decisions. Verify against institutional protocols.</p>
</body></html>`;

  const docxLines = [
    "rbGyanX — Plan Evaluation Report",
    "One Patient . One Plan . Complete Evaluation",
    `Generated: ${generatedAt}`,
    "",
    `Patient: ${input.patientId}`,
    `Plan: ${input.planLabel}`,
    `${input.cancerSite} / ${input.technique} / ${input.totalDose} Gy / ${input.numFractions} fx`,
    "",
    `Structure: ${input.structureName} (${input.structureType})`,
    `Organ: ${input.organ}`,
    `Model: ${prov?.modelLabel ?? input.model}`,
    `${prob}${covariateNote}`,
    `BED ${input.bed.toFixed(2)} Gy, EQD2 ${input.eqd2.toFixed(2)} Gy`,
    `Mean ${input.meanDose.toFixed(2)} Gy, Max ${input.maxDose.toFixed(2)} Gy, gEUD ${input.gEUD.toFixed(2)} Gy`,
    "",
    "Dose metrics:",
    ...input.doseMetricRows.map((r) => `  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`),
    "",
    ...(() => {
      const chartLines = chartDocxSummaryLines(input);
      return chartLines.length
        ? ["Visualizations:", ...chartLines, ""]
        : [];
    })(),
    ...compositeDocx,
    ...(input.abbreviationNotes?.length
      ? ["Abbreviations & formulas:", ...input.abbreviationNotes.map((n) => `  ${n}`), ""]
      : []),
    ...(compositeDocx.length ? [""] : []),
    ...clinicalDocx,
    ...(clinicalDocx.length ? [""] : []),
    paramsRefsDocx,
    "Model references:",
    ...(prov?.references ?? []).map((r) => `  - ${r.citation}`),
    "",
    "Disclaimer: Research/educational use only.",
  ];

  const docxText = docxLines.join("\n");
  const docxBuf = buildDocxFromText("rbGyanX Plan Evaluation Report", docxText);

  return {
    html,
    docxText,
    docxBase64: bytesToBase64(docxBuf),
    filenameBase,
  };
}

function formatAbbreviationsHtml(input: AnalysisReportInput): string {
  const notes = input.abbreviationNotes ?? [];
  if (!notes.length) return "";
  const items = notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
  return `<h2>Abbreviations &amp; formulas</h2><ul style="font-size:12px">${items}</ul>`;
}

function formatChartsHtml(input: AnalysisReportInput): string {
  if (!input.therapeuticWindowChartSvg) return "";
  return (
    `<h2>${escapeHtml(input.therapeuticWindowChartCaption ?? "Therapeutic window")}</h2>` +
    `<div class="chart-block">${input.therapeuticWindowChartSvg}</div>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatClinicalHtml(
  sections: ClinicalReportSection[],
  cancerSite: string,
  includeClinical: boolean,
  covariatesApplied?: boolean,
): string {
  const disclaimer = clinicalReportDisclaimer(includeClinical, covariatesApplied);
  const siteLabel = clinicalReportSiteLabel(cancerSite);
  let body = `<h2>Clinical context (opt-in)</h2>
<p><em>Cancer site: ${escapeHtml(siteLabel)}</em></p>
<p class="disclaimer" style="font-size:12px">${escapeHtml(disclaimer)}</p>`;

  if (sections.length === 0) {
    body += `<p><em>No clinical fields entered for this site and structure.</em></p>`;
    return body;
  }

  for (const sec of sections) {
    const rows = sec.rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`,
      )
      .join("");
    body += `<h3>${escapeHtml(sec.sectionTitle)}</h3>
<table><tr><th>Field</th><th>Value</th></tr>${rows}</table>`;
  }
  return body;
}

function formatClinicalDocx(
  sections: ClinicalReportSection[],
  cancerSite: string,
  includeClinical: boolean,
  covariatesApplied?: boolean,
): string[] {
  const lines: string[] = [
    "Clinical context (opt-in)",
    `Cancer site: ${clinicalReportSiteLabel(cancerSite)}`,
    clinicalReportDisclaimer(includeClinical, covariatesApplied),
    "",
  ];
  if (sections.length === 0) {
    lines.push("(No clinical fields entered for this site and structure.)", "");
    return lines;
  }
  for (const sec of sections) {
    lines.push(sec.sectionTitle);
    for (const r of sec.rows) {
      lines.push(`  ${r.label}: ${r.value}`);
    }
    lines.push("");
  }
  return lines;
}

function formatCompositeHtml(input: AnalysisReportInput): string {
  if (!input.isCompositePlan || !input.compositeStructures?.length) return "";

  const summaryRows = input.compositeStructures
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.structureName)}</td><td>${s.structureType}</td>` +
        `<td>${escapeHtml(s.organ)}</td><td>${escapeHtml(s.model)}</td>` +
        `<td>${escapeHtml(s.probabilityLabel)}</td><td>${escapeHtml(s.meanDose)}</td>` +
        `<td>${escapeHtml(s.maxDose)}</td><td>${escapeHtml(s.d95)}</td></tr>`,
    )
    .join("");

  let body = `<h2>Composite plan — all structures</h2>
<p>Primary target: ${escapeHtml(input.primaryStructureName ?? "—")}</p>
<table><tr><th>Structure</th><th>Type</th><th>Organ</th><th>Model</th><th>TCP/NTCP</th><th>Dmean</th><th>Dmax</th><th>D95</th></tr>${summaryRows}</table>`;

  for (const s of input.compositeStructures) {
    const rows = s.doseMetricRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td><td>${escapeHtml(r.note ?? "")}</td></tr>`,
      )
      .join("");
    body += `<h3>${escapeHtml(s.structureName)} — physical indices (${escapeHtml(s.organ)})</h3>
<table><tr><th>Metric</th><th>Value</th><th>Note</th></tr>${rows}</table>`;
    if (s.modelProbes?.length) {
      const mp = s.modelProbes
        .map((m) => {
          const val = `${m.valuePct.toFixed(1)}%${m.isDefault ? " *" : ""}`;
          return `<tr><td>${escapeHtml(m.label)}</td><td>${escapeHtml(val)}</td></tr>`;
        })
        .join("");
      body += `<h4>Model comparison — ${escapeHtml(s.structureName)}</h4>
<p><em>* default model for composite TWI/UTCP</em></p>
<table><tr><th>Model</th><th>${s.structureType === "target" ? "TCP" : "NTCP"}</th></tr>${mp}</table>`;
    }
    if (s.covariateNote) {
      body += `<p class="disclaimer" style="font-size:11px"><em>${escapeHtml(s.covariateNote)}</em></p>`;
    }
  }

  if (input.planIndexRows?.length) {
    const piRows = input.planIndexRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td><td>${escapeHtml(r.note ?? "")}</td></tr>`,
      )
      .join("");
    body += `<h2>Target plan indices</h2>
<table><tr><th>Index</th><th>Value</th><th>Note</th></tr>${piRows}</table>`;
  }

  if (input.therapeuticSummaryLines?.length) {
    body += `<h2>Therapeutic window</h2><ul>${input.therapeuticSummaryLines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join("")}</ul>`;
  }

  return body;
}

function formatCompositeDocx(input: AnalysisReportInput): string[] {
  if (!input.isCompositePlan || !input.compositeStructures?.length) return [];

  const lines: string[] = [
    "Composite plan — all structures",
    `Primary target: ${input.primaryStructureName ?? "—"}`,
    "",
    "Structure summary:",
  ];

  for (const s of input.compositeStructures) {
    lines.push(
      `  ${s.structureName} (${s.structureType}) · ${s.organ} · ${s.model} · ${s.probabilityLabel} · Dmean ${s.meanDose} · Dmax ${s.maxDose} · D95 ${s.d95}`,
    );
  }
  lines.push("");

  for (const s of input.compositeStructures) {
    lines.push(`${s.structureName} — physical indices:`);
    for (const r of s.doseMetricRows) {
      lines.push(`  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`);
    }
    lines.push("");
  }

  if (input.planIndexRows?.length) {
    lines.push("Target plan indices:");
    for (const r of input.planIndexRows) {
      lines.push(`  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`);
    }
    lines.push("");
  }

  if (input.therapeuticSummaryLines?.length) {
    lines.push("Therapeutic window:");
    for (const l of input.therapeuticSummaryLines) {
      lines.push(`  ${l}`);
    }
    lines.push("");
  }

  return lines;
}
