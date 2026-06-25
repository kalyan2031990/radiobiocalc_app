/**
 * Parameter library — browsable, versioned catalogue; engine reads via getOrganParameters (unchanged).
 */

import { getOrganParameters as engineGetOrganParameters } from "@/server/parameters";
import type { OrganParameters } from "@/server/radiobiology";
import type { RadiobiologyModelId } from "@/server/parameters";
import { buildParameterLibrary, getModelLabel } from "./entries";
import type { ParameterLibraryEntry, ParameterLibraryFilter } from "./types";

export {
  PARAMETER_LIBRARY_VERSION,
  type ParameterLibraryEntry,
  type ParameterLibraryFilter,
  type ParameterCitation,
  type ParameterCi95,
} from "./types";

export { buildParameterLibrary, getModelLabel };

let _cache: ParameterLibraryEntry[] | null = null;

export function getParameterLibrary(): ParameterLibraryEntry[] {
  if (!_cache) _cache = buildParameterLibrary();
  return _cache;
}

export function getLibraryEntry(id: string): ParameterLibraryEntry | undefined {
  return getParameterLibrary().find((e) => e.id === id);
}

export function getLibraryEntryForOrganModel(
  organ: string,
  model: string,
): ParameterLibraryEntry | undefined {
  return getParameterLibrary().find((e) => e.organ === organ && e.model === model);
}

export function filterParameterLibrary(
  filter: ParameterLibraryFilter,
): ParameterLibraryEntry[] {
  const q = filter.query?.trim().toLowerCase();
  return getParameterLibrary().filter((e) => {
    if (filter.organ && e.organ !== filter.organ) return false;
    if (filter.model && e.model !== filter.model) return false;
    if (filter.category && e.category !== filter.category) return false;
    if (q) {
      const hay = [
        e.organ,
        e.endpoint,
        e.model,
        getModelLabel(e.model),
        e.cohort,
        e.citation.authors,
        e.citation.title,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getLibraryCategories(): string[] {
  return [...new Set(getParameterLibrary().map((e) => e.category))].sort();
}

export function getLibraryOrgans(): string[] {
  return [...new Set(getParameterLibrary().map((e) => e.organ))].sort();
}

/** Engine adapter — numerics identical to build-17 getOrganParameters. */
export function getOrganParameters(
  organ: string,
  model: string = "lkb_loglogit",
): OrganParameters | null {
  return engineGetOrganParameters(organ, model);
}

export function citationUrl(entry: ParameterLibraryEntry): string | null {
  if (entry.citation.doi) return `https://doi.org/${entry.citation.doi}`;
  if (entry.citation.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${entry.citation.pmid}/`;
  return null;
}

/** Collect unique citations used in a composite evaluation. */
export function collectCitationsForStructures(
  items: Array<{ organ: string; model: string }>,
): ParameterLibraryEntry[] {
  const seen = new Set<string>();
  const out: ParameterLibraryEntry[] = [];
  for (const { organ, model } of items) {
    const e = getLibraryEntryForOrganModel(organ, model);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}
