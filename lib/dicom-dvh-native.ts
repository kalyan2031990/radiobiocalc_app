/**
 * On-device DICOM RTSTRUCT / RTDOSE / RTPLAN → ParsedDvhBundle.
 * Reads embedded DVHSequence (3004,0050) from RTDOSE; ROI names from RTSTRUCT.
 */

import type { ParsedDvhBundle, DVHPoint } from "@/lib/dvh-bundle-types";
import { anonymizeDvhBundle } from "@/lib/anonymize";
import { classifyStructure } from "@/lib/structure-nomenclature";

export type DicomFileInput = {
  fileName: string;
  bytes: ArrayBuffer;
};

export type DicomParseResult = {
  bundle: ParsedDvhBundle;
  structures: DicomStructurePreview[];
  totalDoseGy?: number;
  numFractions?: number;
  modalities: string[];
};

export type DicomStructurePreview = {
  name: string;
  roiNumber: number;
  role: "target" | "oar";
  type: "target" | "oar";
  volumeCc: number;
  meanDoseGy: number;
  maxDoseGy: number;
  minDoseGy: number;
  skipped?: boolean;
};

const SKIP_ROI =
  /^(BODY|COUCH|COUCHSURFACE|COUCHINTERIOR|EXTERNAL|SUPPORT|TABLE|BOLUS)$/i;

function loadDcmjs(): {
  data: {
    DicomMessage: { readFile: (ab: ArrayBuffer) => { dict: Record<string, unknown> } };
    DicomMetaDictionary: { naturalizeDataset: (d: Record<string, unknown>) => Record<string, unknown> };
  };
} {
  // Metro / Node — dcmjs has no ESM default in all bundlers
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("dcmjs");
}

export function isDicomBuffer(bytes: Uint8Array | ArrayBuffer): boolean {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 132) return false;
  return (
    u8[128] === 0x44 &&
    u8[129] === 0x49 &&
    u8[130] === 0x43 &&
    u8[131] === 0x4d
  );
}

function parseDataset(bytes: ArrayBuffer): Record<string, unknown> {
  const { data } = loadDcmjs();
  const msg = data.DicomMessage.readFile(bytes);
  return data.DicomMetaDictionary.naturalizeDataset(msg.dict);
}

function dvhDataToPoints(dvhData: number[], maxPoints = 400): DVHPoint[] {
  const raw: DVHPoint[] = [];
  let dose = 0;
  for (let i = 0; i + 1 < dvhData.length; i += 2) {
    dose += dvhData[i]!;
    raw.push({ dose, volume: dvhData[i + 1]! });
  }
  if (raw.length <= maxPoints) return enforceMonotonic(raw);
  const step = Math.ceil(raw.length / maxPoints);
  const out: DVHPoint[] = [];
  for (let i = 0; i < raw.length; i += step) out.push(raw[i]!);
  if (out[out.length - 1] !== raw[raw.length - 1]) out.push(raw[raw.length - 1]!);
  return enforceMonotonic(out);
}

function enforceMonotonic(dvh: DVHPoint[]): DVHPoint[] {
  if (!dvh.length) return dvh;
  let running = dvh[0]!.volume;
  return dvh.map((p) => {
    running = Math.min(running, p.volume);
    return { dose: p.dose, volume: running };
  });
}

function toDifferential(dvh: DVHPoint[]): DVHPoint[] {
  if (dvh.length < 2) return dvh;
  const diff: DVHPoint[] = [];
  for (let i = 0; i < dvh.length; i++) {
    const vol = i === 0 ? dvh[i]!.volume : Math.max(0, dvh[i - 1]!.volume - dvh[i]!.volume);
    if (vol > 1e-9) diff.push({ dose: dvh[i]!.dose, volume: vol });
  }
  return diff.length ? diff : dvh;
}

function doseStats(dvh: DVHPoint[]) {
  if (!dvh.length) return { mean: 0, max: 0, min: 0, volume: 0 };
  const diff = toDifferential(dvh);
  const totalV = diff.reduce((s, p) => s + p.volume, 0);
  let mean = 0;
  for (const p of diff) mean += p.dose * p.volume;
  mean = totalV > 0 ? mean / totalV : 0;
  const doses = dvh.map((p) => p.dose);
  return {
    mean,
    max: Math.max(...doses),
    min: Math.min(...doses),
    volume: dvh[0]?.volume ?? totalV,
  };
}

