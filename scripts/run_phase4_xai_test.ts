/**
 * Phase 4 (rb X): explainability layer — no PINN on mobile single-plan scope.
 */
import { parseCSVDVH } from "../server/data-handler";
import { evaluateCompositePlan } from "../server/composite-plan-evaluation";
import { buildSingleStructureExplanation } from "../lib/rbgyanx-explain";

const synthetic = `dose,volume,structure
0,100,PTV70
35,100,PTV70
70,95,PTV70
70,100,PTV70
0,50,Parotid_L
30,45,Parotid_L
50,20,Parotid_L
70,5,Parotid_L`;

const data = parseCSVDVH(synthetic, "composite.csv");
const ev = evaluateCompositePlan(data, {
  totalDose: 70,
  numFractions: 35,
  cancerSite: "HN",
  technique: "IMRT",
});

if (!ev.planExplanation?.bullets?.length) {
  console.error("FAIL: missing plan explanation");
  process.exit(1);
}
if (ev.targetIndices?.ciPaddick != null) {
  console.error("FAIL: Paddick CI must be null for 2 Gy/fx conventional");
  process.exit(1);
}
if (!ev.planExplanation.rbXScope.includes("desktop rbGyanX")) {
  console.error("FAIL: rbXScope should reference desktop rbGyanX for cohort/XAI");
  process.exit(1);
}

const sbrt = evaluateCompositePlan(data, {
  totalDose: 54,
  numFractions: 3,
  cancerSite: "LUNG",
  technique: "SBRT",
  prescriptionGy: 54,
});
if (sbrt.targetIndices?.ciPaddick == null) {
  console.error("FAIL: Paddick CI expected for SBRT");
  process.exit(1);
}

const single = buildSingleStructureExplanation({
  structureType: "oar",
  organ: "Parotid",
  model: "lkb_loglogit",
  structureName: "Parotid_L",
  ntcp: 0.12,
  doseMetrics: { meanDose: 24, maxDose: 48, gEUD: 22, d2: 40 },
  totalDose: 70,
  numFractions: 35,
  technique: "IMRT",
  bed: 72,
  eqd2: 68,
});
if (!single.bullets.length || !single.rbXScope.includes("XAI")) {
  console.error("FAIL: single-structure XAI missing");
  process.exit(1);
}

console.log("PASS Phase 4 XAI — conventional gated, SBRT indices, explanation bullets");
console.log(`  ${ev.planExplanation.headline}`);
console.log(`  bullets: ${ev.planExplanation.bullets.length}`);
console.log(`  single-structure XAI bullets: ${single.bullets.length}`);
