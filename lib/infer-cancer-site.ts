/**
 * Infer cancer site from DVH structure names — never guess H&N from dose/fraction alone.
 */

import type { CancerSiteId } from "@/server/sites-registry";

export type SiteInference = {
  siteId: CancerSiteId | "UNKNOWN";
  confidence: "high" | "low" | "none";
  reason: string;
};

const SITE_KEYWORDS: { site: CancerSiteId; patterns: RegExp[] }[] = [
  {
    site: "PROSTATE",
    patterns: [/prostate/i, /seminal/i, /penile/i, /neurovascular/i],
  },
  {
    site: "RECTUM",
    patterns: [/rectum/i, /anal/i, /mesorect/i],
  },
  {
    site: "CERVIX",
    patterns: [/cervix/i, /uterus/i, /endometr/i, /vagina/i, /ovary/i],
  },
  {
    site: "BREAST",
    patterns: [/breast/i, /chestwall/i, /mammary/i],
  },
  {
    site: "LUNG",
    patterns: [/\blung\b/i, /lobe/i, /bronch/i, /mediastin/i],
  },
  {
    site: "BRAIN",
    patterns: [/brain/i, /hippocamp/i, /cochlea/i, /chiasm/i, /optic/i, /glioma/i],
  },
  {
    site: "HN",
    patterns: [
      /parotid/i,
      /larynx/i,
      /pharyn/i,
      /constrict/i,
      /mandible/i,
      /submand/i,
      /oral/i,
      /tongue/i,
      /nasoph/i,
      /oroph/i,
    ],
  },
];

export function inferCancerSiteFromStructureNames(
  structureNames: string[],
  fileHint = "",
): SiteInference {
  const hay = [...structureNames, fileHint].join(" ").toLowerCase();
  if (!hay.trim()) {
    return {
      siteId: "UNKNOWN",
      confidence: "none",
      reason: "No structure names to infer site",
    };
  }

  const hits: CancerSiteId[] = [];
  for (const { site, patterns } of SITE_KEYWORDS) {
    if (patterns.some((p) => p.test(hay))) hits.push(site);
  }

  const unique = [...new Set(hits)];
  if (unique.length === 1) {
    return {
      siteId: unique[0],
      confidence: "high",
      reason: `Matched structures/file hint for ${unique[0]}`,
    };
  }
  if (unique.length > 1) {
    return {
      siteId: "UNKNOWN",
      confidence: "low",
      reason: `Ambiguous site signals: ${unique.join(", ")} — select site manually`,
    };
  }

  return {
    siteId: "UNKNOWN",
    confidence: "none",
    reason:
      "No anatomical keyword match — select cancer site in setup (not inferred from dose/fraction)",
  };
}

/** Resolve site: explicit user choice wins; never auto-map UNKNOWN → HN. */
export function resolveCancerSite(
  userSite: string | undefined,
  structureNames: string[],
  fileHint?: string,
): { siteId: string; inference?: SiteInference } {
  const normalized = (userSite ?? "").trim().toUpperCase();
  if (normalized && normalized !== "UNKNOWN") {
    return { siteId: normalized };
  }
  const inferred = inferCancerSiteFromStructureNames(structureNames, fileHint);
  if (inferred.siteId !== "UNKNOWN" && inferred.confidence === "high") {
    return { siteId: inferred.siteId, inference: inferred };
  }
  return {
    siteId: normalized || "UNKNOWN",
    inference: inferred,
  };
}
