/**
 * Analysis report — HTML + plain DOCX-friendly text for export (Phase 2a).
 */

import { getProvenanceFor } from "./literature-references";
import { buildDocxFromText } from "./docx-builder";

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
  bed: number;
  eqd2: number;
  meanDose: number;
  maxDose: number;
  gEUD: number;
  doseMetricRows: { label: string; value: string; note?: string }[];
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

  const generatedAt = new Date().toISOString();
  const filenameBase = `rbGyanX_${input.patientId}_${input.structureName}`.replace(
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

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>rbGyanX Report</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#2c3e50;line-height:1.5}
h1{color:#2c3e50;border-bottom:3px solid #3498db;padding-bottom:8px}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#e8eef4}
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
<p>${escapeHtml(input.structureName)} (${input.structureType}) · Literature organ: ${escapeHtml(input.organ)}</p>
<h2>Radiobiology (${escapeHtml(prov?.modelLabel ?? input.model)})</h2>
<p><strong>${prob}</strong> · BED ${input.bed.toFixed(2)} Gy · EQD2 ${input.eqd2.toFixed(2)} Gy</p>
<p>Mean ${input.meanDose.toFixed(2)} Gy · Max ${input.maxDose.toFixed(2)} Gy · gEUD ${input.gEUD.toFixed(2)} Gy</p>
<h2>Dose metrics (QUANTEC-oriented)</h2>
<table><tr><th>Metric</th><th>Value</th><th>Note</th></tr>${metricRows}</table>
${prov?.organCitation ? `<h2>Organ guideline</h2><p>${escapeHtml(prov.organCitation)}</p>` : ""}
<h2>References</h2><ul>${refs}</ul>
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
    prob,
    `BED ${input.bed.toFixed(2)} Gy, EQD2 ${input.eqd2.toFixed(2)} Gy`,
    `Mean ${input.meanDose.toFixed(2)} Gy, Max ${input.maxDose.toFixed(2)} Gy, gEUD ${input.gEUD.toFixed(2)} Gy`,
    "",
    "Dose metrics:",
    ...input.doseMetricRows.map((r) => `  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`),
    "",
    "References:",
    ...(prov?.references ?? []).map((r) => `  - ${r.citation}`),
    "",
    "Disclaimer: Research/educational use only.",
  ];

  const docxText = docxLines.join("\n");
  const docxBuf = buildDocxFromText("rbGyanX Plan Evaluation Report", docxText);

  return {
    html,
    docxText,
    docxBase64: docxBuf.toString("base64"),
    filenameBase,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
