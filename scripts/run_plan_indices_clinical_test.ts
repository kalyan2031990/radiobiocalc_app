/**
 * Clinical gating: Paddick CI / GI only for SRS/SRT/SBRT fractionation.
 */
import { computeTargetPlanIndices } from "../lib/plan-dosimetric-indices";
import type { DVHPoint } from "../lib/plan-evaluation";

const targetDvh: DVHPoint[] = [
  { dose: 0, volume: 100 },
  { dose: 35, volume: 100 },
  { dose: 70, volume: 96 },
  { dose: 72, volume: 90 },
];

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const conv = computeTargetPlanIndices(targetDvh, 70, {
  totalDoseGy: 70,
  numFractions: 35,
  technique: "IMRT",
});
assert(conv.techniqueProfile === "conventional", "70/35 → conventional");
assert(conv.ciPaddick === null, "conventional: no Paddick CI");
assert(conv.gradientIndex === null, "conventional: no gradient index");

const hypo = computeTargetPlanIndices(targetDvh, 60, {
  totalDoseGy: 60,
  numFractions: 20,
  technique: "VMAT",
});
assert(hypo.techniqueProfile === "hypofractionated", "3 Gy/fx → hypofractionated");
assert(hypo.ciPaddick === null, "hypofractionated: no Paddick CI");

const sbrt = computeTargetPlanIndices(targetDvh, 54, {
  totalDoseGy: 54,
  numFractions: 3,
  technique: "SBRT",
});
assert(sbrt.techniqueProfile === "sbrt", "54/3 SBRT profile");
assert(sbrt.ciPaddick != null, "SBRT: Paddick CI computed");
assert(sbrt.gradientIndex != null, "SBRT: gradient index computed");

console.log("\nPlan index clinical gating: all checks passed");
