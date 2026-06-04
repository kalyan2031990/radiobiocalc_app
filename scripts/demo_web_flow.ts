/**
 * Seeds DVH + runs calculation for browser demo; prints navigation hints.
 */
import fs from "fs";
import path from "path";
import { parseCSVDVH, mergeDvhData } from "../server/data-handler";
import { evaluateCompositePlan } from "../server/composite-plan-evaluation";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { getRbgyanxTestDataRoot } from "./test-data-root";

const ROOT = getRbgyanxTestDataRoot();
const HN_PREFIX = process.env.RBGYANX_HN_DEMO_PREFIX?.trim() || "DEMO";
const PTV = ROOT ? path.join(ROOT, "PTV_data", `${HN_PREFIX}_PTV70.txt`) : "";
const OAR = ROOT ? path.join(ROOT, "HN57_OAR_Eclipse", `${HN_PREFIX}_COM_PRTD.txt`) : "";
const PAROTID = ROOT ? path.join(ROOT, "HN57_dDVH_CSV", "PT001_Parotid.csv") : "";

async function main() {
  console.log("=== rbGyanX mobile demo (API) ===\n");

  if (!ROOT || !fs.existsSync(PTV) || !fs.existsSync(OAR)) {
    console.log("SKIP demo web flow: set RBGYANX_TEST_DATA with demo HN DVH files.");
    process.exit(0);
  }

  const ptv = parseCSVDVH(fs.readFileSync(PTV, "utf8"), path.basename(PTV));
  const oar = parseCSVDVH(fs.readFileSync(OAR, "utf8"), path.basename(OAR));
  const merged = mergeDvhData([ptv, oar]);

  const plan = evaluateCompositePlan(merged, {
    totalDose: 70,
    numFractions: 35,
    cancerSite: "HN",
    fileHint: HN_PREFIX,
    prescriptionGy: 70,
  });

  console.log(`1. Composite plan (${HN_PREFIX} PTV + parotid)`);
  console.log(`   TCP ${(plan.therapeutic.tcp * 100).toFixed(1)}%`);
  console.log(`   NTCP ${(plan.therapeutic.ntcpComposite * 100).toFixed(1)}%`);
  console.log(`   UTCP ${(plan.therapeutic.utcp * 100).toFixed(1)}%`);
  console.log(`   TWI ${(plan.therapeutic.twi * 100).toFixed(1)}% (${plan.therapeutic.twiInterpretation})`);

  if (fs.existsSync(PAROTID)) {
    const parotidDvh = parseCSVDVH(fs.readFileSync(PAROTID, "utf8"), "PT001_Parotid.csv");
    const dvh = Object.values(parotidDvh.dvhByStructure)[0] ?? [];
    const params = getOrganParameters("Parotid", "lkb_loglogit")!;
    const ntcp = performCalculation(
      {
        dvh,
        totalDose: 54,
        numFractions: 30,
        organ: "Parotid",
        structureType: "oar",
        model: "lkb_loglogit",
        cancerSite: "HN",
      },
      params,
    );
    console.log("\n2. Single OAR NTCP (PT001 Parotid)");
    console.log(`   NTCP ${((ntcp.ntcp ?? 0) * 100).toFixed(1)}%`);
  }

  const bundle = {
    patientInfo: merged.patientInfo,
    structures: merged.structures,
    dvhByStructure: merged.dvhByStructure,
    doseUnit: "Gy",
    volumeUnit: "cm3",
  };
  const sessionId = `dvh_demo_${Date.now()}`;
  const sessionKey = `rbgyanx_dvh:${sessionId}`;
  const sessionJson = JSON.stringify(bundle);

  fs.mkdirSync(path.join(process.cwd(), "test-output"), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), "test-output", "demo-session.json"),
    JSON.stringify({ sessionKey, sessionId, sessionJson, plan }, null, 2),
  );

  console.log("\n3. Web app: http://localhost:8081");
  console.log(`   Paste in browser console after load:`);
  console.log(`   sessionStorage.setItem("${sessionKey}", ${JSON.stringify(sessionJson)});`);
  console.log(
    `   location.href="/calculation-setup?dvhSessionId=${sessionId}&fileName=${HN_PREFIX}_composite";`,
  );
  console.log("\nDemo API checks OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
