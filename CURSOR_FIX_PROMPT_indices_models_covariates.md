# Cursor fix prompt — rbGyanX Mobile: dosimetric indices, multi-model output, covariate adjustment

> Paste into Cursor. These are **verified defects** found by independent recomputation against the 17 composite DVH inputs (`rbGyaX_mobile_app_input`) and the exported clinical PDFs (`exported_pdfs_clinical`). Each item lists the evidence, the exact file/symbol, the root cause, the required fix, and an acceptance check. Fix in order; do not regress the parts that are already correct (Dxx and HI *values* compute correctly — only their **labels** and the **CI** are wrong).

## Evidence summary (what was verified)

- The application's `D98/D95/D50/D2` and the two homogeneity numbers are numerically correct (independent recompute on RBX-TXT-001: D98 64.2 vs app 64.3; D2/D98 1.078 vs app 1.079; (D2−D98)/D50 0.074 vs app 0.075).
- **`CI (RTOG)` is wrong**: app prints `CI = 0.923` for RBX-TXT-001 and `0.874` for RBX-TXT-007 — i.e. exactly `TCI/100`. RTOG conformity is **not** target coverage.
- **`HI (ICRU)` is mislabelled**: app labels `D2/D98` as "HI (ICRU)". ICRU-83 HI is `(D2−D98)/D50` (the value the app currently calls "HI (modified)").
- **Only the default model is reported**: every exported composite report shows `poisson_dvh` for the target and `lkb_loglogit` for each OAR; the LKB-probit, Poisson and Zaider–Minerbo alternatives are never computed or shown, although the methods/manuscript list them.
- **Covariate adjustment is inert/inconsistent**: every report shows `TCP 100.0% (base 100.0% → covariate-adjusted 100.0%)` because the adjustment is applied to the unsaturated model TCP (≈1.0), where a log-odds shift has no visible effect; meanwhile the per-structure NTCP shown equals the base value, contradicting the "covariates applied to TCP/NTCP" footnote.

---

## Bug 1 — RTOG Conformity Index is not a conformity index (HIGH)

**File:** `lib/plan-dosimetric-indices.ts`, function `computeTargetPlanIndices`; reported in `lib/export-report-composite.ts:95`.

**Current code:**
```ts
const tvNorm = 100;
const tvRi = Math.max(v100Rx, 1e-6);   // v100Rx = % of TARGET receiving >= Rx  (== TCI)
const ciRtog = tvRi / tvNorm;          // == TCI/100  -> NOT conformity
```

**Root cause:** RTOG CI = V_RI / V_TV, where **V_RI = volume of the whole patient/external receiving ≥ the prescription isodose** and V_TV = target volume. The composite DVH is **target-only**, so V_RI is unavailable and the code substitutes target coverage. The result can never exceed 1 and is blind to dose spilling outside the target — the entire purpose of CI.

**Fix:**
1. Change the signature so CI can be computed only when an external/BODY (or "patient"/"External") structure DVH is supplied. Add an optional `bodyDvh?: DVHPoint[]` and `targetVolumeCm3?: number` to `computeTargetPlanIndices` (and thread the BODY DVH through `evaluateCompositePlan`; the DICOM composite cases contain a `BODY`/`patient` structure — currently excluded — so make the engine retain it for this purpose even if it is not scored for NTCP).
2. When body dose is available:
   `V_RI = absoluteVolume(bodyDvh, dose ≥ Rx)`; `CI_RTOG = V_RI / V_TV` (both in cm³).
   Paddick CI = `(V_T,RI)² / (V_TV · V_RI)` where `V_T,RI` = target volume receiving ≥ Rx (cm³). Gradient index = `V_50%Rx,body / V_100%Rx,body`.
3. When body dose is **not** available (text composites): do **not** emit a numeric CI/Paddick/GI. Set them to `null` and have the report print `"CI: requires external/body dose — not available"`. Never print `TCI/100` as CI.
4. Remove the `tvNorm = 100` surrogate logic entirely.

