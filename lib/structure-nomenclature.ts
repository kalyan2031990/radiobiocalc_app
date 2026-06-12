/**
 * TG-263–aware structure normalization and role classification.
 */

import { mapToLiteratureOrgan } from "@/lib/literature-organ-map";

export type StructureClassification = {
  normalizedName: string;
  role: "target" | "oar";
  literatureOrgan: string | null;
  confidence: "high" | "medium" | "low";
  tg263Hint?: string;
};

/** TG-263 and clinical aliases → canonical organ / target label. */
const TG263_ALIASES: Record<string, { organ: string; role: "target" | "oar"; tg263?: string }> = {
  ptv: { organ: "PTV", role: "target", tg263: "PTV" },
  gtv: { organ: "GTV", role: "target", tg263: "GTV" },
  gtvP: { organ: "GTV", role: "target", tg263: "GTVp" },
  ctv: { organ: "CTV", role: "target", tg263: "CTV" },
  ctvP: { organ: "CTV", role: "target", tg263: "CTVp" },
  itv: { organ: "ITV", role: "target", tg263: "ITV" },
  "ptv 60gy/30fr": { organ: "PTV", role: "target" },
  comb_prtd: { organ: "Parotid", role: "oar" },
  comb_prt: { organ: "Parotid", role: "oar" },
  combprtd: { organ: "Parotid", role: "oar" },
  parotid: { organ: "Parotid", role: "oar", tg263: "Parotid_L/R" },
  parotid_l: { organ: "Parotid", role: "oar", tg263: "Parotid_L" },
  parotid_r: { organ: "Parotid", role: "oar", tg263: "Parotid_R" },
  larynx: { organ: "Larynx", role: "oar", tg263: "Larynx" },
  laryanx: { organ: "Larynx", role: "oar" },
  spinalcord: { organ: "Spinal Cord", role: "oar", tg263: "SpinalCord" },
  cord: { organ: "Spinal Cord", role: "oar" },
  "prv cord": { organ: "Spinal Cord", role: "oar" },
  prvcord: { organ: "Spinal Cord", role: "oar" },
  lung_r: { organ: "Lung", role: "oar", tg263: "Lung_R" },
  lung_l: { organ: "Lung", role: "oar", tg263: "Lung_L" },
  lungtotal: { organ: "Lung", role: "oar" },
  "lung-ptv60": { organ: "Lung", role: "oar" },
  lungrptv60: { organ: "Lung", role: "oar" },
  heart: { organ: "Heart", role: "oar", tg263: "Heart" },
};

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeStructureName(name: string): string {
  const key = normalizeKey(name);
  const alias = TG263_ALIASES[key];
  if (alias) return alias.organ;
  const lit = mapToLiteratureOrgan(name);
  return lit ?? name.trim();
}

export function classifyStructure(
  structureName: string,
  fileHint?: string,
): StructureClassification {
  const key = normalizeKey(structureName);
  const alias = TG263_ALIASES[key];
  if (alias) {
    return {
      normalizedName: alias.organ,
      role: alias.role,
      literatureOrgan: alias.organ,
      confidence: "high",
      tg263Hint: alias.tg263,
    };
  }

  const lit = mapToLiteratureOrgan(structureName, fileHint);
  if (lit) {
    const role =
      /^(PTV|GTV|CTV|ITV)$/i.test(lit) || /ptv|gtv|ctv|itv/i.test(structureName)
        ? "target"
        : "oar";
    return {
      normalizedName: lit,
      role,
      literatureOrgan: lit,
      confidence: "medium",
    };
  }

  if (/ptv|gtv|ctv|itv|targ/i.test(structureName)) {
    return {
      normalizedName: "PTV",
      role: "target",
      literatureOrgan: "PTV",
      confidence: "low",
    };
  }

  return {
    normalizedName: structureName,
    role: "oar",
    literatureOrgan: null,
    confidence: "low",
  };
}

export function isAmbiguousStructure(name: string): boolean {
  const c = classifyStructure(name);
  return c.confidence === "low" && c.literatureOrgan == null;
}
