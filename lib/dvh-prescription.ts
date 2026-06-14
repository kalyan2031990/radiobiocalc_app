/**
 * Prescription dose / fractions from DVH header or bundle metadata.
 */
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";

export type DvhPrescription = {
  prescribedDoseGy?: number;
  prescribedFractions?: number;
};

export function parsePrescriptionFromText(content: string): DvhPrescription {
  let prescribedDoseGy: number | undefined;
  let prescribedFractions: number | undefined;
  const doseM = content.match(/Prescribed\s*dose\s*:\s*([\d.]+)\s*Gy/i);
  if (doseM) prescribedDoseGy = parseFloat(doseM[1]);
  const cgy = content.match(/Prescribed\s*dose\s*\[cGy\]\s*:\s*([\d.]+)/i);
  if (!prescribedDoseGy && cgy) prescribedDoseGy = parseFloat(cgy[1]) / 100;
  const fxM = content.match(/Prescribed\s*(?:fx|fractions?)\s*:\s*(\d+)/i);
  if (fxM) prescribedFractions = parseInt(fxM[1], 10);
  return { prescribedDoseGy, prescribedFractions };
}

/** Parse legacy Rx tag stored in studyDate (Rx66.0Gy). */
function rxFromStudyDate(studyDate?: string): number | undefined {
  if (!studyDate) return undefined;
  const m = studyDate.match(/Rx([\d.]+)Gy/i);
  return m ? parseFloat(m[1]) : undefined;
}

export function getPrescriptionFromBundle(bundle: ParsedDvhBundle | null): DvhPrescription {
  if (!bundle) return {};
  const p = bundle.patientInfo;
  return {
    prescribedDoseGy: p?.prescribedDoseGy ?? rxFromStudyDate(p?.studyDate),
    prescribedFractions: p?.prescribedFractions,
  };
}

export function resolvePrescriptionGy(
  bundle: ParsedDvhBundle | null,
  totalDoseGy: number,
): number {
  const { prescribedDoseGy } = getPrescriptionFromBundle(bundle);
  return prescribedDoseGy && prescribedDoseGy > 0 ? prescribedDoseGy : totalDoseGy;
}
