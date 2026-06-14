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
import { isBodyStructure } from "@/lib/body-structure";

export function inferEvaluationRole(
  structureName: string,
  fileHint?: string,
  declaredType?: string,
): "target" | "oar" {
  if (isBodyStructure(structureName)) return "oar";
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

/** Default TCP model for composite / target evaluation (site-aware). */
export function defaultCompositeTcpModel(cancerSite = "HN"): string {
  const id = cancerSite.toUpperCase().replace(/[\s&_./-]/g, "");
  if (id === "HN" || id === "HEADANDNECK" || id === "HEADNECK") {
    return "poisson_dvh";
  }
  return "zaider_minerbo";
}

export function defaultCompositeNtcpModel(): string {
  return "lkb_loglogit";
}

export function defaultModelForRole(role: "target" | "oar", cancerSite = "HN"): string {
  return role === "target" ? defaultCompositeTcpModel(cancerSite) : defaultCompositeNtcpModel();
}
