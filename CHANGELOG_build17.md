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
