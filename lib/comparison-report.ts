/**
 * A-vs-B comparison report HTML / DOCX text (F1).
 */

import type { PlanCompareResult } from "@/lib/plan-compare";
import { citationReportHtmlSection, citationReportTextSection, buildCitationReportItems, structuresFromCompositeEval } from "@/lib/citation-report";
import { buildDocxFromText } from "@/server/docx-builder";
import { bytesToBase64 } from "@/lib/base64-bytes";

function pct(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function gy(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)} Gy`;
}

function deltaPct(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const pp = v * 100;
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)} pp`;
}

function deltaGy(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)} Gy`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildComparisonReport(result: PlanCompareResult): {
  html: string;
  docxText: string;
  docxBase64: string;
  filenameBase: string;
} {
  const { labelA, labelB, compositeRows, structureRows } = result;
  const generatedAt = new Date().toISOString();
  const filenameBase = `rbGyanX_compare_${labelA}_vs_${labelB}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const compositeHtml = compositeRows
    .map((r) => {
      const fmtA = r.key === "d95" ? gy(r.planA) : r.key === "tci" ? `${r.planA.toFixed(1)}%` : pct(r.planA);
      const fmtB = r.key === "d95" ? gy(r.planB) : r.key === "tci" ? `${r.planB.toFixed(1)}%` : pct(r.planB);
      const fmtD = r.key === "d95" ? deltaGy(r.delta) : r.key === "tci" ? `${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}%` : deltaPct(r.delta);
      return `<tr><td>${escapeHtml(r.label)}</td><td>${fmtA}</td><td>${fmtB}</td><td>${fmtD}</td><td>${r.better}</td></tr>`;
    })
    .join("");

  const structHtml = structureRows
    .map((row) => {
      const cells = [
        escapeHtml(row.structureName),
        row.planA.geud.toFixed(1),
        row.planB.geud.toFixed(1),
        row.delta.geud.toFixed(1),
        row.planA.ntcp != null ? pct(row.planA.ntcp) : "—",
        row.planB.ntcp != null ? pct(row.planB.ntcp) : "—",
        row.delta.ntcp != null ? deltaPct(row.delta.ntcp) : "—",
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const citeItems = buildCitationReportItems([
    ...structuresFromCompositeEval(result.planA.structureResults),
    ...structuresFromCompositeEval(result.planB.structureResults),
  ]);
  const citeHtml = citationReportHtmlSection(citeItems);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>rbGyanX Plan Comparison</title>
<style>body{font-family:DejaVu Sans,Helvetica,sans-serif;margin:24px;color:#1a2332}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:12px}
th{background:#e8eef4}</style></head><body>
<h1>rbGyanX — Plan comparison</h1>
<p><em>Generated ${generatedAt}</em></p>
<p>${escapeHtml(labelA)} vs ${escapeHtml(labelB)} (Δ = B − A)</p>
<h2>Composite metrics</h2>
<table><tr><th>Metric</th><th>${escapeHtml(labelA)}</th><th>${escapeHtml(labelB)}</th><th>Δ</th><th>Better</th></tr>${compositeHtml}</table>
<h2>Per-structure (gEUD, NTCP)</h2>
<table><tr><th>Structure</th><th>gEUD A</th><th>gEUD B</th><th>Δ gEUD</th><th>NTCP A</th><th>NTCP B</th><th>Δ NTCP</th></tr>${structHtml}</table>
${citeHtml}
<p><small>Advisory only — not for autonomous treatment decisions.</small></p>
</body></html>`;

  const docxLines = [
    "rbGyanX — Plan comparison",
    `${labelA} vs ${labelB} (Δ = B − A)`,
    "",
    "Composite metrics",
    ...compositeRows.map(
      (r) =>
        `${r.label}: A=${r.planA.toFixed(3)} B=${r.planB.toFixed(3)} Δ=${r.delta.toFixed(3)} (${r.better})`,
    ),
    "",
    "Per-structure",
    ...structureRows.map(
      (row) =>
        `${row.structureName}: gEUD ${row.planA.geud.toFixed(1)} → ${row.planB.geud.toFixed(1)} (Δ ${row.delta.geud.toFixed(1)})`,
    ),
    citationReportTextSection(citeItems),
  ];
  const docxText = docxLines.join("\n");
  const docxBase64 = bytesToBase64(buildDocxFromText("rbGyanX Plan Comparison", docxText));

  return { html, docxText, docxBase64, filenameBase };
}