function roiMapFromStruct(dict: Record<string, unknown>): Map<number, string> {
  const map = new Map<number, string>();
  const seq = dict.StructureSetROISequence as
    | { ROINumber: number; ROIName: string }[]
    | undefined;
  if (!Array.isArray(seq)) return map;
  for (const item of seq) {
    if (item?.ROINumber != null && item?.ROIName) {
      map.set(Number(item.ROINumber), String(item.ROIName));
    }
  }
  return map;
}

function fractionsFromPlan(dict: Record<string, unknown>): number | undefined {
  const fg = dict.FractionGroupSequence as
    | { NumberOfFractionsPlanned?: number }[]
    | undefined;
  const n = fg?.[0]?.NumberOfFractionsPlanned;
  return n != null ? Number(n) : undefined;
}

function shouldSkipRoi(name: string): boolean {
  const n = name.replace(/\s+/g, "");
  return SKIP_ROI.test(n) || /^COUCH/i.test(name);
}

/**
 * Parse one or more DICOM files (RD/RS/RP). Requires RTDOSE with DVHSequence + RTSTRUCT for names.
 */
export function parseDicomDvhFiles(files: DicomFileInput[]): DicomParseResult {
  let roiNames = new Map<number, string>();
  let dvhSequence: Record<string, unknown>[] = [];
  let numFractions: number | undefined;
  let patientId = "DICOM";
  let patientName = "DICOM import";
  const modalities: string[] = [];

  for (const file of files) {
    const bytes = file.bytes;
    const u8 = new Uint8Array(bytes);
    if (!isDicomBuffer(u8)) {
      throw new Error(`${file.fileName} is not a DICOM Part-10 file`);
    }
    const dict = parseDataset(bytes);
    const mod = String(dict.Modality ?? "UNKNOWN");
    modalities.push(mod);

    if (dict.PatientID) patientId = String(dict.PatientID);
    if (dict.PatientName) patientName = String(dict.PatientName);

    if (mod === "RTSTRUCT") {
      roiNames = new Map([...roiNames, ...roiMapFromStruct(dict)]);
    }
    if (mod === "RTDOSE" && Array.isArray(dict.DVHSequence)) {
      dvhSequence = dict.DVHSequence as Record<string, unknown>[];
    }
    if (mod === "RTPLAN") {
      const fx = fractionsFromPlan(dict);
      if (fx != null) numFractions = fx;
    }
  }

  if (!dvhSequence.length) {
    throw new Error(
      "No DVHSequence found in RTDOSE. Select the RTDOSE (.dcm) file with embedded DVH.",
    );
  }

  const dvhByStructure: Record<string, DVHPoint[]> = {};
  const structures: { name: string; type?: string }[] = [];
  const previews: DicomStructurePreview[] = [];

  for (const item of dvhSequence) {
    const refSeq = item.DVHReferencedROISequence as
      | { ReferencedROINumber?: number }[]
      | undefined;
    const roiNum = Number(refSeq?.[0]?.ReferencedROINumber ?? 0);
    const roiName = roiNames.get(roiNum) ?? `ROI_${roiNum}`;
    const skipped = shouldSkipRoi(roiName);

    const dvhData = item.DVHData as number[] | undefined;
    if (!dvhData?.length) continue;

    const pts = dvhDataToPoints(dvhData);
    const stats = doseStats(pts);
    const { role, literatureOrgan } = classifyStructure(roiName);

    if (!skipped) {
      dvhByStructure[roiName] = pts;
      structures.push({
        name: roiName,
        type: role,
      });
    }

    previews.push({
        name: roiName,
      roiNumber: roiNum,
      role,
      type: role,
      volumeCc: stats.volume,
      meanDoseGy: stats.mean,
      maxDoseGy: stats.max,
      minDoseGy: stats.min,
      skipped,
    });
  }

  if (!structures.length) {
    throw new Error("No clinical structures extracted (all ROIs skipped or empty).");
  }

  const targetPreview = previews.find((p) => !p.skipped && p.role === "target");
  const totalDoseGy = targetPreview?.maxDoseGy;

  const bundle: ParsedDvhBundle = anonymizeDvhBundle({
    patientInfo: {
      patientId,
      patientName,
      modality: "DICOM-RT",
    },
    structures,
    dvhByStructure,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  });

  return {
    bundle,
    structures: previews.filter((p) => !p.skipped),
    totalDoseGy,
    numFractions,
    modalities: [...new Set(modalities)],
  };
}

export async function parseDicomFromBase64(
  fileName: string,
  base64: string,
): Promise<DicomParseResult> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return parseDicomDvhFiles([{ fileName, bytes: bytes.buffer }]);
}
