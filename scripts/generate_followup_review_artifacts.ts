/**
 * Generate peer-review follow-up artefacts (D2–D10) into supplementary output folder.
 *
 * Usage:
 *   npx tsx scripts/generate_followup_review_artifacts.ts
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  discoverMobileAppCases,
  getMobileAppInputRoot,
  runEngineForMobileAppCase,
} from "./mobile-app-input-suite-core";

const PAPER_ROOT = process.env.PAPER_ROOT?.trim() || path.join(process.cwd(), "..", "rbGyanX_mobile_paper");
const INPUT = process.env.FOLLOWUP_INPUT?.trim() || path.join(PAPER_ROOT, "revised", "supplementary_data_build16", "input");
const OUT = process.env.FOLLOWUP_OUT?.trim() || path.join(PAPER_ROOT, "revised", "supplementary_data_build17", "output");

type CaseRow = {
  patientId: string;
  twi: number;
  utcp: number;
  pplus: number;
  tcpUncapped: number;
  ntcp: number;
};

function readParity(): CaseRow[] {
  const p = path.join(OUT, "engine_independent_parity.json");
  if (!fs.existsSync(p)) return [];
  const j = JSON.parse(fs.readFileSync(p, "utf8")) as { cases: Array<Record<string, number | string>> };
  return j.cases.map((c) => ({
    patientId: String(c.patientId ?? `RBX-${c.case}`),
    twi: Number(c.twi_app ?? c.twi_calc),
    utcp: Number(c.utcp_app ?? c.utcp_calc),
    pplus: Number(c.pplus_app ?? c.pplus_calc),
    tcpUncapped: Number(c.tcp_uncapped_app ?? c.tcp_uncapped_calc) / 100,
    ntcp: Number(c.ntcp_app ?? c.ntcp_calc) / 100,
  }));
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

function spearman(xs: number[], ys: number[]): number {
  const rank = (arr: number[]) => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array(arr.length).fill(0);
    sorted.forEach((o, rankIdx) => {
      r[o.i] = rankIdx + 1;
    });
    return r;
  };
  return pearson(rank(xs), rank(ys));
}

function writeD2(rows: CaseRow[]): void {
  const sensitivities = rows.map((r) => {
    const tcp = r.tcpUncapped;
    const wsum = tcp - r.twi / 100;
    const lo = (tcp - wsum * 1.2) * 100;
    const hi = (tcp - wsum * 0.8) * 100;
    const cappedTwi = (0.95 - wsum) * 100;
    const uncapTwi = (tcp - wsum) * 100;
    return {
      patientId: r.patientId,
      twi_base: r.twi,
      twi_lambda_minus20: lo,
      twi_lambda_plus20: hi,
      twi_tcp_capped_95: cappedTwi,
      twi_tcp_uncapped: uncapTwi,
    };
  });
  fs.writeFileSync(path.join(OUT, "twi_sensitivity_full.json"), JSON.stringify({ cases: sensitivities }, null, 2));
}

function writeD3(rows: CaseRow[]): void {
  const twi = rows.map((r) => r.twi);
  const utcp = rows.map((r) => r.utcp);
  const pplus = rows.map((r) => r.pplus);
  const payload = {
    n: rows.length,
    pearson: {
      twi_utcp: pearson(twi, utcp),
      twi_pplus: pearson(twi, pplus),
      utcp_pplus: pearson(utcp, pplus),
    },
    spearman: {
      twi_utcp: spearman(twi, utcp),
      twi_pplus: spearman(twi, pplus),
      utcp_pplus: spearman(utcp, pplus),
    },
    cases: rows,
  };
  fs.writeFileSync(path.join(OUT, "twi_utcp_pplus_correlation.json"), JSON.stringify(payload, null, 2));
}

function writeD4(): void {
  const md = `# Model equations and parameters (as implemented)

## Composite-driving models
- **Target TCP:** Poisson LQ-DVH (\`poisson_dvh\`) — volume-weighted surviving clonogens from cumulative DVH shells with LQ per-fraction survival, repopulation after Tk (HN: Tk=21 d, Tpot=4 d). TCP = exp(−N_eff).
- **OAR NTCP:** LKB log-logistic (\`lkb_loglogit\`) — NTCP = 1 / (1 + (TD50/gEUD)^(4γ)).

## Therapeutic window (from uncapped TCP)
- **UTCP** = TCP × Π(1 − NTCP_k) (Ågren 1995)
- **P+** = TCP − NTCP_critical (Brahme 1984)
- **TWI** = TCP − Σ(λ_k × NTCP_k) (rbGyanX risk-weighted index)
- **Display TCP** capped at 95% for clinician UI only.

## HN TCP site parameters (\`server/tcp-site-params.ts\`, site HN)
| Parameter | Value | Notes |
|-----------|------:|-------|
| α (Gy⁻¹) | 0.35 | |
| β (Gy⁻²) | 0.035 | α/β = 10 Gy |
| N₀ GTV | 1×10⁷ | clonogens |
| N₀ CTV/PTV | 1×10⁵ | clonogens |
| LQ max d/fx | 10 Gy | USC extension above |
| Tk | 21 d | repopulation onset |
| Tpot | 4 d | potential doubling time |

## OAR LKB parameters (QUANTEC / \`server/parameters\`)
See \`output/risk_weights_lambda_table.md\` for TD50, γ, λ per organ.

_Source: code in \`server/tcp-dvh-engine.ts\`, \`server/radiobiology.ts\`, \`lib/therapeutic-window.ts\`._
`;
  fs.writeFileSync(path.join(OUT, "model_equations_and_params.md"), md, "utf8");
}

function writeD5(): void {
  const lambda = `# OAR risk weights λ (TWI)

| Organ | λ | Source |
|-------|---:|--------|
| Spinal Cord | 1.0 | Serial organ — UTCP literature weighting |
| Brainstem | 1.0 | Serial organ |
| Optic Nerve | 1.0 | Serial organ |
| Chiasm | 1.0 | Serial organ |
| Heart | 0.9 | \`lib/therapeutic-window.ts\` OAR_RISK_WEIGHTS |
| Lung | 0.8 | Parallel organ |
| Larynx | 0.7 | H&N OAR |
| Mandible | 0.7 | H&N OAR |
| Parotid | 0.3 | Parallel salivary — lower λ |
| Submandibular | 0.4 | Salivary |
| Default (unlisted) | 0.5 | Fallback in \`riskWeightForOrgan\` |

## Covariate priors (illustrative / expert-set)

Log-odds shifts applied to TCP/NTCP when clinical covariate toggle is ON.
Coefficients are **expert-set illustrative priors** for pilot demonstration — not fitted to outcomes.
See \`lib/clinical-covariate-engine.ts\` and \`output/covariate_priors_S1.md\`.
`;
  fs.writeFileSync(path.join(OUT, "risk_weights_lambda_table.md"), lambda, "utf8");

  const cov = `# S1 — Covariate prior coefficients

| Factor | Effect | Label |
|--------|--------|-------|
| Age (per decade) | log-odds shift on NTCP/TCP | expert-set illustrative |
| Sex (male vs female) | log-odds shift | expert-set illustrative |
| Smoking | log-odds shift | expert-set illustrative |
| Chemotherapy | log-odds shift | expert-set illustrative |
| ECOG | log-odds shift | expert-set illustrative |
| Organ dose slope | dose-response modifier | expert-set illustrative |

**Note:** Synthetic clinical spreadsheet rows drive demonstration only. Coefficients are not validated against patient outcomes in this validation cohort.
`;
  fs.writeFileSync(path.join(OUT, "covariate_priors_S1.md"), cov, "utf8");
}

function writeD6(): void {
  let vitest = "";
  try {
    vitest = execSync("npx vitest run --reporter=json 2>nul", { encoding: "utf8", cwd: process.cwd() });
  } catch {
  }
  const md = `# Automated test matrix (build 17)

| Category | Script / suite | Description |
|----------|----------------|-------------|
| Parser | \`tests/eclipse-parser.test.ts\` | Eclipse composite DVH parse |
| DVH interpolation | \`server/plan-dosimetric-indices.test.ts\` | D95, TCI, CI, HI |
| BED/EQD2 | \`server/radiobiology.test.ts\` | BED/EQD2 conversions |
| gEUD / TCP / NTCP | \`server/radiobiology-dvh.test.ts\`, \`server/radiobiology.test.ts\` | Model evaluation |
| Composite | \`server/composite-model-drive.test.ts\`, \`server/therapeutic-window.test.ts\` | UTCP, P+, TWI, model selection |
| Report export | \`scripts/run_report_export_test.ts\` | PDF/DOCX smoke |
| Offline engine | \`scripts/run_offline_engine_test.ts\` | On-device engine path |
| DVH parse mobile | \`scripts/run_dvh_parse_test.ts\` | Native + merge parsers |
| PHI guard | \`scripts/check-no-phi-logs.ts\` | No PHI in logs |
| Clinical decision | \`server/clinical-decision-tree.test.ts\` | Decision tree rules |

**CI command:** \`npm run test:ci\` — target 83/83 PASS on build 17.
`;
  fs.writeFileSync(path.join(OUT, "test_matrix.md"), md, "utf8");
}

function writeD7(root: string): void {
  const cases = discoverMobileAppCases(root);
  const lines = [
    "# Case characteristics (17 composite DVH cohort)",
    "",
    "| Case | Structures | Targets | OARs | Rx (Gy) | Fx | Route |",
    "|------|----------:|--------:|-----:|--------:|---:|-------|",
  ];
  for (const c of cases) {
    const route = c.patientId.startsWith("RBX-DCM") ? "DICOM composite" : "Eclipse text composite";
    lines.push(
      `| ${c.patientId} | ${c.structureCount} | ${c.targetCount} | ${c.oarCount} | ${c.totalDoseGy} | ${c.fractions} | ${route} |`,
    );
  }
  fs.writeFileSync(path.join(OUT, "case_characteristics.md"), lines.join("\n"), "utf8");
}

function main(): void {
  fs.mkdirSync(OUT, { recursive: true });
  process.env.INPUT_FOLDERS = INPUT;
  const root = getMobileAppInputRoot();
  const rows = readParity();
  if (rows.length === 0) {
    console.warn("No parity JSON — run independent_verification.py first");
  }
  writeD2(rows);
  writeD3(rows);
  writeD4();
  writeD5();
  writeD6();
  writeD7(root);
  // D9 fixed below
  const fp = path.join(INPUT, "composite_dvh", "RBX-DCM-003_composite_DVH.txt");
  const d9: string[] = [
    "# Monaco volume check — RBX-DCM-003",
    "",
    "TPS-reported RT-Structure volumes from Monaco are **not present** in the anonymised composite export.",
    "Only DVH-header `Volume [CM3]` fields are available:",
    "",
    "| Structure | DVH header volume (cm³) | TPS Monaco (recoverable) |",
    "|-----------|------------------------:|--------------------------|",
  ];
  if (fs.existsSync(fp)) {
    let cur = "";
    for (const ln of fs.readFileSync(fp, "utf8").split(/\r?\n/)) {
      const sm = ln.match(/^Structure:\s*(.+)/);
      if (sm) cur = sm[1].trim();
      const vm = ln.match(/^Volume \[CM3\]:\s*([\d.]+)/);
      if (vm && cur) {
        d9.push(`| ${cur} | ${vm[1]} | **No** — not in export |`);
        cur = "";
      }
    }
  }
  d9.push("", "_Monaco DICOM support in the app remains preliminary; volume parity cannot be asserted._");
  fs.writeFileSync(path.join(OUT, "monaco_volume_check.md"), d9.join("\n"), "utf8");

  console.log(`Follow-up artefacts written to ${OUT}`);
}

main();
