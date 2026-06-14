/**
 * Standalone Eclipse .txt DVH parser for Android — no server/ bundle imports.
 */

import {
  isCompositeDvh,
  parseCompositeDvhContent,
} from "@/lib/composite-dvh-parse";

export type NativeDvhPoint = { dose: number; volume: number };

export type NativeParsedDvh = {
  patientInfo: {
    patientId: string;
    patientName: string;
    modality: string;
    prescribedDoseGy?: number;
    prescribedFractions?: number;
  };
  structures: { name: string; type: "target" | "oar" }[];
  dvhByStructure: Record<string, NativeDvhPoint[]>;
};

function doseRange(dvh: NativeDvhPoint[]): { min: number; max: number } {
  if (!dvh.length) return { min: 0, max: 0 };
  let min = dvh[0].dose;
  let max = dvh[0].dose;
  for (let i = 1; i < dvh.length; i++) {
    const d = dvh[i].dose;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

function enforceMonotonic(dvh: NativeDvhPoint[]): NativeDvhPoint[] {
  if (!dvh.length) return dvh;
  let running = dvh[0].volume;
  return dvh.map((p) => {
    running = Math.min(running, p.volume);
    return { dose: p.dose, volume: running };
  });
}

function resample(points: NativeDvhPoint[], numPoints: number): NativeDvhPoint[] {
  if (points.length <= numPoints) return points;
  const sorted = [...points].sort((a, b) => a.dose - b.dose);
  const { max: maxDose } = doseRange(sorted);
  const out: NativeDvhPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const targetDose = numPoints <= 1 ? 0 : (i / (numPoints - 1)) * maxDose;
    let j = 0;
    while (j < sorted.length - 1 && sorted[j + 1].dose < targetDose) j++;

    let volume: number;
    if (j >= sorted.length - 1) {
      volume = sorted[sorted.length - 1].volume;
    } else {
      const d0 = sorted[j].dose;
      const d1 = sorted[j + 1].dose;
      const v0 = sorted[j].volume;
      const v1 = sorted[j + 1].volume;
      volume = d1 === d0 ? v0 : v0 + ((targetDose - d0) / (d1 - d0)) * (v1 - v0);
    }
    out.push({ dose: targetDose, volume: Math.max(0, volume) });
  }
  return out;
}

const MOBILE_MAX_POINTS = 200;

function inferRole(structureName: string, fileName: string): "target" | "oar" {
  const s = `${structureName} ${fileName}`.toLowerCase();
  if (/parot|prtd|prtoid|cord|spinal|larynx|brainstem|combo|comb\s*prtd|oar/.test(s)) {
    return "oar";
  }
  if (/ptv|gtv|ctv|itv|targ|tumor/.test(s)) return "target";
  return "oar";
}

export function isEclipseTxt(content: string): boolean {
  const head = content.slice(0, 4000);
  return (
    /Structure\s*:/i.test(head) &&
    (/Dose\s*\[cGy\]/i.test(head) || /Cumulative Dose Volume Histogram/i.test(head))
  );
}

export function parseEclipseTxtNative(
  fileContent: string,
  fileName: string,
): NativeParsedDvh {
  const lines = fileContent.split(/\r?\n/);
  let structureName = "Unknown";
  let patientId = "UNKNOWN";
  let patientName = fileName;
  let isDifferential = false;

  let dataStart: number | null = null;

  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const line = lines[i];
    if (/Patient\s*ID/i.test(line) && line.includes(":")) {
      patientId = line.split(":").slice(1).join(":").trim() || patientId;
    }
    if (/Patient\s*Name/i.test(line) && line.includes(":")) {
      patientName = line.split(":").slice(1).join(":").trim() || patientName;
    }
    if (/Structure\s*:/i.test(line)) {
      structureName = line.split(":").slice(1).join(":").trim() || structureName;
    }
    if (/Type\s*:/i.test(line) && /differential/i.test(line)) {
      isDifferential = true;
    }
    if (/^\s*Dose\s*\[cGy\]/i.test(line) && /volume/i.test(line)) {
      dataStart = i + 1;
      break;
    }
  }

  if (dataStart === null) {
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const d = parseFloat(parts[0]);
        const v = parseFloat(parts[parts.length - 1]);
        if (!Number.isNaN(d) && !Number.isNaN(v) && d >= 0) {
          dataStart = i;
          break;
        }
      }
    }
  }

  if (dataStart === null) {
    throw new Error(`Could not find DVH data section in ${fileName}`);
  }

  const dvhPoints: NativeDvhPoint[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || (line.startsWith("-") && line.length > 10)) continue;
    const parts = line.split(/[\s,\t]+/).filter(Boolean);
    if (parts.length < 2) continue;
    let dose = parseFloat(parts[0]);
    const volume = parseFloat(parts[parts.length - 1]);
    if (Number.isNaN(dose) || Number.isNaN(volume) || dose < 0 || volume < 0) continue;
    dose = dose / 100;
    dvhPoints.push({ dose, volume });
  }

  if (!dvhPoints.length) {
    throw new Error(`No valid DVH data in ${fileName}`);
  }

  if (!isDifferential && dvhPoints.length > 1) {
    let decreasing = true;
    for (let i = 1; i < dvhPoints.length; i++) {
      if (dvhPoints[i].volume > dvhPoints[i - 1].volume) {
        decreasing = false;
        break;
      }
    }
    isDifferential = !decreasing;
  }

  if (isDifferential) {
    dvhPoints.reverse();
    let cumulativeVolume = 0;
    for (const point of dvhPoints) {
      cumulativeVolume += point.volume;
      point.volume = cumulativeVolume;
    }
    dvhPoints.reverse();
  }

  dvhPoints.sort((a, b) => a.dose - b.dose);
  const smoothed = resample(enforceMonotonic(dvhPoints), MOBILE_MAX_POINTS);
  const role = inferRole(structureName, fileName);

  return {
    patientInfo: { patientId, patientName, modality: "Eclipse" },
    structures: [{ name: structureName, type: role }],
    dvhByStructure: { [structureName]: smoothed },
  };
}

export function parseDvhTextNative(content: string, fileName: string): NativeParsedDvh {
  if (isCompositeDvh(content)) {
    return parseCompositeDvhContent(content, fileName) as NativeParsedDvh;
  }
  if (isEclipseTxt(content)) {
    return parseEclipseTxtNative(content, fileName);
  }
  throw new Error(
    `Unsupported DVH format in ${fileName}. Use Varian Eclipse .txt or rbGyanX composite export.`,
  );
}

export function mergeNativeDvhs(bundles: NativeParsedDvh[]): NativeParsedDvh {
  const merged: NativeParsedDvh = {
    patientInfo: { patientId: "UNKNOWN", patientName: "composite_plan", modality: "Eclipse" },
    structures: [],
    dvhByStructure: {},
  };

  for (const b of bundles) {
    for (const s of b.structures) {
      let key = s.name;
      let n = 1;
      while (merged.dvhByStructure[key]) key = `${s.name}_${n++}`;
      merged.dvhByStructure[key] = b.dvhByStructure[s.name] ?? [];
      merged.structures.push({ name: key, type: s.type });
    }
    if (b.patientInfo.patientId !== "UNKNOWN") {
      merged.patientInfo = { ...b.patientInfo };
    }
  }
  return merged;
}
