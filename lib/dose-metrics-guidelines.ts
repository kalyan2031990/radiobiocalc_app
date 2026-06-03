/**
 * QUANTEC / RTOG-aligned dose metric reporting for mobile rbGyanX.
 * Targets: ICRU/RTOG coverage metrics (D95, D98, D2, V95…).
 * OARs: QUANTEC-style metrics by organ class (parallel vs serial).
 */

export type DoseMetricsInput = {
  meanDose: number;
  maxDose: number;
  minDose: number;
  totalVolume?: number;
  gEUD?: number;
  d95?: number;
  d98?: number;
  d50?: number;
  d2?: number;
  v95?: number;
  v100?: number;
  v107?: number;
  vxx?: Record<number, number>;
  dxx?: Record<number, number>;
};

export type GuidelineMetricRow = {
  label: string;
  value: string;
  note?: string;
};

function fmtGy(v: number | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)} Gy`;
}

function fmtPct(v: number | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

function vAt(doseGy: number, vxx?: Record<number, number>): number | undefined {
  if (!vxx) return undefined;
  const exact = vxx[doseGy];
  if (exact != null) return exact;
  const keys = Object.keys(vxx)
    .map(Number)
    .filter((k) => k <= doseGy)
    .sort((a, b) => b - a);
  return keys.length ? vxx[keys[0]] : undefined;
}

function dAtVolPercent(pct: number, dxx?: Record<number, number>): number | undefined {
  if (!dxx) return undefined;
  return dxx[pct] ?? dxx[Math.round(pct * 10) / 10];
}

/** RTOG/ICRU-style target coverage metrics */
export function targetDoseMetricsRows(m: DoseMetricsInput): GuidelineMetricRow[] {
  const rows: GuidelineMetricRow[] = [
    { label: "D98% (near-min)", value: fmtGy(m.d98), note: "RTOG/ICRU coverage" },
    { label: "D95%", value: fmtGy(m.d95), note: "RTOG/ICRU coverage" },
    { label: "D50% (median)", value: fmtGy(m.d50), note: "ICRU reference" },
    { label: "D2% (near-max)", value: fmtGy(m.d2), note: "Hot spot (serial OAR proxy if needed)" },
    { label: "Dmean", value: fmtGy(m.meanDose), note: "Mean dose" },
    { label: "Dmax", value: fmtGy(m.maxDose), note: "Maximum dose" },
  ];
  if (m.v95 != null) {
    rows.push({ label: "V95% Rx", value: fmtPct(m.v95), note: "Volume ≥ 95% prescription" });
  }
  if (m.v100 != null) {
    rows.push({ label: "V100% Rx", value: fmtPct(m.v100), note: "Volume ≥ prescription" });
  }
  if (m.v107 != null) {
    rows.push({ label: "V107% Rx", value: fmtPct(m.v107), note: "Hot volume above Rx" });
  }
  return rows;
}

/** QUANTEC-oriented OAR metrics — organ-specific where applicable */
export function oarDoseMetricsRows(
  organ: string,
  m: DoseMetricsInput,
): GuidelineMetricRow[] {
  const organKey = organ.toLowerCase();
  const rows: GuidelineMetricRow[] = [];

  const isSerial =
    /cord|spinal|brainstem|optic|chiasm|cochlea|larynx|mandible|brachial/i.test(organKey);

  if (isSerial) {
    rows.push(
      { label: "D2% (near-max)", value: fmtGy(m.d2 ?? dAtVolPercent(2, m.dxx)), note: "QUANTEC serial OAR" },
      { label: "D0.03 cc", value: fmtGy(dAtVolPercent(0.03, m.dxx) ?? m.maxDose), note: "Max point dose (approx.)" },
      { label: "Dmax", value: fmtGy(m.maxDose), note: "Maximum dose" },
    );
  } else {
    rows.push(
      { label: "Dmean", value: fmtGy(m.meanDose), note: "QUANTEC parallel OAR (primary)" },
      { label: "Dmax", value: fmtGy(m.maxDose), note: "Maximum dose" },
    );
  }

  if (/parotid|salivary|prtd/i.test(organKey)) {
    rows.push(
      { label: "V30 Gy", value: fmtPct(vAt(30, m.vxx)), note: "QUANTEC xerostomia (V30)" },
      { label: "V25 Gy", value: fmtPct(vAt(25, m.vxx)), note: "Salivary sparing" },
    );
  }
  if (/\blung\b/i.test(organKey)) {
    rows.push(
      { label: "V20 Gy", value: fmtPct(vAt(20, m.vxx)), note: "QUANTEC pneumonitis (V20)" },
      { label: "V5 Gy", value: fmtPct(vAt(5, m.vxx)), note: "Low-dose lung volume" },
    );
  }
  if (/heart/i.test(organKey)) {
    rows.push({ label: "V25 Gy", value: fmtPct(vAt(25, m.vxx)), note: "Cardiac V25" });
  }
  if (/esoph/i.test(organKey)) {
    rows.push({ label: "V60 Gy", value: fmtPct(vAt(60, m.vxx)), note: "Esophagus V60" });
  }
  if (/rectum|bowel|bladder/i.test(organKey)) {
    rows.push(
      { label: "V75 Gy", value: fmtPct(vAt(75, m.vxx)), note: "Pelvic OAR high-dose volume" },
      { label: "V50 Gy", value: fmtPct(vAt(50, m.vxx)), note: "Pelvic OAR mid-dose volume" },
    );
  }

  if (m.gEUD != null) {
    rows.push({
      label: "gEUD (a=1)",
      value: fmtGy(m.gEUD),
      note: "Used in NTCP models",
    });
  }

  return rows;
}

export function doseMetricsRowsForEvaluation(
  structureType: "target" | "oar",
  organ: string,
  metrics: DoseMetricsInput,
): GuidelineMetricRow[] {
  return structureType === "target"
    ? targetDoseMetricsRows(metrics)
    : oarDoseMetricsRows(organ, metrics);
}
