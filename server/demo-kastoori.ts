/**
 * Loads optional HN demo composite DVH (PTV + parotid) from RBGYANX_TEST_DATA for dev demos.
 */

import fs from "fs";
import path from "path";
import { parseCSVDVH, mergeDvhData, type DVHData } from "./data-handler";
import { evaluateCompositePlan } from "./composite-plan-evaluation";
import {
  anonymizeDvhBundle,
  DEMO_PLAN_FILE_LABEL,
} from "./anonymize-dvh";

function testDataRoot(): string {
  const root = process.env.RBGYANX_TEST_DATA?.trim();
  if (!root) {
    throw new Error(
      "Set RBGYANX_TEST_DATA to a directory containing anonymised demo DVH files (PTV_data, HN57_OAR_Eclipse).",
    );
  }
  return root;
}

export type DemoKastooriPayload = {
  bundle: DVHData;
  fileName: string;
  primaryTarget: string | null;
  oarStructure: string | null;
  structureNames: string[];
  composite: ReturnType<typeof evaluateCompositePlan>;
};

export function loadKastooriDemoPlan(): DemoKastooriPayload {
  const root = testDataRoot();
  const prefix = process.env.RBGYANX_HN_DEMO_PREFIX?.trim() || "DEMO";
  const ptvPath = path.join(root, "PTV_data", `${prefix}_PTV70.txt`);
  const oarPath = path.join(root, "HN57_OAR_Eclipse", `${prefix}_COM_PRTD.txt`);

  if (!fs.existsSync(ptvPath) || !fs.existsSync(oarPath)) {
    throw new Error(
      `Demo DVH files not found under ${root}. Set RBGYANX_TEST_DATA or install rbgyanx_test_data.`,
    );
  }

  const ptv = parseCSVDVH(fs.readFileSync(ptvPath, "utf8"), path.basename(ptvPath));
  const oar = parseCSVDVH(fs.readFileSync(oarPath, "utf8"), path.basename(oarPath));
  const merged = anonymizeDvhBundle(mergeDvhData([ptv, oar]));
  const structureNames = Object.keys(merged.dvhByStructure);

  const composite = evaluateCompositePlan(merged, {
    totalDose: 70,
    numFractions: 35,
    cancerSite: "HN",
    fileHint: DEMO_PLAN_FILE_LABEL,
    prescriptionGy: 70,
  });

  const oarStructure =
    structureNames.find((n) => {
      const r = composite.structureResults.find((s) => s.structureName === n);
      return r?.structureType === "oar";
    }) ?? structureNames.find((n) => /parot|prtd|combo/i.test(n)) ?? structureNames[1] ?? null;

  return {
    bundle: merged,
    fileName: DEMO_PLAN_FILE_LABEL,
    primaryTarget: composite.primaryTarget,
    oarStructure,
    structureNames,
    composite,
  };
}
