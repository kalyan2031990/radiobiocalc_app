# CHANGELOG — v1.1.0 (build 18)

**Release:** 1.1.0 · `versionCode` 18  
**Branch:** `main` (merged)  
**Base:** v1.0.1-build17 — single-plan engine outputs unchanged (regression guard on 17 composite DVHs).

## Added

### F1 — Side-by-side plan (A/B) comparison
- `lib/plan-compare.ts` — dual evaluation via existing `offlineEvaluateComposite`, Δ table (D95, TCI, gEUD, NTCP, TCP, UTCP, P+, TWI).
- `app/plan-compare.tsx` — load two composite DVHs offline, compare, DVH overlay, PDF/DOCX export (`lib/comparison-report.ts`).

### F2 — On-device DVH replot and overlay
- `components/dvh-chart.tsx` — gEUD dose-axis marker (triangle), optional differential curve, A/B overlay series.
- `app/dvh-visualization.tsx` — gEUD from composite evaluation per structure.

### F3 — Dose–response curves and therapeutic-window dose sweep
- `lib/dose-sweep.ts` — NTCP/TCP curves, published CI sensitivity bands (Parotid, Spinal Cord, Lung only), UTCP dose sweep 20–100 Gy with optimal-dose marker.
- `components/dose-response-chart.tsx` — CI band overlay when literature CIs exist.
- `components/therapeutic-sweep-chart.tsx` — TCP / NTCP / UTCP vs total dose.
- `app/dose-response.tsx`, `app/therapeutic-window.tsx` — integrated charts.

### F4 — Expanded citation-linked parameter library
- `lib/parameter-library/` — versioned catalogue (`1.1.0`) with organ, endpoint, model, cohort, fractionation, published 95% CIs where available, DOI/PMID citations.
- `app/parameter-library.tsx` — offline browse/search; “view source” opens browser on explicit tap only.
- Engine continues to use `server/parameters.ts` numerics unchanged.

### F5 — Citation-first reporting
- `lib/citation-report.ts` — per-calculation “Parameters & references” section.
- `server/analysis-report.ts` — expanded PDF/DOCX references for all structures/models used.
- In-app provenance on dose–response screen.

### F6 — BED / EQD₂ fractionation-equivalence table
- `lib/fractionation-equivalence.ts` — 16 preset schedules, live α/β override, LQL (Astrahan) damping toggle, custom rows, category colours.
- `app/fractionation-table.tsx` — EQD₂ bar chart, CSV/PDF export.

## Version
- `app.config.ts`, `lib/app-meta.ts` → 1.1.0 / build 18.

## Tests
- `lib/v1.1.0-features.test.ts` — compare math, dose sweep, parameter library, fractionation table.

## Deferred
- **F7** re-irradiation / cumulative-dose module → v1.2 (not in this release).

## Regression
- Re-run `scripts/audit_radiobiology_full.ts` and six-metric parity on 17 composite DVHs before release APK.

## APK
- Target: `rbGyanX_mobile_v1.1.0_build18_offline.apk` (offline EAS / local gradle profile).
