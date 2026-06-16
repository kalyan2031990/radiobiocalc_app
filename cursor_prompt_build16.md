# Cursor prompt — rbGyanX Mobile build 17 (bug-fix + on-device rerun)

> Paste everything below into Cursor (Agent mode) with the `radiobiocalc_app` repo open.
> A vivo 1907 (Android) must be connected via USB with USB debugging ON before the device-run phase.

---

You are working in the `rbGyanX Mobile` repository (TypeScript + Expo / React Native, package `com.rbgyanx.radiobiocalc`, currently **v1.0.0, versionCode 16 / build 16**). Produce **build 17 (versionCode 17, v1.0.1)** on top of build 16. Do **not** change any radiobiological equation except where I explicitly flag a defect below. Preserve the fully-offline guarantee — no network calls in any calculation or export path. Work on a branch `build17-bugfix` and write a `CHANGELOG_build17.md` summarising every change.

## 0. Inputs and outputs (Windows paths)
- Validation inputs (17 composite DVH `.txt` + 1 synthetic clinical spreadsheet `radiobiocalc_clinical_input.xlsx`):
  `C:\Users\Sampa\OneDrive\Desktop\rbGyanX_mobile_paper\revised\supplementary_data_build16\input`
- Save ALL build-17 results, audit tables, JSON, logs and exported PDFs to:
  `C:\Users\Sampa\OneDrive\Desktop\rbGyanX_mobile_paper\revised\supplementary_data_build17\output`
  Create this folder if it does not exist. Mirror the build-16 output layout (`clinical_composite_reports/`, `engine_results_audit.md`, `engine_independent_parity.json`, `device_validation_summary.md`, plus a new `report_export_index.md`).

## 1. Bugs to fix (with acceptance criteria)

### BUG-1 (critical) — Poisson target model returns 0% where it should be high
In the build-16 audit, for a well-covered target (PTV 66, RBX-TXT-001) the target model catalogue gives:
`lkb_loglogit = 85.8%`, **`poisson = 0.0%`**, `zaider_minerbo = 100.0%`, **`poisson_dvh = 100.0%`**.
A generic `poisson` **target** model returning 0% while `poisson_dvh` returns 100% for the same PTV is almost certainly a defect — likely the generic Poisson TCP is being evaluated with OAR-style parameters, a wrong gEUD/`a`-exponent sign, or an uninitialised clonogen/surviving-fraction term when applied to a target.
- Locate the TCP model dispatch (search the engine module for identifiers `zaider_minerbo`, `poisson_dvh`, `lkb_loglogit`, and the per-structure model loop).
- Diagnose the root cause for the `poisson` target path. Either fix the parameterisation so it returns a physically sensible value, **or**, if it is a redundant/ill-defined variant for targets, remove it from the target catalogue so only validated target models are shown.
- **Acceptance:** no target model returns 0% for a target receiving ≥ prescription dose to ≥90% volume; document the fix and the chosen resolution in the CHANGELOG.

### BUG-2 (reported in §3.7) — non-default TCP/NTCP model cannot be selected/run
There is a defect in selecting and running a **non-default** TCP/NTCP model to drive the composite (the default-model pathway and the full per-structure display are unaffected).
- Reproduce: open the Biological tab, switch the composite-driving model away from the default (Poisson LQ-DVH targets / LKB-logistic OARs), run calculation.
- Fix so the selected model actually drives UTCP / P+ / TWI and the report reflects the selection.
- **Acceptance:** changing the selected model changes the composite outputs and the exported PDF consistently; add a unit/integration test covering a non-default selection.

### BUG-3 — TCP display ceiling contaminates composite metrics
Currently the 95% display cap on Poisson LQ-DVH TCP is fed into UTCP, P+ and TWI, so 16/17 cases sit at the ceiling and the composites are NTCP-driven only.
- Keep **uncapped TCP internally**; use the cap for **display only**. Compute UTCP, P+ and TWI from the **uncapped** value. Surface both capped (clinician) and uncapped (research) numbers in the engine output and report.
- **Acceptance:** engine output and audit table contain both `tcp_display` and `tcp_uncapped`, and the composite metrics are computed from `tcp_uncapped`.

