/**
 * Assemble supplementary_data_build17 for Zenodo / handoff refresh.
 *
 * Usage:
 *   npx tsx scripts/assemble_build17_clean.ts
 */
import fs from "fs";
import path from "path";

const PAPER = process.env.PAPER_ROOT?.trim() || path.join(process.cwd(), "..", "rbGyanX_mobile_paper");
const SRC = path.join(PAPER, "revised", "supplementary_data_build17");
const SRC_INPUT = path.join(SRC, "input");
const SRC_OUT = path.join(SRC, "output");
const SRC_FIG = path.join(SRC, "figures");
const DEST = process.env.ASSEMBLE_DEST?.trim() || SRC;
const ZIP = path.join(PAPER, "rbGyanX_ZENODO_DATA_build17.zip");

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
  // Sync repo scripts into package scripts/
  const scriptsDest = path.join(SRC, "scripts");
  fs.mkdirSync(scriptsDest, { recursive: true });
  for (const name of [
    "independent_verification.py",
    "audit_radiobiology_full.ts",
    "generate_followup_review_artifacts.ts",
    "run_build17_fig2_screenshots.ts",
  ]) {
    const fromRepo = path.join(process.cwd(), "scripts", name);
    if (fs.existsSync(fromRepo)) cp(fromRepo, path.join(scriptsDest, name));
  }
  if (fs.existsSync(path.join(SRC_FIG, "make_figures.py"))) {
    cp(path.join(SRC_FIG, "make_figures.py"), path.join(scriptsDest, "make_figures.py"));
  }

  if (DEST !== SRC) {
    if (fs.existsSync(DEST)) fs.rmSync(DEST, { recursive: true, force: true });
    fs.mkdirSync(DEST, { recursive: true });
    cpDir(SRC_INPUT, path.join(DEST, "input"));
    cpDir(SRC_OUT, path.join(DEST, "output"), (n) => !n.endsWith(".log"));
    cpDir(SRC_FIG, path.join(DEST, "figures"));
    cpDir(scriptsDest, path.join(DEST, "scripts"));
  }

  if (fs.existsSync(ZIP)) fs.unlinkSync(ZIP);
  const { execSync } = require("child_process") as typeof import("child_process");
  execSync(
    `powershell -Command "Compress-Archive -Path '${SRC}\\*' -DestinationPath '${ZIP}' -Force"`,
    { stdio: "inherit" },
  );
  console.log(`Package ready: ${SRC}`);
  console.log(`Zenodo zip: ${ZIP}`);
}

main();
