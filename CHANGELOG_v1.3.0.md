# CHANGELOG — v1.3.0 (build 20)

**Release:** 1.3.0 · `versionCode` 20
**Base:** v1.2.0-build19
**Theme:** uncertainty-aware reporting — Monte-Carlo parameter-uncertainty
propagation for TCP/NTCP (the Wave-3 headline feature).

## Added

- **`server/uncertainty.ts` — Monte-Carlo uncertainty engine.**
  Seeded (mulberry32 + Box–Muller, byte-reproducible) propagation of
  dose–response parameter uncertainty into 95% confidence bands for the LKB
  logistic NTCP and the logistic-form TCP:
  - Parameters with published 95% CIs (Parotid, Spinal Cord, Lung TD50 —
    QUANTEC organ papers) are sampled from CI-matched distributions
    (log-normal for doses, truncated normal for slopes).
  - Parameters without published CIs use explicitly labelled assumed relative
    uncertainties (TD50 CV 10%, γ50 CV 25% defaults); every band carries a
    provenance label: `published` / `mixed` / `assumed`.
  - Analytic delta-method cross-check (`logisticResponseDeltaSd`) guards the
    Monte-Carlo implementation (verified in tests).
  - `logisticSweepWithUncertainty` feeds banded dose–response curves.
- **Composite evaluation:** each OAR result on the default LKB logistic path
  now carries `ntcpUncertainty` (95% band + provenance). Additive only —
  point estimates, composite metrics and all v1.2.0 regression anchors are
  unchanged.
- `scripts/run_v130_uncertainty_verification.ts` — verification harness for
  the bundled reference case; writes
  `verification/v1.3.0/v130_uncertainty_results.json`.
- `tests/uncertainty.test.ts` — 9 tests: seeded reproducibility, MC stability,
  band-brackets-point, width-vs-CV monotonicity, MC ≈ delta-method (±25%),
  [0,1] bounds over sweeps, TD50 anchoring, provenance labels, sweep monotony.

## Reference results (RBX-TXT-001, 66 Gy/33 fx)

| Structure | NTCP | 95% band | Provenance |
|---|---|---|---|
| Larynx | 62.7% | 43.9–81.1 | assumed |
| Parotid | 53.8% | 46.7–62.2 | mixed (published TD50 CI) |
| Spinal Cord | 0.0% | 0.0–0.1 | mixed (published TD50 CI) |
| TCP (logistic form, EUD 67.5 Gy) | 71.9% | 35.8–94.2 | assumed |

## Verification status (build 20)

| Gate | Result |
|------|--------|
| vitest (incl. property + uncertainty suites) | **127/127 PASS** |
| v1.2.0 regression gate | 9/9 PASS (unchanged) |
| v1.3.0 uncertainty verification | ALL PASS |
| `tsc --noEmit` on v1.3.0-touched files | clean |

## Notes

- Bands quantify **parameter** uncertainty of the documented models only —
  not model-form or inter-patient uncertainty. Composite metrics continue to
  use point estimates.
- Version single-source updated: package.json / app.config.ts / app-meta =
  1.3.0 / build 20.