### BUG-4 (housekeeping, found in build-16 data)
- Reconcile the TCI inconsistency across files (e.g. RBX-TXT-001 TCI is 90.1 in `engine_results_audit.md` but 92.3 in the verifier's hardcoded `APP` table). The engine output must be the single source of truth; downstream tables/scripts read from it, not from hardcoded copies.
- Fix the mojibake in the audit Markdown (garbled `Δ` and `—` characters) by writing all reports as UTF-8.

## 2. UX fixes from the §3.7 pilot work list
- **Progress indicator:** the ≈60–90 s composite evaluation currently has no progress feedback. Add a determinate or busy progress indicator (and ideally move the heavy calc off the JS UI thread / yield so the spinner animates).
- **Action buttons below the fold:** move the primary actions (Calculate / Export) into view without scrolling on a typical phone viewport (target the vivo 1907 screen).

## 3. Version bump → build 17
- Set `versionCode` to **17** and version name to **1.0.1** in `app.json` / `app.config.(js|ts)` and Android `build.gradle` (and anywhere the build label is rendered in-app, e.g. the home screen "build 16" text).
- Update any in-app/report footer that prints the build label.

## 4. Tests + independent verification
- Run the existing test suite (`npm ci && npm run test:ci`) and make all tests pass; add the new tests for BUG-1, BUG-2, BUG-3.
- Update `scripts/independent_verification.py` so it (a) reads the engine's exported results from the run output **instead of hardcoded reference values**, and (b) **independently reproduces TCP, UTCP and P+** (not just NTCP/D95/TWI). Re-run it against the 17 inputs and write `engine_independent_parity.json` with per-case Δ for D95, NTCP, TCP, UTCP, P+, TWI.

## 5. Build the offline APK
- Build the offline release APK using the EAS offline profile used for build 16 (e.g. `eas build -p android --profile offline --local` or the project's existing offline build script). Output `rbGyanX_mobile_build17_offline.apk`.
- Copy the APK to `...\supplementary_data_build17\output\`.

## 6. Install and run on the connected vivo 1907 (adb)
- Confirm the device: `adb devices` (vivo 1907 must show as `device`). If multiple, target it by serial with `adb -s <serial>`.
- Install: `adb install -r rbGyanX_mobile_build17_offline.apk`.
- Push the 17 DVH files and the clinical spreadsheet from the build-16 input folder to the device storage location the app reads (Downloads or the app inbox under scoped storage), e.g. `adb push "C:\Users\Sampa\OneDrive\Desktop\rbGyanX_mobile_paper\revised\supplementary_data_build16\input\composite_dvh\." /sdcard/Download/` and the xlsx alongside.
- Reuse / adapt the existing **Tier-3 adb UI-automation** that drove the 17-case device loop for build 16 (the ~43 min loop referenced in the manuscript). For each of the 17 cases, drive: import → plan setup (prescription auto-filled from DVH header) → calculate → therapeutic-window chart → **export PDF**, with the clinical row linked and covariate adjustment ON. Capture per-case PASS/FAIL and the engine numbers.
- If no automation script exists in the repo, generate one (Python or shell driving `adb shell input` / UI Automator), parameterised over the 17 case IDs.

## 7. Collect results back to the PC (desktop)
- Pull all generated PDFs from the device to `...\supplementary_data_build17\output\clinical_composite_reports\`.
- Write to `...\supplementary_data_build17\output\`:
  - `engine_results_audit.md` — per-case TCP(display + uncapped), NTCP, UTCP, P+, TWI, TCI, D95, Rx, Fx; plus the per-structure model catalogue for RBX-TXT-001 showing BUG-1 resolved.
  - `device_validation_summary.md` — 17/17 engine + device PASS table.
  - `engine_independent_parity.json` — from step 4.
  - `report_export_index.md` — list of the 17 exported PDFs with clinical source + status.
  - `build17_run.log` — full adb/build console log.
- Verify counts: 17 PDFs present, audit table has 17 rows, parity JSON has 17 entries.

## 8. Deliverables to report back to me
1. Branch `build17-bugfix` with `CHANGELOG_build17.md`.
2. Root cause + fix description for BUG-1 (the Poisson target 0%) and BUG-2 (non-default model selection).
3. Test result (`X/X PASS`) and the updated independent-parity summary (mean/max |Δ| for D95, NTCP, TCP, UTCP, P+, TWI).
4. Confirmation that `...\supplementary_data_build17\output\` contains the APK, 17 PDFs, the four report files, and the run log.

**Constraints:** offline only (no network in calc/export); do not alter validated equations except the BUG-1 defect; all files written UTF-8; engine output is the single source of truth for every downstream table and script.
