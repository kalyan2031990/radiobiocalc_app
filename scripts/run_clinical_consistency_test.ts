/**
 * Verify TCP/NTCP role and QUANTEC metric selection on real HN files.
 */
import fs from "fs";
import path from "path";
import { parseCSVDVH } from "../server/data-handler";
import { performCalculation } from "../server/radiobiology";
import { getOrganParameters } from "../server/parameters";
import { inferStructureRole } from "../server/structure-role";
import {
  doseMetricsRowsForEvaluation,
  oarDoseMetricsRows,
  targetDoseMetricsRows,
} from "../lib/dose-metrics-guidelines";

const ROOT =
  process.env.RBGYANX_TEST_DATA ??
  "C:\\Users\\Sampa\\OneDrive\\Desktop\\input_folders\\rbgyanx_test_data";

const samples = [
  "HN57_dDVH_CSV/PT001_Parotid.csv",
  "HN57_OAR_Eclipse/KASTOORI_COM_PRTD.txt",
  "HN57_OAR_Eclipse/PT001_Spinal Cord.txt",
  "PTV_data/KASTOORI_PTV70.txt",
];

let pass = 0;
let fail = 0;

for (const rel of samples) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`SKIP missing ${rel}`);
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  const parsed = parseCSVDVH(content, path.basename(full));
  const structure = parsed.structures[0]?.name ?? "Unknown";
  const dvh = parsed.dvhByStructure[structure] ?? [];
  const role = inferStructureRole(structure, path.basename(full), parsed.structures[0]?.type);
  const organ =
    role === "target"
      ? "PTV"
      : /parot|prtd|comb/i.test(structure + rel)
        ? "Parotid"
        : /cord/i.test(structure + rel)
          ? "Spinal Cord"
          : "Larynx";

  const model = role === "target" ? "zaider_minerbo" : "lkb_loglogit";
  const params = getOrganParameters(organ, model);
  if (!params) {
    console.log(`FAIL ${rel}: no params`);
    fail++;
    continue;
  }

  const maxD = Math.max(...dvh.map((p) => p.dose), 0);
  const totalDose = role === "target" ? Math.max(maxD * 0.98, 50) : maxD > 40 ? 54 : maxD;
  const fractions = role === "target" ? 35 : 30;

  const result = performCalculation(
    {
      dvh,
      totalDose,
      numFractions: fractions,
      organ,
      structureType: role,
      model: model as "zaider_minerbo" | "lkb_loglogit",
      cancerSite: "HN",
      technique: "IMRT",
      targetType: "PTV",
    },
    params,
  );

  const wrongEndpoint =
    (role === "oar" && result.tcp != null && result.ntcp == null) ||
    (role === "target" && result.ntcp != null && result.tcp == null);

  const metrics = doseMetricsRowsForEvaluation(role, organ, result.doseMetrics);
  const hasD95 = metrics.some((m) => m.label.startsWith("D95"));
  const badMetrics = role === "oar" && hasD95;

  const ok =
    !wrongEndpoint &&
    !badMetrics &&
    (role === "oar" ? result.ntcp != null : result.tcp != null);

  if (ok) {
    pass++;
    const pct =
      role === "oar"
        ? `${((result.ntcp ?? 0) * 100).toFixed(1)}% NTCP`
        : `${((result.tcp ?? 0) * 100).toFixed(1)}% TCP`;
    console.log(`OK  ${rel}`);
    console.log(`    role=${role} organ=${organ} ${pct} metrics=${metrics.map((m) => m.label).slice(0, 4).join(", ")}`);
  } else {
    fail++;
    console.log(`FAIL ${rel} role=${role} tcp=${result.tcp} ntcp=${result.ntcp} badD95=${badMetrics}`);
  }
}

console.log(`\nClinical consistency: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
