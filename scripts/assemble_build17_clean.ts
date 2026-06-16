/**
 * Assemble supplementary_data_build17_clean for manuscript handoff.
 *
 * Usage:
 *   npx tsx scripts/assemble_build17_clean.ts
 */
import fs from "fs";
import path from "path";

const PAPER = process.env.PAPER_ROOT?.trim() || path.join(process.cwd(), "..", "rbGyanX_mobile_paper");
const SRC_INPUT = path.join(PAPER, "revised", "supplementary_data_build16", "input");
const SRC_OUT = path.join(PAPER, "revised", "supplementary_data_build17", "output");
const SRC_FIG = path.join(PAPER, "figures_build17");
const DEST = path.join(PAPER, "revised", "supplementary_data_build17_clean");

function cp(src: string, dest: string) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(src: string, dest: string, filter?: (name: string) => boolean) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (filter && !filter(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) cpDir(s, d, filter);
    else cp(s, d);
  }
}

function main() {
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });

  cpDir(SRC_INPUT, path.join(DEST, "input"));
  cpDir(SRC_OUT, path.join(DEST, "output"), (n) => !n.endsWith(".log"));

  const figDest = path.join(DEST, "figures");
  fs.mkdirSync(figDest, { recursive: true });
  for (const name of [
    "fig1_architecture.png",
    "fig2_app_workflow.png",
    "fig3_verification.png",
    "fig4_percase.png",
    "fig5_sensitivity.png",
    "fig6_validation_workflow.png",
  ]) {
    const src = path.join(SRC_FIG, name);
    if (fs.existsSync(src)) cp(src, path.join(figDest, name));
  }
  cpDir(path.join(SRC_FIG, "screenshots"), path.join(figDest, "screenshots"));

  const scriptsDest = path.join(DEST, "scripts");
  fs.mkdirSync(scriptsDest, { recursive: true });
  for (const name of [
    "independent_verification.py",
    "audit_radiobiology_full.ts",
    "generate_followup_review_artifacts.ts",
  ]) {
    const fromRepo = path.join(process.cwd(), "scripts", name);
    const fromFig = path.join(SRC_FIG, "make_figures.py");
    if (name === "make_figures.py" && fs.existsSync(fromFig)) {
      cp(fromFig, path.join(scriptsDest, name));
    } else if (fs.existsSync(fromRepo)) {
      cp(fromRepo, path.join(scriptsDest, name));
    }
  }
  const makeFig = path.join(SRC_FIG, "make_figures.py");
  if (fs.existsSync(makeFig)) cp(makeFig, path.join(scriptsDest, "make_figures.py"));

  const changelog = path.join(process.cwd(), "CHANGELOG_build17.md");
  if (fs.existsSync(changelog)) cp(changelog, path.join(DEST, "CHANGELOG_build17.md"));

  const notes = path.join(SRC_OUT, "VERIFICATION_NOTES.md");
  if (fs.existsSync(notes)) cp(notes, path.join(DEST, "VERIFICATION_NOTES.md"));

  const readme = `# rbGyanX Mobile — supplementary data (build 17, v1.0.1)

Offline radiobiology validation package for the rbGyanX Mobile manuscript.

- **App release:** [v1.0.1-build17](https://github.com/kalyan2031990/radiobiocalc_app/releases/tag/v1.0.1-build17)
- **Version:** 1.0.1 (versionCode 17)
- **Cases:** 17 composite DVHs (3 DICOM-route, 14 Eclipse text-route)

## Layout

| Folder | Contents |
|--------|----------|
| \`input/\` | Composite DVHs, clinical xlsx, case_manifest.md |
| \`output/\` | Engine audit, independent parity, device validation, D1–D10 review artefacts, APK |
| \`figures/\` | Manuscript figures (1200 dpi, no baked titles) + raw screenshots |
| \`scripts/\` | Reproducible audit, verification, figure generation |

See \`VERIFICATION_NOTES.md\` for parity summary and validation tier results.
`;
  fs.writeFileSync(path.join(DEST, "README.md"), readme, "utf8");

  console.log(`Assembled ${DEST}`);
}

main();
