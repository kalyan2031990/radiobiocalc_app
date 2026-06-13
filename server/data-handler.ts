/**
 * Data Handling Module
 * 
 * Handles input from multiple sources:
 * - DICOM-RT files (RT Dose + RT Structure Set)
 * - CSV/TXT DVH files (differential or cumulative)
 * - Manual entry
 * 
 * Provides DVH extraction, validation, and processing
 */

import {
  isCompositeDvh,
  parseCompositeDvhContent,
} from "@/lib/composite-dvh-parse";
import { inferStructureRole } from "./structure-role";
import type { DVHPoint } from "./radiobiology";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientInfo {
  patientId: string;
  patientName: string;
  patientAge?: number;
  studyDate?: string;
  modality: string;
}

export interface Structure {
  name: string;
  type: "target" | "oar";
  roiNumber?: number;
  color?: string;
  volume?: number; // cm³
}

export interface DVHData {
  patientInfo: PatientInfo;
  structures: Structure[];
  dvhByStructure: Record<string, DVHPoint[]>;
  isDifferential: boolean;
  doseUnit: "Gy" | "cGy";
  volumeUnit: "cm3" | "relative";
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV/TXT DVH Parser
// ─────────────────────────────────────────────────────────────────────────────

function isEclipseTxt(content: string): boolean {
  const head = content.slice(0, 4000);
  return (
    /Structure\s*:/i.test(head) &&
    (/Dose\s*\[cGy\]/i.test(head) || /Cumulative Dose Volume Histogram/i.test(head))
  );
}

/** Avoid Math.max(...arr) stack overflows on Hermes with large TPS DVHs. */
function dvhDoseRange(dvh: DVHPoint[]): { min: number; max: number } {
  if (dvh.length === 0) return { min: 0, max: 0 };
  let min = dvh[0].dose;
  let max = dvh[0].dose;
  for (let i = 1; i < dvh.length; i++) {
    const d = dvh[i].dose;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/**
 * Parse Varian Eclipse exported .txt DVH (matches desktop rbGyanX parser behaviour).
 */
export function parseEclipseTxt(
  fileContent: string,
  fileName: string = "dvh.txt"
): DVHData {
  const lines = fileContent.split(/\r?\n/);
  let structureName = "Unknown";
  let patientId = "UNKNOWN";
  let patientName = fileName;
  let isDifferential = false;
  let prescribedDoseGy: number | undefined;

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
    if (/Prescribed dose\s*\[cGy\]/i.test(line) && line.includes(":")) {
      const m = line.match(/:\s*([\d.]+)/);
      if (m) prescribedDoseGy = parseFloat(m[1]) / 100;
    }
    if (/Type\s*:/i.test(line) && /differential/i.test(line)) {
      isDifferential = true;
    }
    // Table header only (not "Min Dose [cGy]" metadata lines)
    if (
      /^\s*Dose\s*\[cGy\]/i.test(line) &&
      /volume/i.test(line)
    ) {
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

  const dvhPoints: DVHPoint[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || (line.startsWith("-") && line.length > 10)) continue;
    const parts = line.split(/[\s,\t]+/).filter(Boolean);
    if (parts.length < 2) continue;
    let dose = parseFloat(parts[0]);
    const volume = parseFloat(parts[parts.length - 1]);
    if (Number.isNaN(dose) || Number.isNaN(volume) || dose < 0 || volume < 0) continue;
    // Eclipse exports dose in cGy — always convert to Gy (matches desktop dvh_parser.py)
    dose = dose / 100;
    dvhPoints.push({ dose, volume });
  }

  if (dvhPoints.length === 0) {
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
  const smoothed = enforceMonotonicCumulative(dvhPoints);
  validateDVH(smoothed);

  return {
    patientInfo: {
      patientId,
      patientName,
      modality: "Eclipse",
      ...(prescribedDoseGy !== undefined
        ? { studyDate: `Rx${prescribedDoseGy.toFixed(1)}Gy` }
        : {}),
    },
    structures: [
      {
        name: structureName,
        type: inferStructureRole(structureName, fileName),
      },
    ],
    dvhByStructure: { [structureName]: smoothed },
    isDifferential: false,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };
}

/**
 * Parse CSV/TXT DVH file
 * Supports formats:
 * - Varian Eclipse .txt export
 * - Dose, Volume (two columns)
 * - Dose, Volume, Structure (three columns)
 * - Header with metadata
 */
export function parseCompositeDvh(
  fileContent: string,
  fileName: string = "composite_dvh.txt",
): DVHData {
  const parsed = parseCompositeDvhContent(fileContent, fileName);
  const dvhByStructure: Record<string, DVHPoint[]> = {};
  for (const [name, pts] of Object.entries(parsed.dvhByStructure)) {
    const smoothed = enforceMonotonicCumulative(pts);
    validateDVH(smoothed);
    dvhByStructure[name] = smoothed;
  }

  return {
    patientInfo: {
      patientId: parsed.patientInfo.patientId,
      patientName: parsed.patientInfo.patientName,
      modality: parsed.patientInfo.modality,
      ...(parsed.prescribedDoseGy !== undefined
        ? { studyDate: `Rx${parsed.prescribedDoseGy.toFixed(1)}Gy` }
        : {}),
    },
    structures: parsed.structures.map((s) => ({
      name: s.name,
      type: s.type,
    })),
    dvhByStructure,
    isDifferential: false,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };
}

export function parseCSVDVH(
  fileContent: string,
  fileName: string = "dvh.csv"
): DVHData {
  if (isCompositeDvh(fileContent)) {
    return parseCompositeDvh(fileContent, fileName);
  }
  if (isEclipseTxt(fileContent)) {
    return parseEclipseTxt(fileContent, fileName);
  }

  const lines = fileContent.trim().split("\n");

  // Parse metadata from header comments
  let headerLines = 0;
  let structureName = "Unknown";
  let isDifferential = false;
  let doseUnit: "Gy" | "cGy" = "Gy";
  let volumeUnit: "cm3" | "relative" = "cm3";

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("%")) {
      headerLines++;

      // Extract metadata
      if (line.toLowerCase().includes("structure")) {
        const match = line.match(/:\s*(.+)/);
        if (match) structureName = match[1].trim();
      }
      if (line.toLowerCase().includes("differential")) {
        isDifferential = true;
      }
      if (line.toLowerCase().includes("cumulative")) {
        isDifferential = false;
      }
      if (line.toLowerCase().includes("cgy")) {
        doseUnit = "cGy";
      }
      if (line.toLowerCase().includes("relative")) {
        volumeUnit = "relative";
      }
    } else {
      break;
    }
  }

  // Parse data rows (2-col single structure or 3-col composite: dose, volume, structure)
  const dvhPoints: DVHPoint[] = [];
  const byStructure = new Map<string, DVHPoint[]>();
  let sawThreeColumn = false;

  for (let i = headerLines; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.startsWith("#") || line.startsWith("%")) {
      continue;
    }

    const parts = line.split(/[,\s\t]+/).filter((p) => p.length > 0);

    if (parts.length >= 2) {
      if (/dose/i.test(parts[0]) && /vol/i.test(parts[1])) {
        continue;
      }
      const dose = parseFloat(parts[0]);
      const volume = parseFloat(parts[1]);

      if (!isNaN(dose) && !isNaN(volume) && dose >= 0 && volume >= 0) {
        const normalizedDose = doseUnit === "cGy" ? dose / 100 : dose;
        const point: DVHPoint = { dose: normalizedDose, volume };

        if (parts.length >= 3) {
          const structName = parts.slice(2).join(" ").trim();
          if (structName && !/^[\d.]+$/.test(structName)) {
            sawThreeColumn = true;
            const list = byStructure.get(structName) ?? [];
            list.push(point);
            byStructure.set(structName, list);
            continue;
          }
        }

        dvhPoints.push(point);
      }
    }
  }

  if (sawThreeColumn && byStructure.size > 0) {
    return buildMultiStructureDvhData(
      byStructure,
      fileName,
      isDifferential,
      doseUnit,
      volumeUnit,
    );
  }

  if (dvhPoints.length === 0) {
    throw new Error("No valid DVH data found in file");
  }

  // Heuristic: raw cGy values without header (common in TPS CSV exports)
  if (doseUnit === "Gy") {
    const { max: maxD } = dvhDoseRange(dvhPoints);
    if (maxD > 150) {
      for (const p of dvhPoints) {
        p.dose = p.dose / 100;
      }
      doseUnit = "cGy";
    }
  }

  if (structureName === "Unknown") {
    structureName = inferStructureNameFromFileName(fileName);
  }

  // Detect if cumulative or differential if not specified
  if (!isDifferential && dvhPoints.length > 1) {
    // Check if volumes are decreasing (cumulative) or increasing (differential)
    let isDecreasing = true;
    for (let i = 1; i < dvhPoints.length; i++) {
      if (dvhPoints[i].volume > dvhPoints[i - 1].volume) {
        isDecreasing = false;
        break;
      }
    }
    isDifferential = !isDecreasing;
  }

  // Convert differential to cumulative if needed
  if (isDifferential) {
    dvhPoints.reverse();
    let cumulativeVolume = 0;
    for (const point of dvhPoints) {
      cumulativeVolume += point.volume;
      point.volume = cumulativeVolume;
    }
    dvhPoints.reverse();
  }

  // Sort by dose
  dvhPoints.sort((a, b) => a.dose - b.dose);

  const smoothed = enforceMonotonicCumulative(dvhPoints);
  validateDVH(smoothed);
  return buildDvhDataFromPoints(smoothed, structureName, fileName, isDifferential, doseUnit, volumeUnit);
}

function enforceMonotonicCumulative(dvh: DVHPoint[]): DVHPoint[] {
  if (dvh.length === 0) return dvh;
  let running = dvh[0].volume;
  return dvh.map((p) => {
    running = Math.min(running, p.volume);
    return { dose: p.dose, volume: running };
  });
}

function inferStructureNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const parts = base.split(/[_\s]+/).filter(Boolean);
  if (parts.length >= 2 && /^PT\d+$/i.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return base || "Unknown";
}

function finalizeDvhPoints(
  dvhPoints: DVHPoint[],
  isDifferential: boolean,
): DVHPoint[] {
  let points = [...dvhPoints];
  if (isDifferential) {
    points.reverse();
    let cumulativeVolume = 0;
    for (const point of points) {
      cumulativeVolume += point.volume;
      point.volume = cumulativeVolume;
    }
    points.reverse();
  }
  points.sort((a, b) => a.dose - b.dose);
  const smoothed = enforceMonotonicCumulative(points);
  validateDVH(smoothed);
  return smoothed;
}

function buildMultiStructureDvhData(
  byStructure: Map<string, DVHPoint[]>,
  fileName: string,
  isDifferential: boolean,
  doseUnit: "Gy" | "cGy",
  volumeUnit: "cm3" | "relative",
): DVHData {
  const structures: Structure[] = [];
  const dvhByStructure: Record<string, DVHPoint[]> = {};

  for (const [name, raw] of byStructure) {
    if (raw.length === 0) continue;
    if (doseUnit === "Gy") {
      const { max: maxD } = dvhDoseRange(raw);
      if (maxD > 150) {
        for (const p of raw) p.dose = p.dose / 100;
      }
    }
    const smoothed = finalizeDvhPoints(raw, isDifferential);
    dvhByStructure[name] = smoothed;
    structures.push({
      name,
      type: inferStructureRole(name, fileName),
    });
  }

  if (structures.length === 0) {
    throw new Error("No valid composite DVH structures found");
  }

  return {
    patientInfo: {
      patientId: "UNKNOWN",
      patientName: fileName,
      modality: "DVH",
    },
    structures,
    dvhByStructure,
    isDifferential,
    doseUnit,
    volumeUnit,
  };
}

/** Merge multiple DVH imports into one composite plan (PTV + OARs). */
export function mergeDvhData(bundles: DVHData[]): DVHData {
  const merged: DVHData = {
    patientInfo: {
      patientId: "UNKNOWN",
      patientName: "composite_plan",
      modality: "DVH",
    },
    structures: [],
    dvhByStructure: {},
    isDifferential: false,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };

  for (const b of bundles) {
    for (const s of b.structures) {
      const name = s.name;
      let key = name;
      let n = 1;
      while (merged.dvhByStructure[key]) {
        key = `${name}_${n++}`;
      }
      merged.dvhByStructure[key] = b.dvhByStructure[name] ?? [];
      merged.structures.push({ ...s, name: key });
    }
    if (b.patientInfo?.patientId && b.patientInfo.patientId !== "UNKNOWN") {
      merged.patientInfo = { ...b.patientInfo };
    }
  }

  return merged;
}

function buildDvhDataFromPoints(
  dvhPoints: DVHPoint[],
  structureName: string,
  fileName: string,
  isDifferential: boolean,
  doseUnit: "Gy" | "cGy",
  volumeUnit: "cm3" | "relative"
): DVHData {
  const role = inferStructureRole(structureName, fileName);

  return {
    patientInfo: {
      patientId: "UNKNOWN",
      patientName: fileName,
      modality: "DVH",
    },
    structures: [
      {
        name: structureName,
        type: role,
      },
    ],
    dvhByStructure: {
      [structureName]: dvhPoints,
    },
    isDifferential,
    doseUnit,
    volumeUnit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DICOM-RT Handler (Placeholder for backend integration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse DICOM-RT files
 * Note: This is a placeholder. Actual DICOM parsing should be done on the backend
 * using pydicom library, as DICOM parsing is complex and requires binary file handling.
 * 
 * The frontend will upload the DICOM files to the backend, which will:
 * 1. Parse RT Dose file to extract dose grid
 * 2. Parse RT Structure Set to extract contours
 * 3. Calculate DVH from dose grid + contours
 * 4. Return DVH data to frontend
 */
export interface DICOMParseRequest {
  rtDoseFile: File;
  rtStructureFile: File;
}

export interface DICOMParseResponse {
  success: boolean;
  data?: DVHData;
  error?: string;
}

/**
 * Placeholder for DICOM parsing
 * This function would be called on the backend via API
 */
export async function parseDICOMFiles(
  rtDoseFile: File,
  rtStructureFile: File
): Promise<DICOMParseResponse> {
  // This would be implemented on the backend using pydicom
  // For now, return a placeholder response
  return {
    success: false,
    error: "DICOM parsing requires backend implementation with pydicom",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DVH Validation & Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate DVH data integrity
 */
export function validateDVH(dvh: DVHPoint[]): boolean {
  if (dvh.length < 2) {
    throw new Error("DVH must have at least 2 points");
  }

  // Cumulative DVH: volume non-increasing (tolerance for TPS numerical noise)
  for (let i = 1; i < dvh.length; i++) {
    const tol = Math.max(0.05, 0.002 * dvh[i - 1].volume);
    if (dvh[i].volume > dvh[i - 1].volume + tol) {
      throw new Error("DVH volumes must be monotonically decreasing (cumulative format)");
    }
  }

  // Check for reasonable dose range
  const { min: minDose, max: maxDose } = dvhDoseRange(dvh);

  if (maxDose > 200) {
    throw new Error("Maximum dose exceeds 200 Gy (likely incorrect unit)");
  }

  if (maxDose < 0.1) {
    throw new Error("Maximum dose is less than 0.1 Gy (likely incorrect unit)");
  }

  return true;
}

/**
 * Smooth DVH using moving average
 * Useful for noisy DVH data
 */
export function smoothDVH(dvh: DVHPoint[], windowSize: number = 3): DVHPoint[] {
  if (dvh.length <= windowSize) {
    return dvh;
  }

  const smoothed: DVHPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < dvh.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(dvh.length, i + halfWindow + 1);

    const avgVolume =
      dvh
        .slice(start, end)
        .reduce((sum, p) => sum + p.volume, 0) / (end - start);

    smoothed.push({
      dose: dvh[i].dose,
      volume: avgVolume,
    });
  }

  return smoothed;
}

/**
 * Resample DVH to specified number of points
 * Useful for reducing data size or standardizing resolution
 */
export function resampleDVH(dvh: DVHPoint[], numPoints: number = 1000): DVHPoint[] {
  if (dvh.length <= numPoints) {
    return dvh;
  }

  const resampled: DVHPoint[] = [];
  const { max: maxDose } = dvhDoseRange(dvh);

  for (let i = 0; i < numPoints; i++) {
    const targetDose = (i / (numPoints - 1)) * maxDose;

    // Find interpolated volume at target dose
    let j = 0;
    while (j < dvh.length - 1 && dvh[j + 1].dose < targetDose) {
      j++;
    }

    let volume: number;
    if (j === dvh.length - 1) {
      volume = dvh[j].volume;
    } else {
      const d0 = dvh[j].dose;
      const d1 = dvh[j + 1].dose;
      const v0 = dvh[j].volume;
      const v1 = dvh[j + 1].volume;

      if (d1 === d0) {
        volume = v0;
      } else {
        volume = v0 + ((targetDose - d0) / (d1 - d0)) * (v1 - v0);
      }
    }

    resampled.push({
      dose: targetDose,
      volume: Math.max(0, volume),
    });
  }

  return resampled;
}

/**
 * Convert differential DVH to cumulative
 */
export function differentialToCumulative(dvh: DVHPoint[]): DVHPoint[] {
  if (dvh.length === 0) {
    return [];
  }

  // Reverse to go from high dose to low dose
  const reversed = [...dvh].reverse();

  let cumulativeVolume = 0;
  const cumulative: DVHPoint[] = [];

  for (const point of reversed) {
    cumulativeVolume += point.volume;
    cumulative.push({
      dose: point.dose,
      volume: cumulativeVolume,
    });
  }

  // Reverse back to ascending dose order
  return cumulative.reverse();
}

/**
 * Convert cumulative DVH to differential
 */
export function cumulativeToDifferential(dvh: DVHPoint[]): DVHPoint[] {
  if (dvh.length < 2) {
    return dvh;
  }

  const differential: DVHPoint[] = [];

  for (let i = 0; i < dvh.length; i++) {
    let volume: number;

    if (i === 0) {
      volume = dvh[i].volume;
    } else {
      volume = dvh[i - 1].volume - dvh[i].volume;
    }

    differential.push({
      dose: dvh[i].dose,
      volume: Math.max(0, volume),
    });
  }

  return differential;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fractionation-Aware Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert physical dose DVH to EQD2 DVH
 * Accounts for fractionation effects
 */
export function convertToEQD2DVH(
  dvh: DVHPoint[],
  totalDose: number,
  numFractions: number,
  alphaBeta: number
): DVHPoint[] {
  if (dvh.length === 0) {
    return [];
  }

  const dosePerFraction = totalDose / numFractions;

  return dvh.map((point) => {
    const eqd2Dose =
      point.dose *
      ((alphaBeta + dosePerFraction) / (alphaBeta + 2));

    return {
      dose: eqd2Dose,
      volume: point.volume,
    };
  });
}

/**
 * Convert EQD2 DVH back to physical dose DVH
 */
export function convertFromEQD2DVH(
  dvh: DVHPoint[],
  totalDose: number,
  numFractions: number,
  alphaBeta: number
): DVHPoint[] {
  if (dvh.length === 0) {
    return [];
  }

  const dosePerFraction = totalDose / numFractions;

  return dvh.map((point) => {
    const physicalDose =
      point.dose *
      ((alphaBeta + 2) / (alphaBeta + dosePerFraction));

    return {
      dose: physicalDose,
      volume: point.volume,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// File Format Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect file format and parse accordingly
 */
export async function parseFile(
  file: File
): Promise<DVHData> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".dcm")) {
    throw new Error(
      "DICOM files require backend processing. Please upload via the DICOM import dialog."
    );
  }

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const content = await file.text();
    return parseCSVDVH(content, file.name);
  }

  throw new Error(
    `Unsupported file format: ${file.name}. Supported formats: CSV, TXT, DICOM (.dcm)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export DVH data to CSV format
 */
export function exportDVHToCSV(dvh: DVHPoint[], structureName: string): string {
  const lines: string[] = [
    `# Structure: ${structureName}`,
    `# Generated: ${new Date().toISOString()}`,
    "# Dose (Gy), Volume (cm3)",
    "",
  ];

  for (const point of dvh) {
    lines.push(`${point.dose.toFixed(4)},${point.volume.toFixed(4)}`);
  }

  return lines.join("\n");
}

/**
 * Export DVH data to JSON format
 */
export function exportDVHToJSON(dvhData: DVHData): string {
  return JSON.stringify(dvhData, null, 2);
}
