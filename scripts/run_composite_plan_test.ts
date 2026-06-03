/**
 * Composite plan evaluation smoke test (plan indices + therapeutic window).
 */
import { parseCSVDVH } from "../server/data-handler";
import { evaluateCompositePlan } from "../server/composite-plan-evaluation";
import * as fs from "fs";
import * as path from "path";

const testRoot =
  process.env.RBGYANX_TEST_DATA ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\rbgyanx_test_data";

const HN_REAL_PTV = path.join(testRoot, "PTV_data", "KASTOORI_PTV70.txt");
const HN_REAL_OAR = path.join(testRoot, "HN57_OAR_Eclipse", "KASTOORI_COM_PRTD.txt");

function findPair(dir: string): { ptv: string; oar: string } | null {
  const files = fs.readdirSync(dir).filter((f) => /\.(csv|txt)$/i.test(f));
  const ptv = files.find((f) => /ptv/i.test(f));
  const oar = files.find((f) => /parot|cord|brain/i.test(f) && f !== ptv);
  if (ptv && oar) {
    return {
      ptv: path.join(dir, ptv),
      oar: path.join(dir, oar),
    };
  }
  return null;
}

async function main() {
  let ok = 0;
  let fail = 0;

  let pair: { ptv: string; oar: string } | null = null;
  if (fs.existsSync(HN_REAL_PTV) && fs.existsSync(HN_REAL_OAR)) {
    pair = { ptv: HN_REAL_PTV, oar: HN_REAL_OAR };
    console.log("Using real HN patient KASTOORI (PTV70 + combined parotid)\n");
  } else {
    const hnDir = path.join(testRoot, "HN");
    pair = fs.existsSync(hnDir) ? findPair(hnDir) : null;
  }

  if (!pair) {
    console.log("SKIP: no PTV+OAR pair in test data — synthetic composite only");
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
    });
    if (ev.therapeutic.utcp >= 0 && ev.therapeutic.utcp <= 1 && ev.targetIndices) {
      console.log("PASS synthetic composite UTCP=", ev.therapeutic.utcp.toFixed(4));
      ok++;
    } else {
      console.log("FAIL synthetic composite");
      fail++;
    }
  } else {
    const { mergeDvhData } = await import("../server/data-handler");
    const a = parseCSVDVH(fs.readFileSync(pair.ptv, "utf8"), path.basename(pair.ptv));
    const b = parseCSVDVH(fs.readFileSync(pair.oar, "utf8"), path.basename(pair.oar));
    const merged = mergeDvhData([a, b]);
    const ev = evaluateCompositePlan(merged, {
      totalDose: 70,
      numFractions: 35,
      cancerSite: "HN",
      fileHint: "KASTOORI",
    });
    const hasTcp = ev.structureResults.some((s) => s.tcp != null);
    const hasNtcp = ev.structureResults.some((s) => s.ntcp != null && s.ntcp > 0);
    if (hasTcp && hasNtcp) {
      console.log("PASS merged plan", ev.primaryTarget);
      console.log(
        `  TCP ${((ev.therapeutic.tcp) * 100).toFixed(1)}% · max NTCP ${(ev.therapeutic.ntcpComposite * 100).toFixed(1)}%`,
      );
      console.log(
        `  UTCP ${(ev.therapeutic.utcp * 100).toFixed(1)}% · P+ ${(ev.therapeutic.pPlus * 100).toFixed(1)}% · TWI ${(ev.therapeutic.twi * 100).toFixed(1)}% (${ev.therapeutic.twiInterpretation})`,
      );
      if (ev.targetIndices) {
        const pad =
          ev.targetIndices.ciPaddick != null
            ? ` · CI Paddick ${ev.targetIndices.ciPaddick.toFixed(3)}`
            : " · (no Paddick — conventional)";
        console.log(
          `  TCI ${ev.targetIndices.tciPercent.toFixed(1)}% · CI RTOG ${ev.targetIndices.ciRtog.toFixed(3)}${pad}`,
        );
      }
      ok++;
    } else {
      console.log("FAIL merged plan — no TCP/NTCP");
      fail++;
    }
  }

  console.log(`\nComposite plan tests: ${ok} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