**Acceptance:** For the three DICOM cases (BODY present) CI is computed from body dose and is typically ≥ 1; for the 14 text cases CI is reported as not-available, not `TCI/100`.

---

## Bug 2 — Homogeneity-index labels are wrong (MEDIUM)

**File:** `lib/plan-dosimetric-indices.ts` (fields `hiIcu`, `hiModified`) and `lib/export-report-composite.ts:96`.

**Root cause:** ICRU Report 83 defines homogeneity as `HI = (D2% − D98%) / D50%` (dimensionless, ideal = 0). The ratio `D2%/D98%` is a different, older index (ideal = 1). The code computes both correctly but labels the **ratio** as "HI (ICRU)".

**Fix (labels only; keep the math):**
- Rename `hiIcu` → `hiRatio` and label it `"HI (D2/D98 ratio)"`.
- Rename `hiModified` → `hiIcru83` and label it `"HI (ICRU-83)"`, note `"(D2−D98)/D50"`; make this the primary homogeneity metric in the report.
- Update `export-report-composite.ts`, any UI strings, and the explainability/citation note accordingly.

**Acceptance:** Report shows `HI (ICRU-83) = (D2−D98)/D50` (≈0.075 for RBX-TXT-001) as primary, and `HI (D2/D98 ratio) ≈ 1.079` as secondary, correctly labelled.

---

## Bug 3 — Dxx percentiles are not interpolated (LOW)

**File:** `lib/plan-dosimetric-indices.ts`, `dosePercentile` (and `volumePercentAtLeast`).

**Root cause:** `dosePercentile` returns the dose of the first bin whose cumulative volume ≤ target, with no interpolation, causing quantisation (app D95 65.4 vs interpolated 65.2).

**Fix:** Linearly interpolate between the two DVH points that bracket the target volume (dose-on-volume interpolation), as in a standard Dxx. Apply the same bracketed interpolation to `volumePercentAtLeast` (volume-on-dose). Also fix the OAR `D50 = "—"` artefact (return a finite value or interpolate rather than emitting a dash/NaN).

**Acceptance:** Dxx values change by <0.3 Gy and the D50 dash disappears for OARs.

---

## Bug 4 — Composite report computes only the default model (HIGH for paper consistency)

**File:** `server/composite-plan-evaluation.ts` (≈ line 146: `const model = role === "target" ? tcpModel : ntcpModel;` with defaults `defaultCompositeTcpModel` / `lkb_loglogit`); `performCalculation` evaluates a single model.

**Root cause:** The composite/clinical pipeline runs exactly one model per structure (the default). The LKB-probit, Poisson and (for targets) Zaider–Minerbo / LKB alternatives are implemented in `server/radiobiology.ts` but never invoked or shown here, so the report/manuscript claim of "multiple models" is not reflected in output.

**Fix (choose and implement):**
1. In `evaluateCompositePlan`, for each structure evaluate **all models for which literature parameters exist** (targets: `poisson_dvh`, `lkb`, `zaider_minerbo`; OARs: `lkb_loglogit`, `lkb_probit`, `poisson`), returning an array of `{model, value}` per structure alongside the default.
2. In the report (`export-report-composite.ts` / `analysis-report.ts`), add a per-structure "model comparison" sub-table (default flagged), or at minimum list the alternative-model values.
3. Keep the default as the value used for composite UTCP/P+/TWI, and state which model drives the composite.
4. If a model is intentionally not offered for a structure type, say so explicitly rather than silently dropping it.

**Acceptance:** A composite report for RBX-TXT-001 shows, for LARYNX, NTCP from `lkb_loglogit`, `lkb_probit` and `poisson`; for the PTV, TCP from `poisson_dvh` and at least one alternative — with the composite-driving model labelled. The manuscript's multi-model claim then matches behaviour.

---

