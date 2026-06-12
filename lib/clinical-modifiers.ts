/**
 * Optional clinical covariate adjustment — OFF by default; traceability-only unless enabled.
 */

export type ClinicalModifierInput = {
  age?: number;
  sex?: string;
  ecog?: number;
  smoking?: string;
  chemo?: boolean;
  hpv?: string;
  stageT?: string;
  stageN?: string;
};

export type ModifierResult = {
  tcpFactor: number;
  ntcpFactor: number;
  applied: boolean;
  note: string;
};

/** Validated coefficient sets — empty until prospective validation; toggle does nothing harmful. */
const VALIDATED_SETS: Record<string, { endpoint: string; citation: string }> = {
  HN_TCP_HPV: {
    endpoint: "HN TCP (HPV+)",
    citation: "Placeholder — enable only after validation study",
  },
};

export function applyClinicalModifiers(
  baseTcp: number | undefined,
  baseNtcp: number | undefined,
  site: string,
  enabled: boolean,
  _covariates: ClinicalModifierInput,
): { tcp?: number; ntcp?: number; provenance: ModifierResult } {
  if (!enabled) {
    return {
      tcp: baseTcp,
      ntcp: baseNtcp,
      provenance: {
        tcpFactor: 1,
        ntcpFactor: 1,
        applied: false,
        note: "Clinical covariates are traceability-only (adjustment disabled).",
      },
    };
  }

  const key = `${site}_TCP_HPV`;
  if (!VALIDATED_SETS[key]) {
    return {
      tcp: baseTcp,
      ntcp: baseNtcp,
      provenance: {
        tcpFactor: 1,
        ntcpFactor: 1,
        applied: false,
        note: `No validated modifier set for ${site}; numbers unchanged.`,
      },
    };
  }

  return {
    tcp: baseTcp,
    ntcp: baseNtcp,
    provenance: {
      tcpFactor: 1,
      ntcpFactor: 1,
      applied: false,
      note: "Modifier layer enabled but no coefficients applied (validation pending).",
    },
  };
}
