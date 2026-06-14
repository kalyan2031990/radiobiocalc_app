/**
 * External / BODY structures for RTOG conformity index (V_RI).
 */
import type { DVHPoint } from "@/lib/dvh-bundle-types";

const BODY_PATTERN = /^(BODY|EXTERNAL|PATIENT|SKIN)$/i;

export function isBodyStructure(name: string): boolean {
  return BODY_PATTERN.test(name.trim());
}

export function findBodyStructureName(
  structures: { name: string }[],
  dvhByStructure: Record<string, DVHPoint[]>,
): string | null {
  for (const s of structures) {
    if (!isBodyStructure(s.name)) continue;
    if ((dvhByStructure[s.name]?.length ?? 0) > 0) return s.name;
  }
  return null;
}

export function findBodyDvh(
  structures: { name: string }[],
  dvhByStructure: Record<string, DVHPoint[]>,
): DVHPoint[] | undefined {
  const name = findBodyStructureName(structures, dvhByStructure);
  return name ? dvhByStructure[name] : undefined;
}
