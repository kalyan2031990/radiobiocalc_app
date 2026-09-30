/**
 * v1.3.0 uncertainty verification — Monte-Carlo 95% parameter-uncertainty
 * bands for the bundled reference case RBX-TXT-001 (66 Gy / 33 fx).
 *
 * Produces verification/v1.3.0/v130_uncertainty_results.json containing
 * per-OAR NTCP bands (published TD50 CI where available: Parotid, Spinal
 * Cord, Lung; labelled assumed CV otherwise) and a logistic-form TCP band
 * (labelled assumed). Point estimates must match the v1.2.0 regression gate.
 */
import fs from "fs";
import path from "path";
import {
  offlineEvaluateComposite,
  offlineParseDvh,
} from "../lib/offline-engine";
import { tcpWithUncertainty } from "../server/uncertainty";
import { getTcpSiteParams } from "../server/tcp-site-params";

const root = path.join(__dirname, "..");
const samplePath = path.join(
  root, "samples", "input", "RBX-TXT-001_composite_DVH.txt",
);
const outDir = path.join(root, "verification", "v1.3.0");
fs.mkdirSync(outDir, { recursive: true });

const bundle = offlineParseDvh(
  fs.readFileSync(samplePath, "utf8"),
  path.basename(samplePath),
);
const evaluation = offlineEvaluateComposite(bundle, {
  totalDose: 66,
  numFractions: 33,
  cancerSite: "HN",
  technique: "IMRT",
  prescriptionGy: 66,
  fileHint: path.basename(samplePath),
});

const rows: Record<string, unknown>[] = [];
let failures = 0;

console.log("\nPer-OAR NTCP with 95% parameter-uncertainty band (RBX-TXT-001):");
for (const s of evaluation.structureResults) {
  if (s.structureType !== "oar" || s.ntcp == null || !s.ntcpUncertainty) continue;
  const u = s.ntcpUncertainty;
  const ok =
    Math.abs(u.point - s.ntcp) < 1e-9 &&
    u.p025 <= u.point + 1e-9 &&
    u.p975 >= u.point - 1e-9 &&
    u.p025 >= 0 &&
    u.p975 <= 1;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${s.structureName} (${s.literatureOrgan}): ` +
      `NTCP ${(s.ntcp * 100).toFixed(1)}% ` +
      `[${(u.p025 * 100).toFixed(1)}–${(u.p975 * 100).toFixed(1)}] ` +
      `source=${u.source}`,
  );
  rows.push({
    structure: s.structureName,
    literatureOrgan: s.literatureOrgan,
    ntcpPct: +(s.ntcp * 100).toFixed(2),
    ci95LowPct: +(u.p025 * 100).toFixed(2),
    ci95HighPct: +(u.p975 * 100).toFixed(2),
    source: u.source,
    nSamples: u.nSamples,
    seed: u.seed,
    pass: ok,
  });
}

// Logistic-form TCP band for the primary target (assumed parameter CV —
// labelled; Poisson LQ-DVH point estimate unchanged).
const target = evaluation.structureResults.find(
  (s) => s.structureName === evaluation.primaryTarget,
);
const siteParams = getTcpSiteParams("HN");
let tcpRow: Record<string, unknown> | null = null;
if (target && siteParams) {
  const eud = target.doseMetrics.gEUD;
  const band = tcpWithUncertainty(eud, siteParams.tcd50Gy, siteParams.gamma50);
  const ok = band.p025 <= band.point && band.p975 >= band.point;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  TCP (logistic form, EUD ${eud.toFixed(1)} Gy, TCD50 ${siteParams.tcd50Gy} Gy): ` +
      `${(band.point * 100).toFixed(1)}% ` +
      `[${(band.p025 * 100).toFixed(1)}–${(band.p975 * 100).toFixed(1)}] source=${band.source}`,
  );
  tcpRow = {
    form: "lkb_loglogit",
    eudGy: +eud.toFixed(2),
    tcd50Gy: siteParams.tcd50Gy,
    gamma50: siteParams.gamma50,
    tcpPct: +(band.point * 100).toFixed(2),
    ci95LowPct: +(band.p025 * 100).toFixed(2),
    ci95HighPct: +(band.p975 * 100).toFixed(2),
    source: band.source,
    pass: ok,
  };
}

// Regression anchors: point estimates unchanged vs v1.2.0 gate.
const ntcpCompositePct = evaluation.therapeutic.ntcpComposite * 100;
const anchors = {
  ntcpCompositeUnchanged: Math.abs(ntcpCompositePct - 62.7) <= 0.5,
  twiUnchanged: Math.abs(evaluation.therapeutic.twi * 100 - 40.0) <= 0.5,
  d95Unchanged:
    evaluation.targetIndices != null &&
    Math.abs(evaluation.targetIndices.d95 - 65.4) <= 0.5,
};
for (const [k, v] of Object.entries(anchors)) {
  if (!v) failures++;
  console.log(`${v ? "PASS" : "FAIL"}  regression anchor: ${k}`);
}

const artifact = {
  version: "1.3.0",
  build: 20,
  generatedAt: new Date().toISOString(),
  case: "RBX-TXT-001",
  method:
    "Seeded Monte-Carlo (mulberry32, n=2000/structure) propagation of TD50/γ50 " +
    "uncertainty through the LKB logistic NTCP; published TD50 CIs where " +
    "available (Parotid, Spinal Cord, Lung), labelled assumed CV otherwise. " +
    "Cross-checked against the delta method (tests/uncertainty.test.ts U4).",
  oarBands: rows,
  tcpBand: tcpRow,
  regressionAnchors: anchors,
  summary: { structures: rows.length, failures },
};
fs.writeFileSync(
  path.join(outDir, "v130_uncertainty_results.json"),
  JSON.stringify(artifact, null, 2),
);
console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : "FAILURES PRESENT"} — artifact: verification/v1.3.0/v130_uncertainty_results.json`,
);
process.exit(failures === 0 ? 0 : 1);
