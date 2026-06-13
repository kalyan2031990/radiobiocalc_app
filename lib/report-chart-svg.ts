/**
 * Therapeutic-window SVG for PDF/HTML — TCP and NTCP dose–response on one dose axis.
 */

export type DoseResponseChartModel = "lkb_loglogit" | "lkb_probit" | "poisson";

const PRINT = {
  surface: "#f8fafc",
  border: "#cbd5e1",
  foreground: "#1e293b",
  muted: "#64748b",
  primary: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  background: "#ffffff",
};

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function probAtDose(
  d: number,
  td50: number,
  gamma50: number,
  model: DoseResponseChartModel,
): number {
  if (d <= 0) return 0;
  if (model === "lkb_loglogit") {
    const ratio = d / Math.max(td50, 0.1);
    return 1 / (1 + Math.pow(ratio, -4 * Math.max(gamma50, 0.01)));
  }
  if (model === "lkb_probit") {
    const m = 0.18;
    const t = (d - td50) / (m * Math.max(td50, 0.1));
    return 0.5 * (1 + erf(t / Math.sqrt(2)));
  }
  const lambda = Math.exp(-Math.exp(-(d - td50) / Math.max(5 / gamma50, 0.5)));
  return 1 - lambda;
}

export function doseResponseChartModel(model: string): DoseResponseChartModel {
  if (model === "lkb_probit" || model === "poisson") return model;
  return "lkb_loglogit";
}

export type TherapeuticWindowDoseResponseParams = {
  prescriptionDose: number;
  planTcp: number;
  planNtcp: number;
  tcpStructure: string;
  tcpOrgan: string;
  tcpModel: string;
  tcpTd50: number;
  tcpGamma: number;
  ntcpOrgan: string;
  ntcpStructure: string;
  ntcpModel: string;
  ntcpTd50: number;
  ntcpGamma: number;
};

