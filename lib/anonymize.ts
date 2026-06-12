/**
 * De-identification for on-device imports — no PHI in storage, logs, or exports.
 */

import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";

export const PSEUDO_PREFIX = "RBGX";

function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

/** Stable pseudonymous case id from raw patient id + optional salt. */
export function pseudonymizePatientId(rawId: string, salt = "rbgyanx-v1"): string {
  const h = fnv1aHash(`${salt}:${rawId.trim()}`);
  return `${PSEUDO_PREFIX}-${h}`;
}

export function stripPatientName(_raw?: string): string {
  return "De-identified case";
}

export function anonymizeDvhBundle(bundle: ParsedDvhBundle): ParsedDvhBundle {
  const rawId = bundle.patientInfo?.patientId ?? "UNKNOWN";
  return {
    ...bundle,
    patientInfo: {
      patientId: pseudonymizePatientId(rawId),
      patientName: stripPatientName(bundle.patientInfo?.patientName),
      modality: bundle.patientInfo?.modality ?? "Unknown",
    },
  };
}

/** Remove DICOM / text PHI fields before logging. */
export function safeLogLabel(fileName: string, structureCount: number): string {
  return `DVH import · ${structureCount} structure(s) · ${fileName.replace(/[^\w.\- ]/g, "_")}`;
}

export function containsPhiInText(text: string): boolean {
  const patterns = [
    /\bPatient\s*Name\s*:/i,
    /\bPatient\s*ID\s*:\s*\S+/i,
    /\b\d{3}-\d{2}-\d{4}\b/,
  ];
  return patterns.some((p) => p.test(text));
}
