/**
 * Smoke test all cancer sites with real HN DVH where available + site-specific organs/clinical fields.
 * Usage: npx tsx scripts/run_multi_site_smoke.ts
 */

import fs from "fs";
import path from "path";
import { parseCSVDVH } from "../server/data-handler";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { mapToLiteratureOrgan } from "../lib/plan-evaluation";
import { CANCER_SITES, organsForSite } from "../server/sites-registry";
import {
  getClinicalFieldsForContext,
  defaultNtcpEndpointForOrgan,
} from "../lib/clinical-fields-schema";

const HN_ROOT =
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\rbgyanx_test_data";
const PTV_DIR = path.join(HN_ROOT, "PTV_data");
const CORD_FILE = path.join(
  HN_ROOT,
  "HN57_OAR_Eclipse",
  "PT001_Spinal Cord.txt"
);

type SiteResult = {
  site: string;
  tcp?: { patient: string; organ: string; tcpPct: number; fields: number };
  ntcp?: { patient: string; organ: string; ntcpPct: number; endpoint: string; fields: number };
  note?: string;
};

function loadDvh(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = parseCSVDVH(content, path.basename(filePath));
  const structure = parsed.structures[0]?.name ?? "Unknown";
  const dvh =
    parsed.dvhByStructure[structure] ??
    Object.values(parsed.dvhByStructure)[0] ??
    [];
  return { structure, dvh, parsed };
}

function calcTcp(
  dvh: { dose: number; volume: number }[],
  organ: string,
  siteId: string,
  patient: string
) {
  const maxD = Math.max(...dvh.map((p) => p.dose), 0);
  const totalDose = Math.max(maxD * 0.98, 50);
  const fractions = totalDose > 55 ? 35 : 15;
  const params = getOrganParameters(organ, "zaider_minerbo");
  if (!params) return null;
  const result = performCalculation(
    {
      dvh,
      totalDose,
      numFractions: fractions,
      organ,
      structureType: "target",
      model: "zaider_minerbo",
      cancerSite: siteId,
      technique: "IMRT",
      targetType: "PTV",
    },
    params
  );
  const fields = getClinicalFieldsForContext(siteId, "target", organ).length;
  return {
    patient,
    organ,
    tcpPct: (result.tcp ?? 0) * 100,
    fields,
  };
}

function calcNtcp(
  dvh: { dose: number; volume: number }[],
  organ: string,
  siteId: string,
  patient: string
) {
  const maxD = Math.max(...dvh.map((p) => p.dose), 0);
  const totalDose = maxD > 40 ? 54 : maxD || 54;
  const fractions = 30;
  const params = getOrganParameters(organ, "lkb_loglogit");
  if (!params) return null;
  const result = performCalculation(
    {
      dvh,
      totalDose,
      numFractions: fractions,
      organ,
      structureType: "oar",
      model: "lkb_loglogit",
      cancerSite: siteId,
      technique: "IMRT",
    },
    params
  );
  const endpoint = defaultNtcpEndpointForOrgan(organ);
  const fields = getClinicalFieldsForContext(siteId, "oar", organ).length;
  return {
    patient,
    organ,
    ntcpPct: (result.ntcp ?? 0) * 100,
    endpoint,
    fields,
  };
}

function pickCordFile(): string {
  if (fs.existsSync(CORD_FILE)) return CORD_FILE;
  const dir = path.join(HN_ROOT, "HN57_OAR_Eclipse");
  const hit = fs
    .readdirSync(dir)
    .find((f) => /cord/i.test(f) && f.endsWith(".txt"));
  return hit ? path.join(dir, hit) : CORD_FILE;
}

function main() {
  console.log("=== Multi-site smoke (real HN DVH + site-specific context) ===\n");

  const ptvFiles = fs.readdirSync(PTV_DIR).filter((f) => /\.txt$/i.test(f));
  const cordPath = pickCordFile();
  const cordExists = fs.existsSync(cordPath);

  console.log(`Real PTV patients (HN plans): ${ptvFiles.length} in PTV_data`);
  console.log(`Cord sample: ${path.basename(cordPath)} (${cordExists ? "ok" : "missing"})\n`);

  const results: SiteResult[] = [];

  for (const site of CANCER_SITES) {
    const row: SiteResult = { site: site.id };
    const targetOrgan = site.defaultTarget;
    const oarOrgan = site.defaultOrgan;

    const ptvFile = ptvFiles[0];
    if (ptvFile) {
      const { dvh } = loadDvh(path.join(PTV_DIR, ptvFile));
      if (dvh.length > 0) {
        row.tcp = calcTcp(dvh, targetOrgan, site.id, ptvFile) ?? undefined;
      }
    }

    if (cordExists && organsForSite(site.id, "oar").includes("Spinal Cord")) {
      const { dvh, structure } = loadDvh(cordPath);
      const lit = mapToLiteratureOrgan(structure, path.basename(cordPath)) ?? "Spinal Cord";
      const organ = lit === "Spinal Cord" ? "Spinal Cord" : oarOrgan;
      if (dvh.length > 0) {
        row.ntcp = calcNtcp(dvh, organ, site.id, path.basename(cordPath)) ?? undefined;
      }
    } else if (site.id === "HN") {
      const parotid = path.join(HN_ROOT, "HN57_dDVH_CSV", "PT001_Parotid.csv");
      if (fs.existsSync(parotid)) {
        const { dvh } = loadDvh(parotid);
        row.ntcp = calcNtcp(dvh, "Parotid", site.id, "PT001_Parotid.csv") ?? undefined;
      }
    } else {
      row.note = `No site-specific OAR DVH on disk; TCP + clinical fields only`;
    }

    results.push(row);
  }

  for (const r of results) {
    console.log(`--- ${r.site} ---`);
    if (r.tcp) {
      console.log(
        `  TCP  ${r.tcp.patient} → ${r.tcp.organ}: ${r.tcp.tcpPct.toFixed(1)}% (${r.tcp.fields} clinical fields)`
      );
    }
    if (r.ntcp) {
      console.log(
        `  NTCP ${r.ntcp.patient} → ${r.ntcp.organ}: ${r.ntcp.ntcpPct.toFixed(1)}% endpoint=${r.ntcp.endpoint} (${r.ntcp.fields} fields)`
      );
    }
    if (r.note) console.log(`  Note: ${r.note}`);
    const oars = organsForSite(r.site as import("../server/sites-registry").CancerSiteId, "oar");
    const targets = organsForSite(r.site as import("../server/sites-registry").CancerSiteId, "target");
    console.log(`  Organs: ${targets.length} targets, ${oars.length} OARs`);
  }

  const out = path.join(process.cwd(), "test-output", "multi_site_smoke.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nReport: ${out}`);
}

main();
