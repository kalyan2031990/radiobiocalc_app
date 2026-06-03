/**
 * Single-patient / single-plan helpers for mobile rbGyanX.
 */

export type DVHPoint = { dose: number; volume: number };

export type ParsedDvhBundle = {
  patientInfo?: {
    patientId?: string;
    patientName?: string;
    modality?: string;
  };
  structures: { name: string; type?: string }[];
  dvhByStructure: Record<string, DVHPoint[]>;
  doseUnit?: string;
  volumeUnit?: string;
};

export function parseDvhBundle(json: string | undefined): ParsedDvhBundle | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ParsedDvhBundle;
  } catch {
    return null;
  }
}

export function structureKeys(bundle: ParsedDvhBundle): string[] {
  return Object.keys(bundle.dvhByStructure ?? {}).filter(
    (k) => (bundle.dvhByStructure[k]?.length ?? 0) > 0,
  );
}

import { inferEvaluationRole } from "@/lib/structure-role";

export function inferStructureType(
  name: string,
  declaredType?: string,
  fileHint?: string,
): "target" | "oar" {
  return inferEvaluationRole(name, fileHint, declaredType);
}

export type PlanDescriptiveStats = {
  nPoints: number;
  doseMeanGy: number;
  doseStdGy: number;
  doseMedianGy: number;
  doseMinGy: number;
  doseMaxGy: number;
  volumeTotalCc: number;
  doseCoeffVar: number;
  interpretation: string;
};

/** Map TPS structure label to literature organ key in parameters.ts */
export function mapToLiteratureOrgan(
  rawName: string,
  fileHint?: string
): string | null {
  const hint = fileHint ?? "";
  const s = rawName.toLowerCase();
  if (/\bprv\b/.test(s)) return null;
  if (/^combo$/i.test(s.trim()) || /\bcombo\b/.test(s)) return "Parotid";
  if (/ptv|gtv|ctv|tumor|targ/.test(s)) return "PTV";
  if (/parot|prtd|prtoid/.test(s)) return "Parotid";
  if (/larynx|laryn/.test(s)) return "Larynx";
  if (/cord|spinal/.test(s)) return "Spinal Cord";
  if (/brainstem|brain\s*stem/.test(s)) return "Brainstem";
  if (/optic/.test(s)) return "Optic Nerve";
  if (/\blung\b/.test(s)) return "Lung";
  if (/\bheart\b/.test(s)) return "Heart";
  if (/esoph/.test(s)) return "Esophagus";
  if (/rectum/.test(s)) return "Rectum";
  if (/bladder/.test(s)) return "Bladder";
  if (/prostate/.test(s)) return "Prostate";
  if (/breast/.test(s)) return "Breast";
  if (/bowel|intestin|bag|sigmoid|rectosigmoid/.test(s)) return "Bowel";
  if (/femoral|femur/.test(s)) return "Femoral Head";
  if (/hippocamp/.test(s)) return "Hippocampus";
  if (/cochlea/.test(s)) return "Cochlea";
  if (/chiasm/.test(s)) return "Chiasm";
  if (/lens|eye/.test(s)) return "Lens";
  if (/mandible|jaw/.test(s)) return "Mandible";
  if (/constrict|pcm|pharyn/.test(s)) return "Pharyngeal Constrictor";
  if (/submand|smg/.test(s)) return "Submandibular";
  if (/plexus|brachial/.test(s)) return "Brachial Plexus";
  if (/penile|bulb/.test(s)) return "Penile Bulb";
  if (/\bitv\b/.test(s)) return "ITV";
  if (/brain(?!stem)/.test(s)) return "Brain";

  const h = hint.toLowerCase();
  if (h.includes("parotid") || h.includes("prtd")) return "Parotid";
  if (h.includes("larynx")) return "Larynx";
  if (h.includes("cord")) return "Spinal Cord";
  if (h.includes("ptv") || h.includes("gtv") || h.includes("ctv")) return "PTV";
  return null;
}

export function computePlanDescriptiveStats(dvh: DVHPoint[]): PlanDescriptiveStats {
  if (dvh.length === 0) {
    return {
      nPoints: 0,
      doseMeanGy: 0,
      doseStdGy: 0,
      doseMedianGy: 0,
      doseMinGy: 0,
      doseMaxGy: 0,
      volumeTotalCc: 0,
      doseCoeffVar: 0,
      interpretation: "No DVH points",
    };
  }

  const sorted = [...dvh].sort((a, b) => a.dose - b.dose);
  const doses = sorted.map((p) => p.dose);
  const volMax = Math.max(...sorted.map((p) => p.volume), 1);
  const relV = sorted.map((p) => p.volume / volMax);
  const mean = relV.reduce((s, v, i) => s + v * doses[i], 0);
  const variance =
    relV.reduce((s, v, i) => s + v * Math.pow(doses[i] - mean, 2), 0) /
    Math.max(relV.reduce((a, b) => a + b, 0), 1e-9);
  const std = Math.sqrt(variance);
  const mid = Math.floor(doses.length / 2);
  const median =
    doses.length % 2 === 0
      ? (doses[mid - 1] + doses[mid]) / 2
      : doses[mid];
  const cv = mean > 0 ? std / mean : 0;

  let interpretation = "Uniform dose distribution (low heterogeneity)";
  if (cv > 0.35) {
    interpretation = "High dose heterogeneity — review hot/cold spots for plan QA";
  } else if (cv > 0.2) {
    interpretation = "Moderate heterogeneity — typical for complex OAR DVHs";
  }

  return {
    nPoints: dvh.length,
    doseMeanGy: mean,
    doseStdGy: std,
    doseMedianGy: median,
    doseMinGy: Math.min(...doses),
    doseMaxGy: Math.max(...doses),
    volumeTotalCc: volMax,
    doseCoeffVar: cv,
    interpretation,
  };
}
