# CHANGELOG — v1.2.0 (build 19)

**Release:** 1.2.0 · `versionCode` 19
**Base:** v1.1.0-build18
**Theme:** scientific correctness hardening + portable self-verification.
Every fix below is guarded by a new regression/property test.

## Fixed (science)

- **S1 — Generic Poisson TCP was mathematically inverted (critical).**
  `calculateTCP_Poisson` computed `TCP = exp(−N·(1−S(D)))` — monotone
  *decreasing* in dose and numerically degenerate with the default clonogen
  count. Replaced with the exact TCD50/γ50 parameterization of the Poisson
  model, `TCP = exp(−ln2 · exp((γ50/ln2)·(1 − D/TCD50)))` (Okunieff et al.
  1995): monotone non-decreasing, TCP(TCD50) = 0.5, slope γ50 by construction;
  an explicit clonogen-count override rescales the clonogen burden.
  **The default composite path (Poisson LQ-DVH) was never affected**, and the
  generic model is excluded from composite metrics — this fix concerns the
  selectable single-structure path only.
- **S2 — Generic Poisson NTCP renormalized.** Now `1 − exp(−ln2·(D/D50)^γ)`, so
  D50 is the true 50%-complication dose for any γ (previously required the
  seriality parameter to equal ln 2, which shipped parameter sets did not).
  Remains a display-only comparison model; composite metrics unchanged.
- **S3 — EUD was dimensionally incorrect.** `meanDose × volume^(−0.1)` removed;
  EUD is now Niemierko's gEUD with the organ volume parameter (a uniform-dose
  volume returns that dose, as required).
- **S4 — Dxx invalid on the differential-DVH path.** Dose-at-volume percentiles
  were interpolated against non-monotonic differential bin fractions; now
  computed from the cumulative curve (agrees with the codebase's cumulative
  interpolation convention; differential and cumulative paths verified to
  converge within one bin width).
- **S5 — V95/V100/V107 suppressed for OARs** (coverage indices are meaningful
  only for targets against a prescription), and for differential-input targets
  they are now evaluated against the prescription on the cumulative form
  (previously maxDose-relative with max-volume normalization).

## Fixed (consistency / engineering)

- **S6 — Fractionation table (F6):** EQD2 columns now derive from the *same*
  BED that is displayed when LQL damping is on (`EQD2 = BED_LQL/(1+2/(α/β))`);
  the α/β → (α, β) split β = 0.035 Gy⁻² is exposed as `lqlBetaGy2` and
  documented (previously hard-coded).
- **T2 — Version single-source:** `package.json`, `app.config.ts`,
  `lib/app-meta.ts` now all read 1.2.0 / build 19 (package.json previously
  said 1.0.0); `package-lock.json` re-synchronized with `package.json`.
- **Portability:** `scripts/run_dvh_parse_test.ts` no longer hard-codes a
  developer machine path (`C:\Users\Sampa\...`); it always tests the
  repo-bundled sample and skips absent legacy datasets cleanly.

## Added — verification

- `tests/engine-properties.test.ts` — 23 property/metamorphic tests (seeded,
  reproducible): monotonicity of TCP/NTCP, TCD50/D50 anchors, gEUD identities,
  BED↔EQD2 identity, constructed-DVH Dxx/Vxx, differential-vs-cumulative path
  agreement, OAR coverage-index suppression, EUD=gEUD, LQL BED/EQD2
  consistency, 200-case randomized robustness sweep, Poisson LQ-DVH scaling
  monotonicity.
- `scripts/run_v120_regression.ts` — 9-check regression gate: bundled cohort
  case RBX-TXT-001 composite NTCP/TWI/D95 verified unchanged against the frozen
  build-18 record, plus spot checks of every fixed path; writes a JSON
  artifact to `verification/v1.2.0/`.
- `verification/v1.2.0/` — archived logs: vitest (118/118), tsc, test gates,
  npm audit, regression artifact.

## Verification status (build 19)

| Gate | Result |
|------|--------|
| vitest (incl. 23 new property tests) | **118/118 PASS** |
| Offline engine self-test | PASS |
| DVH parse (both parsers, bundled sample) | PASS |
| Report export | PASS |
| PHI log scan | PASS |
| v1.2.0 regression (9 checks) | **9/9 PASS** |
| Default-path composite metrics (RBX-TXT-001) | **unchanged** vs build 18 |

Known debt (tracked for v1.3): 29 pre-existing `tsc --noEmit` errors in
legacy screens/scripts (none in engine or v1.2.0-touched files); `npm audit`
reports 62 vulnerabilities (4 critical) dominated by the legacy server/web
dependency tree slated for removal from the offline build (T1); on-device
tier-3 UI automation not re-run on this machine (no Android SDK/adb) — engine
changes are covered headlessly by the suites above.