## Bug 5 — Clinical covariate adjustment is inert and inconsistently displayed (HIGH)

**Files:** `lib/manuscript-covariates.ts` (`applyManuscriptCovariates`), `lib/batch-mobile-report.ts:135` (call site), `server/analysis-report.ts:87-89` (display).

**Root cause:**
- The adjustment is applied to the **uncapped model TCP**, which saturates at ≈1.0 for every case; a log-odds shift on logit(0.9999) is invisible, so the report always prints `TCP 100.0% → 100.0%`.
- The per-structure NTCP shown in the composite table is the **base** value (matches the engine table), yet the footnote states covariates were applied to TCP **and** NTCP. For RBX-TXT-001 (clinical context smoking = former, chemo = yes) the documented priors (chemo +0.10, smoking +0.18 to NTCP log-odds) should move larynx NTCP from 62.7% to ≈69%, but the report shows 62.7%. So either the link is not flowing to the displayed NTCP, or only TCP is adjusted.

**Fix:**
1. **Make the effect transparent and consistent.** When covariates are ON and a clinical row is linked, display **base → adjusted** for the composite TCP **and** for every per-structure NTCP that the adjustment touches; when OFF, display base only and add no "covariate-adjusted" wording.
2. **Resolve the TCP-saturation issue.** Because the model TCP saturates, covariate adjustment of TCP is meaningless at the display level. Either (a) apply and show the adjustment on a non-saturated representation (e.g. before any near-1 saturation, or on a secondary continuous TCP endpoint), or (b) explicitly state in the report that the TCP covariate term has no effect when TCP is at ceiling, and surface the **NTCP** covariate effect (which is non-null) prominently. Do not print "covariate-adjusted" on a number the covariates did not change.
3. **Verify the data link.** Ensure the linked `NTCP_OAR` clinical row actually reaches the per-structure NTCP shown in the report (trace `applyManuscriptCovariates(calc.tcp, calc.ntcp, …)` → report table). Add a unit test.
4. **Label as exploratory** at every display point (already required).

**Acceptance:** With covariates ON for RBX-TXT-001 (smoking former, chemo yes), the larynx NTCP shows `62.7% → ~69.x%` and the report explains the TCP term is inactive at ceiling; with covariates OFF, all values equal the base engine values exactly.

---

## Cross-cutting: keep the verified-correct behaviour

Do **not** change: the LKB log-logistic NTCP math, the EQD2 correction of OAR dose using prescription dose-per-fraction, composite NTCP = max single-organ NTCP, TWI = TCP − Σ λ·NTCP, and the parser layer (three parsers already agree to 0.000 Gy). These reproduce an independent re-implementation to within 0.30 Gy (D95), 0.80 pp (NTCP) and 1.60 pp (TWI) across 17 cases and must stay intact.

## Validation protocol (run after fixes)

1. `npm run test:ci` and the engine suite — all green.
2. Re-export the 17 clinical PDFs and confirm: CI computed from body dose for the 3 DICOM cases / "not available" for the 14 text cases; HI labels corrected; per-structure multi-model values present; covariate base→adjusted shown consistently.
3. Re-run the independent verification script (`figures/independent_verification.py`) — D95/NTCP/TWI agreement must be unchanged (these were correct).
4. Add unit tests for: CI from a synthetic body DVH (known V_RI/V_TV); ICRU-83 HI label/value; Dxx interpolation; multi-model per-structure output; covariate base→adjusted for a known clinical row.
5. Update `docs/validation/*` and the manuscript's Methods (indices, multi-model, covariates) to match the corrected behaviour, and remove any claim the code does not yet meet.

## Author/manuscript note
After these fixes, update the manuscript: (i) CI/Paddick/GI only reported where body dose exists; (ii) corrected HI nomenclature; (iii) multi-model results table; (iv) honest covariate-effect description. These changes strengthen the verification (VT6) story rather than weaken it.
