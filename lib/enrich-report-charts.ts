/**
 * Attach therapeutic-window dose–response chart to report input (one plot only).
 */
import type { AnalysisReportInput } from "@/server/analysis-report";
import {
  generateTherapeuticWindowDoseResponseSvg,
  type TherapeuticWindowDoseResponseParams,
} from "@/lib/report-chart-svg";

export function attachReportCharts(input: AnalysisReportInput): AnalysisReportInput {
  const p = input.therapeuticWindowChartParams;
  if (!p || !input.isCompositePlan) return input;

  input.therapeuticWindowChartSvg = generateTherapeuticWindowDoseResponseSvg(p);
  input.therapeuticWindowChartCaption =
    "Therapeutic window — PTV TCP (green) vs composite NTCP max OAR (red) at prescription; TWI annotated";
  return input;
}

export function chartDocxSummaryLines(input: AnalysisReportInput): string[] {
  if (!input.therapeuticWindowChartSvg) return [];
  const p = input.therapeuticWindowChartParams;
  const lines = [
    input.therapeuticWindowChartCaption ??
      "Therapeutic window plot (see PDF/HTML for chart)",
  ];
  if (p) {
    lines.push(
      `  Rx ${p.prescriptionDose.toFixed(1)} Gy · TCP ${(p.planTcp * 100).toFixed(1)}% · NTCP ${(p.planNtcp * 100).toFixed(1)}%`,
    );
    lines.push(`  TCP model: ${p.tcpStructure} (${p.tcpOrgan}) · NTCP: ${p.ntcpStructure} (${p.ntcpOrgan})`);
  }
  return lines;
}

export type { TherapeuticWindowDoseResponseParams };
