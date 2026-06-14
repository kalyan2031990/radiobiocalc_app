/** Infer GTV / CTV / PTV from TPS structure label. */
export function inferTargetTypeFromName(name: string): "GTV" | "CTV" | "PTV" {
  const s = name.toLowerCase();
  if (/\bgtv\b/.test(s)) return "GTV";
  if (/\bctv\b/.test(s)) return "CTV";
  return "PTV";
}
