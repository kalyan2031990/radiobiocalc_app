/**
 * TCP / NTCP / therapeutic window per cancer site.
 * HN: real patient DVH (KASTOORI PTV + parotid). Other sites: synthetic composite DVH.
 *
 * Usage: npx tsx scripts/run_therapeutic_window_all_sites.ts
 */

import fs from "fs";
import path from "path";
import { parseCSVDVH, mergeDvhData } from "../server/data-handler";
import { evaluateCompositePlan } from "../server/composite-plan-evaluation";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { CANCER_SITES, type CancerSiteId } from "../server/sites-registry";

const HN_ROOT =
  process.env.RBGYANX_TEST_DATA ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\rbgyanx_test_data";

const HN_PATIENT = "KASTOORI";
const HN_PTV = path.join(HN_ROOT, "PTV_data", `${HN_PATIENT}_PTV70.txt`);
const HN_OAR = path.join(HN_ROOT, "HN57_OAR_Eclipse", `${HN_PATIENT}_COM_PRTD.txt`);

type SiteReport = {
  site: CancerSiteId;
  patient: string;
  dataSource: "real" | "synthetic";
  totalDoseGy: number;
  fractions: number;
  tcpPct: number;
  maxOarNtcpPct: number;
  utcpPct: number;
  pPlusPct: number;
  twiPct: number;
  twiLabel: string;
  tciPct?: number;
  ciPaddick?: number | null;
  primaryTarget: string | null;
  oarCount: number;
};

/** Site-tuned synthetic cumulative DVH (dose Gy, volume %). */
function buildSyntheticCompositeCsv(
  siteId: CancerSiteId,
  patientId: string,
): string {
  const site = CANCER_SITES.find((s) => s.id === siteId)!;
  const targetName = `${site.defaultTarget}_${patientId}`;
  const oarName = `${site.defaultOrgan}_${patientId}`;

  const rx = siteId === "LUNG" ? 54 : siteId === "PROSTATE" ? 78 : 70;
  const lines: string[] = ["dose,volume,structure"];

  const ptvSteps: [number, number][] = [
    [0, 100],
    [rx * 0.5, 100],
    [rx * 0.95, 98],
    [rx, 95],
    [rx * 1.07, 10],
  ];
  for (const [d, v] of ptvSteps) {
    lines.push(`${d.toFixed(2)},${v},${targetName}`);
  }

  const oarScale = siteId === "LUNG" ? 0.45 : siteId === "BREAST" ? 0.35 : 0.55;
  const oarSteps: [number, number][] = [
    [0, 100],
    [rx * 0.3 * oarScale, 90],
    [rx * 0.6 * oarScale, 50],
    [rx * oarScale, 15],
    [rx * 0.85, 3],
  ];
  for (const [d, v] of oarSteps) {
    lines.push(`${d.toFixed(2)},${v},${oarName}`);
  }

  if (organsNeedSerialOar(siteId)) {
    const serial = `SpinalCord_${patientId}`;
    lines.push(`0,100,${serial}`);
    lines.push(`${(rx * 0.25).toFixed(2)},100,${serial}`);
    lines.push(`${(rx * 0.4).toFixed(2)},80,${serial}`);
    lines.push(`${(rx * 0.5).toFixed(2)},5,${serial}`);
  }

  return lines.join("\n");
}

function organsNeedSerialOar(siteId: CancerSiteId): boolean {
  return ["BRAIN", "HN", "LUNG", "BREAST", "CERVIX", "RECTUM", "PROSTATE"].includes(
    siteId,
  );
}

function loadRealHnComposite() {
  if (!fs.existsSync(HN_PTV) || !fs.existsSync(HN_OAR)) {
    return null;
  }
  const ptv = parseCSVDVH(fs.readFileSync(HN_PTV, "utf8"), path.basename(HN_PTV));
  const oar = parseCSVDVH(fs.readFileSync(HN_OAR, "utf8"), path.basename(HN_OAR));
  return mergeDvhData([ptv, oar]);
}

function rxForSite(siteId: CancerSiteId, dvhMax: number): { total: number; fx: number } {
  if (siteId === "LUNG") return { total: Math.min(54, dvhMax * 0.98 || 54), fx: 3 };
  if (siteId === "PROSTATE") return { total: 78, fx: 39 };
  return { total: Math.max(70, dvhMax * 0.98 || 70), fx: 35 };
}

