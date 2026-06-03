/**
 * Server-side TCP vs NTCP role (mirrors lib/structure-role.ts).
 */

const TARGET_ORGANS = new Set(["PTV", "GTV", "CTV", "ITV"]);

const OAR_PATTERNS =
  /parot|prtd|prtoid|cord|spinal|larynx|brainstem|optic|mandible|heart|lung|esoph|rectum|bladder|bowel|liver|kidney|salivary|constrict|submand|cochlea|chiasm|lens|hippocamp|plexus|femoral|penile|brain(?!stem)|combo|comb\s*prtd|combined\s*parot/i;

function mapOrgan(raw: string, hint: string): string | null {
  const s = raw.toLowerCase();
  const h = hint.toLowerCase();
  if (/\bprv\b/.test(s)) return null;
  if (/^combo$/i.test(raw.trim()) || /\bcombo\b/i.test(s)) return "Parotid";
  if (/ptv|gtv|ctv|tumor|targ/.test(s)) return "PTV";
  if (/parot|prtd|prtoid/.test(s)) return "Parotid";
  if (/cord|spinal/.test(s)) return "Spinal Cord";
  if (/larynx/.test(s)) return "Larynx";
  if (h.includes("parotid") || h.includes("prtd")) return "Parotid";
  if (h.includes("cord")) return "Spinal Cord";
  if (h.includes("ptv") || h.includes("gtv")) return "PTV";
  return null;
}

export function inferStructureRole(
  structureName: string,
  fileName?: string,
  declaredType?: string,
): "target" | "oar" {
  const lit = mapOrgan(structureName, fileName ?? "");
  if (lit && TARGET_ORGANS.has(lit)) return "target";
  if (lit) return "oar";

  const combined = `${structureName} ${fileName ?? ""}`.toLowerCase();
  if (OAR_PATTERNS.test(combined)) return "oar";
  if (declaredType === "target" || declaredType === "oar") return declaredType;
  if (/^\s*ptv|gtv|ctv|itv\b/i.test(structureName)) return "target";
  if (/ptv|gtv|ctv|itv/i.test(structureName) && !OAR_PATTERNS.test(structureName)) {
    return "target";
  }
  return "oar";
}
