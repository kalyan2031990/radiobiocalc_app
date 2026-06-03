/**
 * Integration test: real Eclipse DVH folders (TCP targets + NTCP OARs).
 *
 * Usage:
 *   npx tsx scripts/run_real_dvh_tcp_ntcp_test.ts
 */

import fs from "fs";
import path from "path";
import { parseCSVDVH } from "../server/data-handler";
import {
  performCalculation,
  calculateNTCP_LKB_LogLogit,
} from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { mapToLiteratureOrgan } from "../lib/plan-evaluation";

const TCP_DIR =
  process.env.TCP_DVH_DIR ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\input_data\\tcp_only_input\\PTV_DVH_TCP_input";
const NTCP_DIR =
  process.env.NTCP_DVH_DIR ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\input_data\\ntcp_only_input\\OAR_DVH_NTCP_input";

type Row = {
  file: string;
  structure: string;
  literatureOrgan: string | null;
  points: number;
  totalDoseGy: number;
  fractions: number;
  model: string;
  tcp?: number;
  ntcp?: number;
  gEUD: number;
  meanDose: number;
  error?: string;
};

function listTxt(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".txt"))
    .map((f) => path.join(dir, f));
}

function rxFromHeader(studyDate?: string): number | undefined {
  if (!studyDate?.startsWith("Rx")) return undefined;
  const n = parseFloat(studyDate.slice(2));
  return Number.isNaN(n) ? undefined : n;
}

function runFile(
  filePath: string,
  mode: "tcp" | "ntcp",
  model: "lkb_loglogit" | "poisson"
): Row {
  const base = path.basename(filePath);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseCSVDVH(content, base);
    const structure = parsed.structures[0]?.name ?? "Unknown";
    const dvh =
      parsed.dvhByStructure[structure] ??
      Object.values(parsed.dvhByStructure)[0] ??
      [];
    const lit = mapToLiteratureOrgan(structure);
    if (!lit) {
      return {
        file: base,
        structure,
        literatureOrgan: null,
        points: dvh.length,
        totalDoseGy: 0,
        fractions: 0,
        model,
        gEUD: 0,
        meanDose: 0,
        error: "No literature organ mapping (or PRV excluded)",
      };
    }

    const maxD = Math.max(...dvh.map((p) => p.dose), 0);
    const rx = rxFromHeader(parsed.patientInfo.studyDate);
    const totalDoseGy =
      mode === "tcp"
        ? Math.max(rx ?? 0, maxD * 0.98) || 70
        : (rx ?? (maxD > 50 ? 54 : maxD)) || 54;
    const fractions = mode === "tcp" ? 35 : 30;

    const params = getOrganParameters(lit, model);
    if (!params) {
      return {
        file: base,
        structure,
        literatureOrgan: lit,
        points: dvh.length,
        totalDoseGy,
        fractions,
        model,
        gEUD: 0,
        meanDose: 0,
        error: `No parameters for ${lit}`,
      };
    }

    const result = performCalculation(
      {
        dvh,
        totalDose: totalDoseGy,
        numFractions: fractions,
        organ: lit,
        structureType: mode === "tcp" ? "target" : "oar",
        model,
      },
      params
    );

    return {
      file: base,
      structure,
      literatureOrgan: lit,
      points: dvh.length,
      totalDoseGy,
      fractions,
      model,
      tcp: result.tcp,
      ntcp: result.ntcp,
      gEUD: result.doseMetrics.gEUD,
      meanDose: result.doseMetrics.meanDose,
    };
  } catch (e) {
    return {
      file: base,
      structure: "—",
      literatureOrgan: null,
      points: 0,
      totalDoseGy: 0,
      fractions: 0,
      model,
      gEUD: 0,
      meanDose: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function summarize(rows: Row[]) {
  const ok = rows.filter((r) => !r.error);
  const fail = rows.filter((r) => r.error);
  return { ok: ok.length, fail: fail.length, total: rows.length };
}

function main() {
  const tcpFiles = listTxt(TCP_DIR);
  const ntcpFiles = listTxt(NTCP_DIR);

  console.log("=== Mobile rbGyanX — real DVH integration ===\n");
  console.log(`TCP folder:  ${TCP_DIR} (${tcpFiles.length} files)`);
  console.log(`NTCP folder: ${NTCP_DIR} (${ntcpFiles.length} files)`);
  console.log("Clinical xlsx: not present in these folders (DVH-only test)\n");

  const tcpRows = tcpFiles.map((f) => runFile(f, "tcp", "lkb_loglogit"));
  const ntcpLkb = ntcpFiles.map((f) => runFile(f, "ntcp", "lkb_loglogit"));

  const tcpSum = summarize(tcpRows);
  const ntcpSum = summarize(ntcpLkb);

  console.log("--- TCP (target → PTV literature, LKB log-logistic) ---");
  console.log(`OK: ${tcpSum.ok}/${tcpSum.total}, Failed: ${tcpSum.fail}`);
  for (const r of tcpRows.filter((x) => x.error).slice(0, 5)) {
    console.log(`  FAIL ${r.file}: ${r.error}`);
  }
  if (tcpSum.ok > 0) {
    const sample = tcpRows.find((x) => !x.error)!;
    console.log(
      `  Sample: ${sample.file} → TCP=${((sample.tcp ?? 0) * 100).toFixed(2)}% gEUD=${sample.gEUD.toFixed(2)} Gy`
    );
  }

  console.log("\n--- NTCP (OAR → literature organ, LKB log-logistic) ---");
  console.log(`OK: ${ntcpSum.ok}/${ntcpSum.total}, Failed: ${ntcpSum.fail}`);
  const unmapped = ntcpLkb.filter((r) => r.error?.includes("mapping"));
  if (unmapped.length) {
    console.log(`  Unmapped structures: ${unmapped.length}`);
    for (const r of unmapped.slice(0, 8)) {
      console.log(`    ${r.file} → "${r.structure}"`);
    }
  }
  for (const r of ntcpLkb.filter((x) => x.error && !x.error.includes("mapping")).slice(0, 5)) {
    console.log(`  FAIL ${r.file}: ${r.error}`);
  }
  if (ntcpSum.ok > 0) {
    const sample = ntcpLkb.find((x) => !x.error)!;
    console.log(
      `  Sample: ${sample.file} → NTCP=${((sample.ntcp ?? 0) * 100).toFixed(2)}% (${sample.literatureOrgan}) gEUD=${sample.gEUD.toFixed(2)} Gy`
    );
  }

  const outDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    tcp: { summary: tcpSum, rows: tcpRows },
    ntcp: { summary: ntcpSum, rows: ntcpLkb },
  };
  const outPath = path.join(outDir, "real_dvh_tcp_ntcp_report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outPath}`);

  // Cross-check LKB log-logistic against desktop closed form (rbgyanx/core/ntcp/lkb_loglogit.py)
  const ref = 1 / (1 + Math.pow(28.4 / 26.5, 4));
  const mobileRef = calculateNTCP_LKB_LogLogit(26.5, 28.4, 1.0);
  console.log(
    `\nFormula check LKB( gEUD=26.5, TD50=28.4, γ50=1 ): ${mobileRef.toFixed(6)} (expected ${ref.toFixed(6)})`
  );

  const hardFails = [
    ...tcpRows.filter((r) => r.error && !r.error.includes("mapping")),
    ...ntcpLkb.filter((r) => r.error && !r.error.includes("mapping")),
  ];
  if (hardFails.length > 0) process.exit(1);
}

main();
