/**
 * rbGyanX composite DVH export — multi-structure, dose in Gy, Role: TARGET/OAR.
 */

export type CompositeDvhPoint = { dose: number; volume: number };

export type CompositeParsedDvh = {
  patientInfo: { patientId: string; patientName: string; modality: string };
  structures: { name: string; type: "target" | "oar" }[];
  dvhByStructure: Record<string, CompositeDvhPoint[]>;
  prescribedDoseGy?: number;
  prescribedFractions?: number;
};

export const DEFAULT_COMPOSITE_RESAMPLE_POINTS = 200;

function doseRange(dvh: CompositeDvhPoint[]): { min: number; max: number } {
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

function enforceMonotonic(dvh: CompositeDvhPoint[]): CompositeDvhPoint[] {
  if (!dvh.length) return dvh;
  let running = dvh[0].volume;
  return dvh.map((p) => {
    running = Math.min(running, p.volume);
    return { dose: p.dose, volume: running };
  });
}

function resample(points: CompositeDvhPoint[], numPoints: number): CompositeDvhPoint[] {
  if (points.length <= numPoints) return points;
  const sorted = [...points].sort((a, b) => a.dose - b.dose);
  const { max: maxDose } = doseRange(sorted);
  const out: CompositeDvhPoint[] = [];

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

export function isCompositeDvh(content: string): boolean {
  const head = content.slice(0, 6000);
  return (
    /rbGyanX\s+Composite/i.test(head) ||
    (/Role:\s*(TARGET|OAR)/i.test(head) && /Dose\s*\[Gy\]/i.test(head))
  );
}

function parseHeader(lines: string[]): {
  patientId: string;
  patientName: string;
  modality: string;
  prescribedDoseGy?: number;
  prescribedFractions?: number;
} {
  let patientId = "UNKNOWN";
  let patientName = "composite_plan";
  let modality = "RT";
  let prescribedDoseGy: number | undefined;
  let prescribedFractions: number | undefined;

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i];
    if (/Patient\s*ID/i.test(line) && line.includes(":")) {
      patientId = line.split(":").slice(1).join(":").trim() || patientId;
    }
    if (/Source\s*TPS/i.test(line) && line.includes(":")) {
      modality = line.split(":").slice(1).join(":").trim() || modality;
    }
    if (/Prescribed\s*dose/i.test(line) && line.includes(":")) {
      const m = line.match(/:\s*([\d.]+)/);
      if (m) prescribedDoseGy = parseFloat(m[1]);
    }
    if (/Prescribed\s*fx/i.test(line) && line.includes(":")) {
      const m = line.match(/:\s*([\d.]+)/);
      if (m) prescribedFractions = parseInt(m[1], 10);
    }
  }

  return { patientId, patientName, modality, prescribedDoseGy, prescribedFractions };
}

function isDataHeader(line: string): boolean {
  return /^\s*Dose\s*\[Gy\]/i.test(line) && /volume/i.test(line);
}

function isStructureLine(line: string): boolean {
  return /^Structure\s*:/i.test(line.trim());
}

function parseDataRows(lines: string[], start: number, end: number): CompositeDvhPoint[] {
  const points: CompositeDvhPoint[] = [];
  for (let i = start; i < end; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("%")) continue;
    if (isStructureLine(line)) break;
    const parts = line.split(/[\s,\t]+/).filter(Boolean);
    if (parts.length < 2) continue;
    const dose = parseFloat(parts[0]);
    const volume = parseFloat(parts[parts.length - 1]);
    if (Number.isNaN(dose) || Number.isNaN(volume) || dose < 0 || volume < 0) continue;
    points.push({ dose, volume });
  }
  return points;
}

export function parseCompositeDvhContent(
  fileContent: string,
  fileName: string,
  options?: { maxPoints?: number },
): CompositeParsedDvh {
  const maxPoints = options?.maxPoints ?? DEFAULT_COMPOSITE_RESAMPLE_POINTS;
  const lines = fileContent.split(/\r?\n/);
  const header = parseHeader(lines);

  const structures: { name: string; type: "target" | "oar" }[] = [];
  const dvhByStructure: Record<string, CompositeDvhPoint[]> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!isStructureLine(line)) {
      i++;
      continue;
    }

    const structureName = line.split(":").slice(1).join(":").trim() || "Unknown";
    let role: "target" | "oar" = "oar";
    let dataStart: number | null = null;
    let blockEnd = lines.length;

    for (let j = i + 1; j < lines.length; j++) {
      const inner = lines[j].trim();
      if (j > i + 1 && isStructureLine(inner)) {
        blockEnd = j;
        break;
      }
      if (/^Role\s*:/i.test(inner)) {
        role = /TARGET/i.test(inner) ? "target" : "oar";
      }
      if (isDataHeader(inner)) {
        dataStart = j + 1;
      }
    }

    if (dataStart !== null) {
      let raw = parseDataRows(lines, dataStart, blockEnd);
      if (raw.length) {
        raw.sort((a, b) => a.dose - b.dose);
        raw = resample(enforceMonotonic(raw), maxPoints);
        dvhByStructure[structureName] = raw;
        structures.push({ name: structureName, type: role });
      }
    }

    i = blockEnd;
  }

  if (!structures.length) {
    throw new Error(`No structures parsed in composite DVH ${fileName}`);
  }

  return {
    patientInfo: {
      patientId: header.patientId,
      patientName: header.patientName,
      modality: header.modality,
    },
    structures,
    dvhByStructure,
    prescribedDoseGy: header.prescribedDoseGy,
    prescribedFractions: header.prescribedFractions,
  };
}
