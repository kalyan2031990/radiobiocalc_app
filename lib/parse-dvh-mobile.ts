/**
 * On-device DVH parse — standalone native parser (no server/data-handler import).
 */

import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import {
  mergeNativeDvhs,
  parseDvhTextNative,
  type NativeParsedDvh,
} from "@/lib/eclipse-dvh-native";

function toBundle(data: NativeParsedDvh): ParsedDvhBundle {
  return {
    patientInfo: data.patientInfo,
    structures: data.structures,
    dvhByStructure: data.dvhByStructure,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };
}

export function parseDvhOnDevice(content: string, fileName: string): ParsedDvhBundle {
  return toBundle(parseDvhTextNative(content, fileName));
}

export function mergeDvhsOnDevice(bundles: ParsedDvhBundle[]): ParsedDvhBundle {
  if (!bundles.length) throw new Error("No DVH data to merge");
  const native: NativeParsedDvh[] = bundles.map((b) => ({
    patientInfo: {
      patientId: b.patientInfo?.patientId ?? "UNKNOWN",
      patientName: b.patientInfo?.patientName ?? "patient",
      modality: b.patientInfo?.modality ?? "Eclipse",
    },
    structures: b.structures.map((s) => ({
      name: s.name,
      type: (s.type === "target" ? "target" : "oar") as "target" | "oar",
    })),
    dvhByStructure: b.dvhByStructure,
  }));
  return toBundle(mergeNativeDvhs(native));
}

export function summarizeDvhBundle(bundle: ParsedDvhBundle): {
  structureCount: number;
  pointCount: number;
} {
  const keys = Object.keys(bundle.dvhByStructure ?? {}).filter(
    (k) => (bundle.dvhByStructure[k]?.length ?? 0) > 0,
  );
  const pointCount = keys.reduce(
    (n, k) => n + (bundle.dvhByStructure[k]?.length ?? 0),
    0,
  );
  return { structureCount: keys.length, pointCount };
}