function runSite(siteId: CancerSiteId): SiteReport {
  const site = CANCER_SITES.find((s) => s.id === siteId)!;
  let dataSource: "real" | "synthetic" = "synthetic";
  let patient = `SYN_${siteId}`;
  let bundle;

  if (siteId === "HN") {
    const real = loadRealHnComposite();
    if (real) {
      bundle = real;
      dataSource = "real";
      patient = HN_PATIENT;
    }
  }

  if (!bundle) {
    const csv = buildSyntheticCompositeCsv(siteId, patient);
    bundle = parseCSVDVH(csv, `${siteId}_composite.csv`);
    dataSource = "synthetic";
  }

  const maxD = Math.max(
    ...Object.values(bundle.dvhByStructure).flatMap((pts) =>
      pts.map((p) => p.dose),
    ),
    1,
  );
  const { total, fx } =
    siteId === "HN" && dataSource === "real"
      ? { total: 70, fx: 35 }
      : rxForSite(siteId, maxD);

  const ev = evaluateCompositePlan(bundle, {
    totalDose: total,
    numFractions: fx,
    cancerSite: siteId,
    technique: siteId === "LUNG" ? "SBRT" : "IMRT",
    prescriptionGy: total,
    fileHint: patient,
  });

  const tw = ev.therapeutic;
  const oarNtcps = ev.structureResults.filter((s) => s.structureType === "oar");
  const maxOar = Math.max(...oarNtcps.map((s) => s.ntcp ?? 0), 0);

  return {
    site: siteId,
    patient,
    dataSource,
    totalDoseGy: total,
    fractions: fx,
    tcpPct: tw.tcp * 100,
    maxOarNtcpPct: maxOar * 100,
    utcpPct: tw.utcp * 100,
    pPlusPct: tw.pPlus * 100,
    twiPct: tw.twi * 100,
    twiLabel: tw.twiInterpretation,
    tciPct: ev.targetIndices?.tciPercent,
    ciPaddick: ev.targetIndices?.ciPaddick,
    primaryTarget: ev.primaryTarget,
    oarCount: oarNtcps.length,
  };
}

function runSingleStructureSanity() {
  console.log("\n--- Single-structure sanity (HN real parotid NTCP) ---");
  const parotid = path.join(HN_ROOT, "HN57_dDVH_CSV", "PT001_Parotid.csv");
  if (!fs.existsSync(parotid)) {
    console.log("SKIP PT001_Parotid.csv missing");
    return;
  }
  const parsed = parseCSVDVH(fs.readFileSync(parotid, "utf8"), "PT001_Parotid.csv");
  const dvh = Object.values(parsed.dvhByStructure)[0] ?? [];
  const params = getOrganParameters("Parotid", "lkb_loglogit");
  if (!params) return;
  const r = performCalculation(
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
  console.log(
    `  PT001 Parotid NTCP: ${((r.ntcp ?? 0) * 100).toFixed(1)}% (gEUD ${r.doseMetrics.gEUD.toFixed(1)} Gy)`,
  );
}

function main() {
  console.log("=== Therapeutic window — all sites (real HN + synthetic) ===\n");
  console.log(`Data root: ${HN_ROOT}`);
  console.log(
    `HN real plan: ${fs.existsSync(HN_PTV) && fs.existsSync(HN_OAR) ? `${HN_PATIENT} PTV+Parotid` : "unavailable — synthetic fallback"}\n`,
  );

  const reports: SiteReport[] = [];
  let fail = 0;

  for (const site of CANCER_SITES) {
    try {
      const r = runSite(site.id);
      reports.push(r);
      const src = r.dataSource === "real" ? "REAL" : "SYN";
      console.log(`[${src}] ${r.site} — patient ${r.patient}`);
      console.log(
        `  Rx ${r.totalDoseGy} Gy / ${r.fractions} fx · target ${r.primaryTarget ?? "—"} · ${r.oarCount} OAR(s)`,
      );
      console.log(
        `  TCP ${r.tcpPct.toFixed(1)}% · max OAR NTCP ${r.maxOarNtcpPct.toFixed(1)}%`,
      );
      console.log(
        `  UTCP ${r.utcpPct.toFixed(1)}% · P+ ${r.pPlusPct.toFixed(1)}% · TWI ${r.twiPct.toFixed(1)}% (${r.twiLabel})`,
      );
      if (r.tciPct != null) {
        const pad =
          r.ciPaddick != null
            ? ` · CI Paddick ${r.ciPaddick.toFixed(3)}`
            : "";
        console.log(`  TCI ${r.tciPct.toFixed(1)}% · CI RTOG${pad}`);
      }
      if (r.utcpPct < 0 || r.utcpPct > 100 || Number.isNaN(r.twiPct)) {
        console.log("  FAIL: invalid metrics");
        fail++;
      } else {
        console.log("  OK");
      }
      console.log("");
    } catch (e) {
      console.log(`FAIL ${site.id}:`, e instanceof Error ? e.message : e);
      fail++;
    }
  }

  runSingleStructureSanity();

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "therapeutic_window_all_sites.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2),
  );
  console.log(`\nReport: ${outFile}`);
  console.log(
    `\nSummary: ${reports.length} sites, ${reports.filter((r) => r.dataSource === "real").length} real, ${reports.filter((r) => r.dataSource === "synthetic").length} synthetic`,
  );
  if (fail > 0) {
    console.log(`FAILED: ${fail} site(s)`);
    process.exit(1);
  }
  console.log("All site therapeutic window tests passed.");
}

main();
