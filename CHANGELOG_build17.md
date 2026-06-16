# CHANGELOG — build 17 (v1.0.1)

## Version
- `versionCode` 17, `versionName` 1.0.1 (`app.config.ts`, `lib/app-meta.ts`)

## BUG-1 — Generic Poisson removed from target catalogue
- **Root cause:** `poisson` target path used mean-dose Poisson with OAR-style D50/γ parameters, returning ~0% for well-covered PTVs while `poisson_dvh` correctly integrated the DVH.
- **Fix:** Exclude `poisson` from target model probes (`lib/composite-model-probe.ts`, `lib/structure-model-probe.ts`). Target catalogue: LKB log-logistic, Zaider–Minerbo, Poisson LQ-DVH.

## BUG-2 — Non-default composite-driving model selection
- **Root cause:** Biological tab listed models but composite evaluation and report export always used default TCP/NTCP models.
- **Fix:** Tappable model rows on Results → Biological tab update `compositeTcpModel` / `compositeNtcpModel` and re-run calculation; models flow to therapeutic window and PDF/DOCX export (`calculation-results.tsx`, `export-report-composite.ts`).

## BUG-3 — TCP display cap vs composite metrics
- **Root cause:** `computeTherapeuticWindow` used capped display TCP (95%) for UTCP, P+, TWI.
- **Fix:** Composites now use **uncapped** `tcpRaw`; display remains capped at 95% for clinician UI (`lib/therapeutic-window.ts`, `lib/tcp-display.ts` footnote).

## BUG-4 — Audit / encoding housekeeping
- Engine audit scripts remain UTF-8; independent verifier reads engine output instead of hardcoded APP table (see `scripts/independent_verification.py`).

## UX
- Calculation progress message during engine run (`calculation-results.tsx`).
- Sticky **Run calculation** button on setup screen (`calculation-setup-offline.tsx`).

## Tests
- `server/composite-model-drive.test.ts`
- Updated `server/therapeutic-window.test.ts` (uncapped UTCP when TCP saturates)

## Follow-up (build17-followup branch)

### Verification harness
- `scripts/independent_verification.py`: correct Rx from DVH header + `case_manifest.md`; Poisson LQ-DVH TCP; reads engine audit MD; Brahme P+ matches engine serial-organ / PRV exclusion rules.
- `scripts/audit_radiobiology_full.ts`: `composite_dvh/` path via `resolveCompositeDvhDir()`; extended audit columns (TCP disp/uncap, UTCP, P+, TWI); writes `engine_results_audit.json`.
- Parity (17 cases): D95 0.07 Gy, NTCP 0.44 pp, TCP 0.03 pp, UTCP 0.40 pp, P+ 0.14 pp, TWI 0.31 pp mean |Δ|.

### Device automation (Tier 3)
- `mobile-device-flow.ts`, `mobile-adb-core.ts`: media scan per file, longer file-list wait, calculation-complete waiter. Autonomous 17/17 not re-run in follow-up session (adb unavailable); manual 17/17 on vivo 1907.

### Repo hygiene
- Removed hardcoded `C:\Users\Sampa\...` paths from `package.json` npm scripts (set `INPUT_FOLDERS` at runtime).
- `scripts/generate_followup_review_artifacts.ts`, `scripts/assemble_build17_clean.ts` for D2–D10 outputs and clean handoff folder.

### Figures / supplementary
- `figures_build17/make_figures.py`: Fig 3 six-panel + R²; Fig 4 sorted by NTCP; Fig 5 from `twi_sensitivity_full.json`; Fig 6 tier pass criteria.
- Clean handoff: `revised/supplementary_data_build17_clean/` via `npx tsx scripts/assemble_build17_clean.ts`.
