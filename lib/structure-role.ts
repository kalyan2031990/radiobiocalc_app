/**
 * TCP (target) vs NTCP (OAR) evaluation role — literature-driven.
 */

import { mapToLiteratureOrgan } from "@/lib/literature-organ-map";

export const TARGET_LITERATURE_ORGANS = new Set(["PTV", "GTV", "CTV", "ITV"]);

const OAR_NAME_PATTERNS =
  /parot|prtd|prtoid|cord|spinal|larynx|brainstem|optic|mandible|heart|lung|esoph|rectum|bladder|bowel|liver|kidney|salivary|constrict|submand|cochlea|chiasm|lens|hippocamp|plexus|femoral|penile|brain(?!stem)|combo|comb\s*prtd|combined\s*parot/i;

/**
 * Infer evaluation role from TPS structure label and/or filename.
 * OAR patterns are checked before target patterns (avoids false TCP on combined parotid).
 */
export function inferEvaluationRole(
  structureName: string,
  fileHint?: string,
  declaredType?: string,
): "target" | "oar" {
  const lit = mapToLiteratureOrgan(structureName, fileHint);
  if (lit && TARGET_LITERATURE_ORGANS.has(lit)) return "target";
  if (lit) return "oar";

  const combined = `${structureName} ${fileHint ?? ""}`.toLowerCase();
  if (OAR_NAME_PATTERNS.test(combined)) return "oar";

  if (declaredType === "target" || declaredType === "oar") {
    return declaredType;
  }

  if (/^\s*ptv|gtv|ctv|itv\b/i.test(structureName)) return "target";
  if (/ptv|gtv|ctv|itv/i.test(structureName) && !OAR_NAME_PATTERNS.test(structureName)) {
    return "target";
  }

  return "oar";
}

export function literatureOrganForRole(
  structureName: string,
  fileHint?: string,
): string | null {
  return mapToLiteratureOrgan(structureName, fileHint);
}

export function defaultModelForRole(role: "target" | "oar"): string {
  return role === "target" ? "zaider_minerbo" : "lkb_loglogit";
}
