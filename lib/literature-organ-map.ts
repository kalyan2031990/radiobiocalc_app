/** Literature organ mapping — standalone (no circular imports). */

export function mapToLiteratureOrgan(
  rawName: string,
  fileHint?: string,
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
