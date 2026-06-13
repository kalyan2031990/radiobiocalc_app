/** Sanitize internal / test filenames before showing in clinician UI. */

export function formatImportedPlanLabel(raw: string): string {
  const name = raw.trim();
  if (!name) return "Imported plan";
  if (/^bundled_/i.test(name)) return "Anonymised demo plan";
  if (/^dvh_\d+_/i.test(name)) return "Imported plan";
  if (name.includes(" files: ")) {
    const parts = name.replace(/^(\d+) files:\s*/i, "").split(", ");
    if (parts.length > 1) {
      return `${parts.length} plan files (${parts.map(shortName).join(" + ")})`;
    }
  }
  return shortName(name);
}

function shortName(file: string): string {
  const base = file.split(/[/\\]/).pop() ?? file;
  if (/^bundled_/i.test(base)) return "demo";
  return base.length > 40 ? `${base.slice(0, 37)}…` : base;
}
