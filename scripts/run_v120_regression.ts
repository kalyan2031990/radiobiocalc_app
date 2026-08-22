/**
 * v1.2.0 regression + verification harness.
 *
 * 1. Evaluates the repo-bundled cohort case RBX-TXT-001 (66 Gy / 33 fx) with
 *    the default composite models and compares composite NTCP / TWI / D95
 *    against the frozen build-18 parity record (parity.json). The S1–S6 fixes
 *    must NOT alter the default-path results on cumulative inputs.
 * 2. Exercises the fixed code paths directly (generic Poisson TCP/NTCP,
 *    differential-path Dxx, OAR V-metric suppression, EUD=gEUD).
 * 3. Writes a machine-readable artifact to verification/v1.2.0/.
 */
import fs from "fs";
import path from "path";
import {
  offlineEvaluateComposite,
  offlineParseDvh,
} from "../lib/offline-engine";
import {
  calculateDoseMetrics,
  calculateNTCP_Poisson,
  calculateTCP_Poisson,
  performCalculation,
} from "../server/radiobiology";

const root = path.join(__dirname, "..");
const samplePath = path.join(
  root,
  "samples",
  "input",
  "RBX-TXT-001_composite_DVH.txt",
);
const parityPath = path.join(root, "parity.json");
const outDir = path.join(root, "verification", "v1.2.0");
fs.mkdirSync(outDir, { recursive: true });

type Check = {
  id: string;
  description: string;
  value: number | string | boolean | null;
  reference?: number | string;
  tolerance?: number;
  pass: boolean;
};

const checks: Check[] = [];
let failures = 0;
function record(c: Check) {
  checks.push(c);
  if (!c.pass) failures++;
  console.log(
    `${c.pass ? "PASS" : "FAIL"}  ${c.id}  ${c.description}  value=${c.value}` +
      (c.reference !== undefined ? `  ref=${c.reference} ±${c.tolerance}` : ""),
  );
}

// ── 1. Composite regression vs frozen build-18 parity record ────────────────
const content = fs.readFileSync(samplePath, "utf8");
const bundle = offlineParseDvh(content, path.basename(samplePath));
const evaluation = offlineEvaluateComposite(bundle, {
  totalDose: 66,
  numFractions: 33,
  cancerSite: "HN",
  technique: "IMRT",
  prescriptionGy: 66,
  fileHint: path.basename(samplePath),
});

const parity = JSON.parse(fs.readFileSync(parityPath, "utf8")) as {
  case: string;
  ntcp_app: number;
  twi_app: number;
  d95_app: number;
}[];
const ref = parity.find((p) => p.case === "RBX-TXT-001");

const ntcpCompositePct = evaluation.therapeutic.ntcpComposite * 100;
const twiPct = evaluation.therapeutic.twi * 100;
const d95 = evaluation.targetIndices?.d95 ?? NaN;

if (ref) {
  record({
    id: "R1",
    description: "Composite NTCP vs build-18 parity record",
    value: +ntcpCompositePct.toFixed(2),
    reference: ref.ntcp_app,
    tolerance: 0.5,
    pass: Math.abs(ntcpCompositePct - ref.ntcp_app) <= 0.5,
  });
  // NOTE: parity.json's TWI column is the LEGACY build-16 record computed from
  // DISPLAY-CAPPED TCP (95%): 0.95 − ΣλNTCP = 35.0. Build 17 corrected composite
  // metrics to use UNCAPPED TCP (manuscript §2.1), so the correct current value
  // is tcpRaw − ΣλNTCP = 40.0. R2 verifies the identity and the post-fix value.
  const lambdaSum = evaluation.therapeutic.oarEntries.reduce(
    (s, e) => s + e.riskWeight * e.ntcp, 0,
  );
  const twiExpected = (evaluation.therapeutic.tcpRaw - lambdaSum) * 100;
  record({
    id: "R2",
    description: "TWI = uncapped TCP − Σλ·NTCP identity; post-build-17 value 40.0",
    value: +twiPct.toFixed(2),
    reference: +twiExpected.toFixed(2),
    tolerance: 0.01,
    pass:
      Math.abs(twiPct - twiExpected) <= 0.01 &&
      Math.abs(twiPct - 40.0) <= 0.5,
  });
  record({
    id: "R3",
    description: "D95 vs build-18 parity record",
    value: +d95.toFixed(2),
    reference: ref.d95_app,
    tolerance: 0.5,
    pass: Math.abs(d95 - ref.d95_app) <= 0.5,
  });
} else {
  record({
    id: "R0",
    description: "parity.json contains RBX-TXT-001",
    value: false,
    pass: false,
  });
}

