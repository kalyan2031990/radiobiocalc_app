/**
 * Full QUANTEC / RTOG physical metrics by technique profile.
 */
import type { DVHPoint } from "@/lib/dvh-bundle-types";
import type { GuidelineMetricRow } from "@/lib/dose-metrics-guidelines";
import {
  cumulativeDosePercentile,
  volumePercentAtLeast,
} from "@/lib/plan-dosimetric-indices";
import {
  inferTechniqueProfile,
  type PlanIndexContext,
} from "@/lib/plan-index-applicability";

function fmtGy(v: number): string {
  return `${v.toFixed(1)} Gy`;
}
function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function targetPhysicalMetricsFromDvh(
  dvh: DVHPoint[],
  prescriptionGy: number,
  ctx: PlanIndexContext,
): GuidelineMetricRow[] {
  const profile = inferTechniqueProfile(ctx);
  const rows: GuidelineMetricRow[] = [
    { label: "D98%", value: fmtGy(cumulativeDosePercentile(dvh, 98)), note: "RTOG/ICRU near-min" },
    { label: "D95%", value: fmtGy(cumulativeDosePercentile(dvh, 95)), note: "RTOG/ICRU coverage" },
    { label: "D50% (median)", value: fmtGy(cumulativeDosePercentile(dvh, 50)), note: "ICRU reference" },
    { label: "D2% (near-max)", value: fmtGy(cumulativeDosePercentile(dvh, 2)), note: "Hot spot" },
    { label: "V95% Rx", value: fmtPct(volumePercentAtLeast(dvh, prescriptionGy * 0.95)), note: "≥95% prescription" },
    { label: "V100% Rx (TCI)", value: fmtPct(volumePercentAtLeast(dvh, prescriptionGy)), note: "Target coverage" },
    { label: "V107% Rx", value: fmtPct(volumePercentAtLeast(dvh, prescriptionGy * 1.07)), note: "Hot volume" },
  ];
  if (profile === "sbrt" || ctx.technique?.toUpperCase() === "SBRT") {
    rows.push(
      { label: "V50% Rx", value: fmtPct(volumePercentAtLeast(dvh, prescriptionGy * 0.5)), note: "SBRT mid-dose" },
      { label: "D10%", value: fmtGy(cumulativeDosePercentile(dvh, 10)), note: "SBRT heterogeneity" },
    );
  }
  if (profile === "conventional" || profile === "hypofractionated") {
    rows.push(
      { label: "V90% Rx", value: fmtPct(volumePercentAtLeast(dvh, prescriptionGy * 0.9)), note: "IMRT/VMAT coverage" },
    );
  }
  return rows;
}

export function oarPhysicalMetricsFromDvh(
  dvh: DVHPoint[],
  organ: string,
  ctx: PlanIndexContext,
): GuidelineMetricRow[] {
  const organKey = organ.toLowerCase();
  const isSerial =
    /cord|spinal|brainstem|optic|chiasm|cochlea|larynx|mandible|brachial/i.test(organKey);
  const rows: GuidelineMetricRow[] = [];

  if (isSerial) {
    rows.push(
      { label: "D2% (near-max)", value: fmtGy(cumulativeDosePercentile(dvh, 2)), note: "QUANTEC serial" },
      { label: "D0.03 cc", value: fmtGy(cumulativeDosePercentile(dvh, 0.03)), note: "Max point dose" },
      { label: "Dmax", value: fmtGy(cumulativeDosePercentile(dvh, 0)), note: "Maximum dose" },
    );
  } else {
    rows.push(
      { label: "Dmean", value: fmtGy(meanDoseFromDvh(dvh)), note: "QUANTEC parallel (primary)" },
      { label: "D50%", value: fmtGy(cumulativeDosePercentile(dvh, 50)), note: "Median dose" },
      { label: "Dmax", value: fmtGy(cumulativeDosePercentile(dvh, 0)), note: "Maximum dose" },
    );
  }

  const vDoses: { dose: number; label: string; note: string }[] = [];
  if (/parotid|salivary|prtd/i.test(organKey)) {
    vDoses.push(
      { dose: 30, label: "V30 Gy", note: "Xerostomia (QUANTEC)" },
      { dose: 25, label: "V25 Gy", note: "Salivary sparing" },
      { dose: 20, label: "V20 Gy", note: "Moderate dose bath" },
    );
  } else if (/\blung\b/i.test(organKey)) {
    vDoses.push(
      { dose: 20, label: "V20 Gy", note: "Pneumonitis (QUANTEC)" },
      { dose: 5, label: "V5 Gy", note: "Low-dose lung" },
    );
  } else if (/heart/i.test(organKey)) {
    vDoses.push({ dose: 25, label: "V25 Gy", note: "Cardiac V25" });
  } else if (/esoph/i.test(organKey)) {
    vDoses.push({ dose: 60, label: "V60 Gy", note: "Esophagus V60" });
  } else if (/rectum|bowel|bladder/i.test(organKey)) {
    vDoses.push(
      { dose: 75, label: "V75 Gy", note: "Pelvic high-dose" },
      { dose: 50, label: "V50 Gy", note: "Pelvic mid-dose" },
    );
  } else if (/larynx/i.test(organKey)) {
    vDoses.push(
      { dose: 50, label: "V50 Gy", note: "Laryngeal volume" },
      { dose: 44, label: "V44 Gy", note: "Voice preservation" },
    );
  } else if (/cord|spinal/i.test(organKey)) {
    vDoses.push({ dose: 45, label: "V45 Gy", note: "Cord tolerance context" });
  }

  for (const v of vDoses) {
    rows.push({ label: v.label, value: fmtPct(volumePercentAtLeast(dvh, v.dose)), note: v.note });
  }

  const tech = (ctx.technique ?? "").toUpperCase();
  if (tech === "SBRT" || tech === "SRS" || inferTechniqueProfile(ctx) === "sbrt") {
    rows.push(
      { label: "Dmax", value: fmtGy(cumulativeDosePercentile(dvh, 0)), note: "SBRT point max" },
    );
  }

  return rows;
}

function meanDoseFromDvh(dvh: DVHPoint[]): number {
  if (dvh.length < 2) return dvh[0]?.dose ?? 0;
  const sorted = [...dvh].sort((a, b) => a.dose - b.dose);
  let sum = 0;
  let vol = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dV = sorted[i - 1].volume - sorted[i].volume;
    const dD = sorted[i].dose - sorted[i - 1].dose;
    if (dV > 0 && dD > 0) {
      sum += dD * dV * (sorted[i - 1].dose + dD / 2);
      vol += dV;
    }
  }
  return vol > 0 ? sum / vol : sorted[0].dose;
}