export function generateTherapeuticWindowDoseResponseSvg(
  p: TherapeuticWindowDoseResponseParams,
): string {
  const width = 600;
  const height = 340;
  const padL = 52;
  const padR = 24;
  const padT = 36;
  const padB = 48;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const doseMax = Math.max(p.prescriptionDose * 1.35, p.tcpTd50 * 1.4, p.ntcpTd50 * 1.4, 72);
  const tcpModel = doseResponseChartModel(p.tcpModel);
  const ntcpModel = doseResponseChartModel(p.ntcpModel);

  const xAt = (d: number) => padL + (d / doseMax) * plotW;
  const yAt = (prob: number) => padT + plotH - prob * plotH;

  const tcpPts: string[] = [];
  const ntcpPts: string[] = [];
  const windowPts: string[] = [];
  const steps = 48;

  for (let i = 0; i <= steps; i++) {
    const d = (doseMax * i) / steps;
    const tcp = Math.min(1, Math.max(0, probAtDose(d, p.tcpTd50, p.tcpGamma, tcpModel)));
    const ntcp = Math.min(1, Math.max(0, probAtDose(d, p.ntcpTd50, p.ntcpGamma, ntcpModel)));
    tcpPts.push(`${i === 0 ? "M" : "L"}${xAt(d).toFixed(1)},${yAt(tcp).toFixed(1)}`);
    ntcpPts.push(`${i === 0 ? "M" : "L"}${xAt(d).toFixed(1)},${yAt(ntcp).toFixed(1)}`);
    if (tcp > ntcp) {
      windowPts.push(`${windowPts.length === 0 ? "M" : "L"}${xAt(d).toFixed(1)},${yAt(tcp).toFixed(1)}`);
    }
  }
  for (let i = steps; i >= 0; i--) {
    const d = (doseMax * i) / steps;
    const ntcp = Math.min(1, Math.max(0, probAtDose(d, p.ntcpTd50, p.ntcpGamma, ntcpModel)));
    windowPts.push(`L${xAt(d).toFixed(1)},${yAt(ntcp).toFixed(1)}`);
  }
  windowPts.push("Z");

  const rx = p.prescriptionDose;
  const planTcpY = yAt(Math.min(1, Math.max(0, p.planTcp)));
  const planNtcpY = yAt(Math.min(1, Math.max(0, p.planNtcp)));
  const rxX = xAt(rx);

  const gridH = [0, 0.25, 0.5, 0.75, 1]
    .map((v) => {
      const y = yAt(v);
      return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${PRINT.border}" stroke-width="0.5" stroke-dasharray="3,4"/>
<text x="${padL - 6}" y="${y + 4}" font-size="10" fill="${PRINT.muted}" text-anchor="end">${(v * 100).toFixed(0)}%</text>`;
    })
    .join("");

  const tickDoses = [0, doseMax * 0.25, doseMax * 0.5, doseMax * 0.75, doseMax].map((v) =>
    Math.round(v),
  );
  const gridV = tickDoses
    .map((d) => `<text x="${xAt(d)}" y="${height - padB + 20}" font-size="10" fill="${PRINT.muted}" text-anchor="middle">${d}</text>`)
    .join("");

  const caption =
    `Rx ${rx.toFixed(1)} Gy · TCP ${(p.planTcp * 100).toFixed(1)}% (${p.tcpStructure}) · ` +
    `NTCP ${(p.planNtcp * 100).toFixed(1)}% (${p.ntcpStructure})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Therapeutic window dose response">
<rect x="0" y="0" width="${width}" height="${height}" fill="${PRINT.surface}" rx="8"/>
${gridH}
${gridV}
<path d="${windowPts.join("")}" fill="${PRINT.success}" opacity="0.12"/>
<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${PRINT.foreground}" stroke-width="2"/>
<line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="${PRINT.foreground}" stroke-width="2"/>
<path d="${tcpPts.join("")}" stroke="${PRINT.success}" stroke-width="2.5" fill="none"/>
<path d="${ntcpPts.join("")}" stroke="${PRINT.error}" stroke-width="2.5" fill="none"/>
<line x1="${rxX}" y1="${padT}" x2="${rxX}" y2="${padT + plotH}" stroke="${PRINT.primary}" stroke-width="1.5" stroke-dasharray="5,4"/>
<circle cx="${rxX}" cy="${planTcpY}" r="6" fill="${PRINT.success}" stroke="${PRINT.background}" stroke-width="2"/>
<circle cx="${rxX}" cy="${planNtcpY}" r="6" fill="${PRINT.error}" stroke="${PRINT.background}" stroke-width="2"/>
<text x="${rxX + 4}" y="${padT + 12}" font-size="10" fill="${PRINT.primary}" font-weight="bold">Rx</text>
<text x="${width / 2}" y="${height - 6}" font-size="12" fill="${PRINT.foreground}" text-anchor="middle" font-weight="bold">Dose (Gy)</text>
<text x="16" y="${height / 2}" font-size="12" fill="${PRINT.foreground}" text-anchor="middle" font-weight="bold" transform="rotate(-90 16 ${height / 2})">Probability (%)</text>
<text x="${padL}" y="22" font-size="11" fill="${PRINT.muted}">${caption}</text>
<rect x="${width - padR - 168}" y="${padT}" width="164" height="62" fill="${PRINT.background}" stroke="${PRINT.border}" rx="4"/>
<text x="${width - padR - 158}" y="${padT + 16}" font-size="10" fill="${PRINT.foreground}" font-weight="bold">Legend</text>
<line x1="${width - padR - 158}" y1="${padT + 28}" x2="${width - padR - 138}" y2="${padT + 28}" stroke="${PRINT.success}" stroke-width="2.5"/>
<text x="${width - padR - 132}" y="${padT + 32}" font-size="10" fill="${PRINT.muted}">TCP · ${p.tcpOrgan}</text>
<line x1="${width - padR - 158}" y1="${padT + 44}" x2="${width - padR - 138}" y2="${padT + 44}" stroke="${PRINT.error}" stroke-width="2.5"/>
<text x="${width - padR - 132}" y="${padT + 48}" font-size="10" fill="${PRINT.muted}">NTCP · ${p.ntcpOrgan}</text>
<text x="${padL}" y="${height - 18}" font-size="10" fill="${PRINT.muted}">Shaded band = TCP &gt; limiting OAR NTCP (literature sigmoid curves)</text>
</svg>`;
}
