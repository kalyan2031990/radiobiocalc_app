/**
 * Merge multiple parsed DVH files into one composite plan bundle.
 */

import type { ParsedDvhBundle } from "@/lib/plan-evaluation";
import { inferEvaluationRole } from "@/lib/structure-role";

export function mergeDvhBundles(
  bundles: ParsedDvhBundle[],
  fileHints: string[] = [],
): ParsedDvhBundle {
  const merged: ParsedDvhBundle = {
    patientInfo: {},
    structures: [],
    dvhByStructure: {},
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };

  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    const hint = fileHints[i] ?? "";
    for (const [name, points] of Object.entries(b.dvhByStructure ?? {})) {
      if (!points?.length) continue;
      let key = name;
      let n = 1;
      while (merged.dvhByStructure[key]) {
        key = `${name}_${n++}`;
      }
      merged.dvhByStructure[key] = points;
      const meta = b.structures?.find((s) => s.name === name);
      const role = inferEvaluationRole(name, hint, meta?.type);
      merged.structures.push({
        name: key,
        type: role,
      });
    }
    if (b.patientInfo?.patientId && !merged.patientInfo?.patientId) {
      merged.patientInfo = { ...b.patientInfo };
    }
  }

  return merged;
}
