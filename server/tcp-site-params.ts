/**
 * Site-specific TCP parameters (aligned with engine/config/site_params.py).
 */

export interface TCPSiteParams {
  site: string;
  alphaGyInv: number;
  betaGyInv2: number;
  alphaBetaGy: number;
  n0Gtv: number;
  n0Ctv: number;
  tpotDays: number;
  tkDays: number | null;
  tcd50Gy: number;
  gamma50: number;
  geudA: number;
  lqValidMaxDpfGy: number;
  repopulationRelevant: boolean;
  notes: string;
}

export const TCP_SITE_PARAMS: Record<string, TCPSiteParams> = {
  BRAIN_GBM: {
    site: "BRAIN_GBM",
    alphaGyInv: 0.3,
    betaGyInv2: 0.033,
    alphaBetaGy: 9,
    n0Gtv: 1e8,
    n0Ctv: 1e5,
    tpotDays: 8,
    tkDays: 21,
    tcd50Gy: 60,
    gamma50: 1.8,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: true,
    notes: "GBM — Stupp 60 Gy/30 fx; Zaider-Minerbo repopulation.",
  },
  BRAIN_METS: {
    site: "BRAIN_METS",
    alphaGyInv: 0.3,
    betaGyInv2: 0.03,
    alphaBetaGy: 10,
    n0Gtv: 1e6,
    n0Ctv: 1e4,
    tpotDays: 10,
    tkDays: null,
    tcd50Gy: 19,
    gamma50: 2.5,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: false,
    notes: "Brain mets SRS — physical dose; LQ caution.",
  },
  HN: {
    site: "HN",
    alphaGyInv: 0.35,
    betaGyInv2: 0.035,
    alphaBetaGy: 10,
    n0Gtv: 1e7,
    n0Ctv: 1e5,
    tpotDays: 4,
    tkDays: 21,
    tcd50Gy: 60,
    gamma50: 2,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: true,
    notes: "H&N SCC — repopulation after Tk (Fowler, Jones).",
  },
  LUNG: {
    site: "LUNG",
    alphaGyInv: 0.3,
    betaGyInv2: 0.034,
    alphaBetaGy: 8.8,
    n0Gtv: 1e6,
    n0Ctv: 1e4,
    tpotDays: 7,
    tkDays: null,
    tcd50Gy: 84.5,
    gamma50: 1.8,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: false,
    notes: "Thoracic NSCLC.",
  },
  BREAST: {
    site: "BREAST",
    alphaGyInv: 0.2,
    betaGyInv2: 0.057,
    alphaBetaGy: 3.5,
    n0Gtv: 5e5,
    n0Ctv: 1e4,
    tpotDays: 12,
    tkDays: null,
    tcd50Gy: 68,
    gamma50: 1.5,
    geudA: -9,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: false,
    notes: "Breast — low α/β (START trials).",
  },
  CERVIX: {
    site: "CERVIX",
    alphaGyInv: 0.35,
    betaGyInv2: 0.035,
    alphaBetaGy: 10,
    n0Gtv: 1e7,
    n0Ctv: 1e5,
    tpotDays: 3,
    tkDays: 21,
    tcd50Gy: 56,
    gamma50: 2,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: true,
    notes: "Cervix — EMBRACE-style 45–50 Gy EQD2; repopulation relevant.",
  },
  RECTUM: {
    site: "RECTUM",
    alphaGyInv: 0.35,
    betaGyInv2: 0.035,
    alphaBetaGy: 10,
    n0Gtv: 1e7,
    n0Ctv: 1e5,
    tpotDays: 5,
    tkDays: null,
    tcd50Gy: 60,
    gamma50: 1.8,
    geudA: -10,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: false,
    notes: "Rectal cancer — neoadjuvant CRT context.",
  },
  PROSTATE: {
    site: "PROSTATE",
    alphaGyInv: 0.15,
    betaGyInv2: 0.05,
    alphaBetaGy: 3,
    n0Gtv: 1e6,
    n0Ctv: 1e4,
    tpotDays: 5,
    tkDays: null,
    tcd50Gy: 70,
    gamma50: 1.5,
    geudA: -8,
    lqValidMaxDpfGy: 10,
    repopulationRelevant: false,
    notes: "Prostate — low α/β; hypofractionation common.",
  },
};

export function getTcpSiteParams(siteKey: string): TCPSiteParams | null {
  const key = siteKey.toUpperCase();
  const map: Record<string, string> = {
    BRAIN: "BRAIN_GBM",
    BRAIN_GBM: "BRAIN_GBM",
    BRAIN_METS: "BRAIN_METS",
    HN: "HN",
    LUNG: "LUNG",
    BREAST: "BREAST",
    CERVIX: "CERVIX",
    RECTUM: "RECTUM",
    PROSTATE: "PROSTATE",
  };
  const resolved = map[key] ?? key;
  return TCP_SITE_PARAMS[resolved] ?? null;
}

export function n0ForTarget(
  site: TCPSiteParams,
  targetType: string
): number {
  const t = targetType.toUpperCase();
  if (t === "GTV") return site.n0Gtv;
  if (t === "CTV" || t === "PTV") return site.n0Ctv;
  return site.n0Gtv;
}
