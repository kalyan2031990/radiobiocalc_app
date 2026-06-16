/**
 * Copy pilot run artifacts to rbGyanX_mobile_paper/pilot_feedback/pilot1
 */
import fs from "fs";
import path from "path";

const KIT =
  process.env.PILOT_KIT?.trim() ||
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "rbGyanX_pilot_study_kit");
const SRC = path.join(KIT, "Pilot_test_results");
const PAPER_SHOTS = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Desktop",
  "rbGyanX_mobile_paper",
  "figures",
  "screenshots",
);
const DEST =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_mobile_paper",
    "pilot_feedback",
    "pilot1",
  );

function copyFile(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn("SKIP missing", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("COPY", path.basename(dest));
}

function copyDir(srcDir: string, destDir: string, ext?: RegExp): void {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (ext && !ext.test(name)) continue;
    copyFile(path.join(srcDir, name), path.join(destDir, name));
  }
}

function main(): void {
  fs.mkdirSync(DEST, { recursive: true });

  for (const f of [
    "PILOT_RUN_REPORT.md",
    "PILOT_RUN_REPORT.json",
    "PILOT_FEEDBACK_SUMMARY.md",
    "rbGyanX_pilot_feedback_FORM_filled.pdf",
    "rbGyanX_pilot_feedback_FORM_blank.pdf",
  ]) {
    copyFile(path.join(SRC, f), path.join(DEST, f));
  }

  copyDir(path.join(SRC, "reports"), path.join(DEST, "reports"));
  copyDir(path.join(SRC, "screenshots"), path.join(DEST, "screenshots"), /\.png$/i);
  copyDir(PAPER_SHOTS, path.join(DEST, "figures_for_paper"), /\.png$/i);

  const readme = [
    "# Pilot 1 — investigator device run",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Kit:** rbGyanX Mobile v1.0.0 (build 15)`,
    `**Device:** Connected Android (see filled feedback form)`,
    "",
    "## Contents",
    "",
    "| Folder / file | Description |",
    "|---------------|-------------|",
    "| `rbGyanX_pilot_feedback_FORM_filled.pdf` | Completed expert feedback form |",
    "| `reports/` | PC-generated clinical composite PDFs + HTML |",
    "| `screenshots/` | Full device UI capture set |",
    "| `figures_for_paper/` | Manuscript-ready figure PNGs |",
    "| `PILOT_RUN_REPORT.md` | Step-by-step automation log |",
    "",
    "## Task metrics",
    "",
    "| Case | TCP | NTCP | TWI |",
    "|------|-----|------|-----|",
    "| RBX-TXT-001 | 95.0% | 62.7% | 35.0% |",
    "| RBX-TXT-004 | 95.0% | 66.3% | 41.7% |",
    "",
    "## Clinical context figures",
    "",
    "- `fig08_clinical_data_xlsx.png` — bundled/uploaded clinical xlsx panel",
    "- `fig09_clinical_context_form.png` — expanded site-specific clinical context fields",
  ].join("\n");

  fs.writeFileSync(path.join(DEST, "README.md"), readme);
  console.log("Package →", DEST);
}

main();