// ── 2. Fixed-path spot checks ───────────────────────────────────────────────
record({
  id: "S1a",
  description: "Generic Poisson TCP(TCD50) = 0.5",
  value: +calculateTCP_Poisson(50, 50, 2).toFixed(6),
  reference: 0.5,
  tolerance: 1e-6,
  pass: Math.abs(calculateTCP_Poisson(50, 50, 2) - 0.5) < 1e-6,
});
const tcpLow = calculateTCP_Poisson(10, 50, 2);
const tcpHigh = calculateTCP_Poisson(100, 50, 2);
record({
  id: "S1b",
  description: "Generic Poisson TCP monotone increasing (10 Gy < 100 Gy)",
  value: `${tcpLow.toFixed(4)} < ${tcpHigh.toFixed(4)}`,
  pass: tcpLow < 0.05 && tcpHigh > 0.95,
});
record({
  id: "S2a",
  description: "Generic Poisson NTCP(D50) = 0.5 (ln2-normalized)",
  value: +calculateNTCP_Poisson(60, 60, 1.9, 4).toFixed(6),
  reference: 0.5,
  tolerance: 1e-6,
  pass: Math.abs(calculateNTCP_Poisson(60, 60, 1.9, 4) - 0.5) < 1e-6,
});
const dxxCheck = calculateDoseMetrics([
  { dose: 20, volume: 25 },
  { dose: 40, volume: 50 },
  { dose: 60, volume: 25 },
]);
record({
  id: "S4a",
  description: "Differential-path D50 (cumulative interpolation)",
  value: +dxxCheck.dxx[50]!.toFixed(2),
  reference: 50,
  tolerance: 1e-6,
  pass: Math.abs(dxxCheck.dxx[50]! - 50) < 1e-6,
});
const oarRes = performCalculation(
  {
    dvh: [
      { dose: 5, volume: 30 },
      { dose: 15, volume: 40 },
      { dose: 25, volume: 30 },
    ],
    totalDose: 60,
    numFractions: 30,
    organ: "Parotid",
    structureType: "oar",
    model: "lkb_loglogit",
  },
  { td50: 28.4, gamma50: 1.0, m: 0.25, n: 0.45, alphaBeta: 3, d50: 26.3, gamma: 0.73, s: 0.01 },
);
record({
  id: "S5a",
  description: "OAR V95/V100/V107 suppressed",
  value: `${oarRes.doseMetrics.v95}/${oarRes.doseMetrics.v100}/${oarRes.doseMetrics.v107}`,
  pass:
    oarRes.doseMetrics.v95 === undefined &&
    oarRes.doseMetrics.v100 === undefined &&
    oarRes.doseMetrics.v107 === undefined,
});
record({
  id: "S3a",
  description: "EUD equals gEUD (organ volume parameter)",
  value: +oarRes.doseMetrics.eud.toFixed(4),
  reference: +oarRes.doseMetrics.gEUD.toFixed(4),
  tolerance: 1e-9,
  pass: Math.abs(oarRes.doseMetrics.eud - oarRes.doseMetrics.gEUD) < 1e-9,
});

// ── 3. Artifact ─────────────────────────────────────────────────────────────
const artifact = {
  version: "1.2.0",
  build: 19,
  generatedAt: new Date().toISOString(),
  case: "RBX-TXT-001",
  composite: {
    ntcpCompositePct: +ntcpCompositePct.toFixed(2),
    twiPct: +twiPct.toFixed(2),
    d95Gy: +d95.toFixed(2),
    utcpPct: +(evaluation.therapeutic.utcp * 100).toFixed(2),
    pPlusPct: +(evaluation.therapeutic.pPlus * 100).toFixed(2),
    tcpRawPct: +(evaluation.therapeutic.tcpRaw * 100).toFixed(2),
  },
  checks,
  summary: { total: checks.length, failures },
};
fs.writeFileSync(
  path.join(outDir, "v120_regression_results.json"),
  JSON.stringify(artifact, null, 2),
);

console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : "FAILURES PRESENT"} (${checks.length - failures}/${checks.length}) — artifact: verification/v1.2.0/v120_regression_results.json`,
);
process.exit(failures === 0 ? 0 : 1);
