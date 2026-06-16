/**
 * Therapeutic window metrics — Brahme P+, Ågren UTCP, Källman product form, rbGyanX TWI.
 * Lee et al. (Niemierko TCP/NTCP); desktop engine/radiobiology/utcp.py.
 */

import { capTcpForDisplay } from "@/lib/tcp-display";

export type OarNtcpEntry = {
  structureName: string;
  literatureOrgan: string;
  ntcp: number;
  riskWeight: number;
};

export type TherapeuticWindowResult = {
  /** Display TCP (capped for clinician UI). */
  tcp: number;
  /** Uncapped model TCP (0–1). */
  tcpRaw: number;
  tcpCapped: boolean;
  tcpModel: string;
  tcpStructure: string;
  ntcpComposite: number;
  ntcpCritical: number;
  /** UTCP = TCP × Π(1 − NTCP_k) — Ågren 1995 */
  utcp: number;
  /** P+ = TCP − NTCP_critical — Brahme 1984 */
  pPlus: number;
  /** CFTC = TCP × Π(1 − NTCP_i) — same product as UTCP when all OARs included */
  cftc: number;
  /** TWI = TCP − Σ(λ_k × NTCP_k) — rbGyanX decision support */
  twi: number;
  twiInterpretation: "Favorable" | "Moderate" | "Unfavorable";
  oarEntries: OarNtcpEntry[];
  references: string[];
};

/** HN OAR risk weights (rbGyanX manual / UTCP map). */
export const OAR_RISK_WEIGHTS: Record<string, number> = {
  "Spinal Cord": 1.0,
  Brainstem: 1.0,
  "Optic Nerve": 1.0,
  Chiasm: 1.0,
  Mandible: 0.7,
  Larynx: 0.7,
  "Pharyngeal Constrictor": 0.7,
  Heart: 0.9,
  Lung: 0.8,
  Esophagus: 0.7,
  Parotid: 0.3,
  "Submandibular": 0.4,
  Bowel: 0.7,
  Rectum: 0.7,
  Bladder: 0.6,
  Liver: 0.6,
  Kidney: 0.6,
  Brain: 0.5,
  Cochlea: 0.5,
  Lens: 0.5,
  Hippocampus: 0.5,
  "Brachial Plexus": 0.8,
  "Femoral Head": 0.4,
};

export function riskWeightForOrgan(literatureOrgan: string): number {
  if (OAR_RISK_WEIGHTS[literatureOrgan] != null) {
    return OAR_RISK_WEIGHTS[literatureOrgan];
  }
  const key = Object.keys(OAR_RISK_WEIGHTS).find(
    (k) => k.toLowerCase() === literatureOrgan.toLowerCase(),
  );
  return key ? OAR_RISK_WEIGHTS[key] : 0.5;
}

export function interpretTwi(twi: number): TherapeuticWindowResult["twiInterpretation"] {
  if (twi >= 0.15) return "Favorable";
  if (twi >= 0) return "Moderate";
  return "Unfavorable";
}

/**
 * Composite therapeutic metrics from one TCP (target) and OAR NTCP list.
 */
export function computeTherapeuticWindow(
  tcp: number,
  tcpModel: string,
  tcpStructure: string,
  oarEntries: OarNtcpEntry[],
): TherapeuticWindowResult {
  const { display: tcpC, raw: tcpRaw, capped: tcpCapped } = capTcpForDisplay(tcp);
  const entries = oarEntries.map((e) => ({
    ...e,
    ntcp: Math.min(1, Math.max(0, e.ntcp)),
    riskWeight: e.riskWeight ?? riskWeightForOrgan(e.literatureOrgan),
  }));

  let product = 1;
  let weightedSum = 0;
  let ntcpMax = 0;
  let ntcpCritical = 0;

  for (const e of entries) {
    product *= 1 - e.ntcp;
    weightedSum += e.riskWeight * e.ntcp;
    if (e.ntcp > ntcpMax) ntcpMax = e.ntcp;
    if (e.riskWeight >= 0.9 && e.ntcp > ntcpCritical) {
      ntcpCritical = e.ntcp;
    }
  }
  if (ntcpCritical === 0) ntcpCritical = ntcpMax;

  const utcp = tcpRaw * product;
  const cftc = utcp;
  const pPlus = tcpRaw - ntcpCritical;
  const twi = tcpRaw - weightedSum;

  return {
    tcp: tcpC,
    tcpRaw,
    tcpCapped,
    tcpModel,
    tcpStructure,
    ntcpComposite: ntcpMax,
    ntcpCritical,
    utcp,
    pPlus,
    cftc,
    twi,
    twiInterpretation: interpretTwi(twi),
    oarEntries: entries,
    references: [
      "Brahme A. Int J Radiat Oncol Biol Phys. 1984 — P+",
      "Ågren Cronqvist AK. Radiother Oncol. 1995 — UTCP",
      "Källman P et al. Phys Med Biol 1992 — TCP×Π(1−NTCP)",
      "Niemierko A. Med Phys 1997 — EUD TCP/NTCP (Lee et al. 2015)",
    ],
  };
}
