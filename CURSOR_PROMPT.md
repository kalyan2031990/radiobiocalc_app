# Cursor Master Prompt — rbGyanX Radiobiocalc → Production-Grade Offline Clinical App (v1.0.0)

> Paste this entire file into Cursor as the task. Work **phase by phase, top to bottom**. Do **not** skip a phase. After each phase, run the phase's checks and only continue when they pass. Commit locally after each phase (do **not** push until Phase 13).

---

## 0. Role, mission, and non-negotiable constraints

You are a senior React Native / radiation-oncology software engineer. You are hardening an existing Expo / React Native app (`rbGyanX Radiobiocalc`) into a **professional, offline-first mobile app for daily clinical use by medical physicists and radiation oncologists**.

**Hard constraints — never violate:**

1. **Offline-first.** Every clinical calculation (DVH parsing, DICOM parsing, BED/EQD2/EUD/gEUD, TCP/NTCP, therapeutic window, report export) **must run fully on-device with no network**. The optional export API server may stay, but the app must be 100% functional with airplane mode on.
2. **Build with the locally installed Android Studio + Gradle**, NOT EAS cloud. Produce a real signed-debug or release APK on this PC (see Phase 10).
3. **Privacy / PHI.** Input data contains **real patient names**. De-identification must be enforced on every import path before data is persisted or exported. Never log PHI. Never transmit PHI.
4. **No fabricated clinical validity.** Any model output that is approximate, research-only, or uses unvalidated parameters must be labeled as such in the UI and in the technical note. Do not silently "improve" numbers — fix the math correctly and document it.
5. **Determinism & traceability.** Every reported number must be reproducible from inputs + named parameters + cited reference. Keep a parameter-provenance trail.
6. **Don't break the working `.txt` path.** The Eclipse `.txt` DVH parser already parses 163/163 real files correctly — extend, don't regress it. Add regression tests to lock current behavior before refactoring.

**Tech baseline (already in repo):** Expo SDK 54, RN 0.81, expo-router, new architecture enabled, TypeScript, vitest, Drizzle. App id `com.rbgyanx.radiobiocalc`.

---

## 1. Real test data you will use (already on this PC)

Input root: `C:\Users\Sampa\OneDrive\Desktop\input_folders\radbiocalc_input`

```
radbiocalc_input/
├─ OAR_DVH_txt_data/         # 148 Eclipse .txt cumulative DVH exports
│   ├─ laryanx/   (larynx OARs)
│   ├─ parotid/
│   └─ spinalcord/
├─ PTV_DVH_txt_data_14pt/    # 15 PTV .txt DVH exports (targets)
├─ DICOM_input_data_1pt/     # 1 full patient: RTDOSE + RTPLAN + RTSTRUCT
│   ├─ RD.*.dcm  (RTDOSE — Modality=RTDOSE, DoseUnits=GY, PHYSICAL, PLAN; grid 87×144×145;
│   │             **contains embedded DVHSequence (3004,0050): 13 structures, cumulative, Gy**)
│   ├─ RP.*.dcm  (RTPLAN — 30 fractions planned, 5 beams)
│   └─ RS.*.dcm  (RTSTRUCT — 14 ROIs: BODY, GTVp, Lung_R, Lung_L, SpinalCord, CTVp,
│                 "PTV 60Gy/30FR", PRV Cord, Heart, LungTOTAL, CouchSurface/Interior, …)
├─ clinical_input/           # optional clinical covariates (xlsx)
│   ├─ synthetic_clinical_data_from_PTV.xlsx     (PatientId, Diagnosis, TotalDose_Gy, n_frac, Technique, Organ)
│   ├─ test_toxicity_clinical_HN_rbgyanx_input.xlsx (PatientID, Site, Age, Sex, ECOG, Stage_T/N, Smoking, Chemo, Technique)
│   └─ treatment_params_toxicity_HN57_input.xlsx (116 rows: prescription + organ per patient)
```

**Key facts confirmed by inspection:**
- `.txt` files are Varian Eclipse cumulative DVH; columns = `Dose [cGy]  Relative dose [%]  Structure Volume [cm³]`. Parser must read col0 as dose (cGy→Gy) and the **last** column as absolute volume (cm³).
- The **RTDOSE already carries a DVHSequence** — so DICOM DVH extraction does **not** require dose-grid + contour recomputation. Read the embedded sequence and map `ReferencedROINumber` → ROI name from the RTSTRUCT. (Implement grid-based DVH only as a documented future fallback.)
- The lung case = 60 Gy / 30 fx; structures include a clear PTV, OARs (lungs, cord, heart) → a complete TCP+NTCP+therapeutic-window scenario.

**Synthetic-data rule:** if any real input is missing, malformed, or clinically inadequate for a given test (e.g., no matching PTV for an OAR, missing prescription, missing covariate columns), **fall back to deterministic synthetic data** clearly tagged `SYNTHETIC` in logs and reports — never block the test run, never present synthetic numbers as real.

---

## 2. Issues to fix (the full backlog — every item must be addressed)

### A. DICOM on-device parsing (TOP PRIORITY — currently a placeholder)
- `server/data-handler.ts → parseDICOMFiles()` returns "requires backend pydicom". Replace with a **native, offline DICOM reader**.
- Add `lib/dicom-dvh-native.ts`:
  - Use a pure-JS DICOM library that works in React Native/Hermes (`dcmjs`, or `daikon`, or a minimal custom DICOM tag reader if libs are too heavy — prefer reading only the tags needed). Confirm it runs on-device (no Node `Buffer`/`fs` assumptions; use `expo-file-system` to read the file as base64/ArrayBuffer).
  - Parse **RTSTRUCT**: `StructureSetROISequence` → map `ROINumber → ROIName`.
  - Parse **RTDOSE**: `DVHSequence (3004,0050)`. For each item read `DVHType`, `DoseUnits`, `DVHData` (paired dose-bin-width / volume values), `DVHNumberOfBins`, and `DVHReferencedROISequence[0].ReferencedROINumber`. Reconstruct cumulative dose-vs-volume points. Convert to **Gy** and the app's `ParsedDvhBundle` shape (reuse `lib/dvh-bundle-types.ts`).
  - Parse **RTPLAN** (optional but do it): `FractionGroupSequence → NumberOfFractionsPlanned` and prescription if present, to auto-fill total dose / fractions.
  - Skip non-clinical ROIs (Couch*, BODY by default unless selected).
  - Emit the same bundle the `.txt` path emits so downstream calc/report code is unchanged.
- Wire `app/dicom-upload.tsx` to call the **native** parser (remove the tRPC/server dependency on the offline path). Let the user pick RD/RP/RS files (multi-select), auto-detect modality by tag, and preview extracted structures + mean/max dose before calculating.
- Add `isDicom()` detection (magic bytes `DICM` at offset 128) and route accordingly.

### B. Clinical-model correctness
1. **EQD2 / fractionation correction for LKB NTCP & gEUD.** Currently `gEUD` for NTCP is computed on **physical** dose. Add per-bin **EQD2 conversion** (`EQD2 = D·(α/β + d_bin)/(α/β + 2)`, with per-fraction dose derived from the bin dose and number of fractions) **before** the gEUD/DVH reduction when the model parameters are defined on a 2-Gy basis. Make this explicit and toggleable; default ON for LKB when fractionation ≠ 2 Gy. Document the formula and assumptions.
2. **LKB-probit DVH reduction.** Replace the hardcoded `vEffective = 1.0` + max-dose shortcut with a proper **Kutcher–Burman effective-volume DVH reduction** (`v_eff = Σ vᵢ (Dᵢ/D_max)^(1/n)`), or clearly relabel the current path as "max-dose probit (approx.)" if you keep it as an option. Prefer implementing the real reduction.
3. **TCP Poisson clonogen count.** Remove the magic `1e7`; expose `numClonogenicCells` (or clonogen density × volume) as a named, documented, per-site parameter with a cited default, and surface it in provenance.
4. **Parameter sourcing.** Ensure every organ/site parameter (`td50, m, n, γ50, α/β, d50`) has a citation (QUANTEC / RTOG / published LKB fits) in `server/parameters.ts` provenance. Flag any parameter without a primary source.
5. **Guardrails.** Keep existing LQ-validity caution (dose/fraction > threshold). Add domain checks: reject/flag DVHs with non-monotonic cumulative volume, zero-volume structures, or dose units mismatch.

### C. Structure naming — replace fragile regex
- Replace the `inferRole()` regex heuristic with a **TG-263-aware mapping layer** (`lib/structure-nomenclature.ts`): normalize structure names to TG-263 standard terms, classify target vs OAR, and map to the correct parameter set. Keep a user override in the UI ("this structure is a target/OAR; treat as <organ>"). Maintain a lookup table covering at least the organs in the test data (larynx, parotid L/R, spinal cord, lungs, heart, PTV/CTV/GTV variants incl. "PTV 60Gy/30FR", "COMB_PRTD", "PRV Cord").

### D. PHI / privacy enforcement
- Enforce **de-identification on every offline import** (txt + DICOM + xlsx): strip/replace patient name, ID, dates, and other DICOM PHI tags (0010,xxxx etc.) with a stable pseudonymous local ID before persistence or export. Reuse/port `server/anonymize-dvh.ts` into a native `lib/anonymize.ts`.
- Never write PHI to logs (`console.log`), AsyncStorage in clear text, or reports. Add a lint/grep CI check that fails if `patientName`/raw name is logged.
- Add an in-app privacy notice describing on-device-only processing.

### E. Local secure persistence
- Add an **on-device encrypted patient store** (SQLite via `expo-sqlite` or Drizzle-on-device; secrets in `expo-secure-store`). Patient cases, DVH bundles, and results persist locally, encrypted, survive app restarts, and can be deleted by the user. No cloud dependency.

### F. Optional clinical-covariate layer (must be OPTIONAL for the user)
- The covariate columns exist in `clinical_input/*.xlsx` (Age, Sex, ECOG, Stage_T/N, Smoking, Chemo, HPV…). Implement `lib/clinical-modifiers.ts` that **only** adjusts TCP/NTCP when the user explicitly enables "Adjust for clinical factors" **and** a validated coefficient set exists for that site/endpoint.
- When disabled (default), covariates are **traceability-only** and must not change any number. Label this clearly in UI and reports.
- Provide an importer that reads the xlsx covariate sheets (offline, e.g. via SheetJS) and attaches covariates to a case.

### G. Regulatory / intended-use & disclaimers
- Add a clear **Intended Use / Limitations** statement: this is **research / educational / decision-support** software, **not** a substitute for clinical judgment or a cleared medical device, unless/until formally validated and registered. Strengthen the existing disclaimer modal; require first-run acknowledgement; include it in every exported report footer.
- Add `INTENDED_USE.md` and a short "Validation status" section to the technical note.

### H. Release / repo hygiene
- Commit the ~40 uncommitted modified files (review each), consolidate branches, and prepare a clean `main` (see Phases 12–13).
- Gate `android.usesCleartextTraffic` to **debug builds only** (release builds must disallow cleartext). The LAN pilot API is dev-only.
- Ensure GitHub Actions CI runs the full test suite (`test:ci`) on push/PR.

---

## 3. Phased execution plan

### Phase 0 — Baseline & safety net
- Create branch `release/v1.0.0`.
- Run `npm install` (fix the esbuild/optional-deps platform issue if present), `npm run check` (tsc), `npm run lint`, `npm run test`. Record the starting state.
- **Lock current behavior:** add characterization tests that parse a few `.txt` fixtures and snapshot the parsed bundle + key metrics, so later refactors can't silently regress.
- ✅ Gate: project type-checks and current tests pass (or failures are documented).

### Phase 1 — On-device DICOM (Section A)
- Implement `lib/dicom-dvh-native.ts` + detection + `dicom-upload.tsx` wiring + de-id of DICOM PHI tags.
- ✅ Gate: feeding the real `DICOM_input_data_1pt` files yields the 13 structures with correct names, units in Gy, and sane mean/max doses (GTVp mean ≈ 60 Gy, lungs lower).

### Phase 2 — Model correctness (Section B)
- Implement EQD2 correction, real LKB-probit reduction, parameterized clonogens, parameter citations, guardrails.
- ✅ Gate: unit tests for BED/EQD2/gEUD/EUD/TCP/NTCP pass against hand-computed reference values; EQD2 path verified for a hypofractionated example.

### Phase 3 — TG-263 nomenclature (Section C)
- ✅ Gate: every structure in the real dataset maps to a correct role + organ; ambiguous names prompt user override instead of silently defaulting.

### Phase 4 — PHI enforcement (Section D)
- ✅ Gate: grep/CI check passes; importing real files persists only pseudonymous IDs; reports contain no patient names.

### Phase 5 — Secure local store (Section E)
- ✅ Gate: create → save → kill app → reopen → case still present and decrypts; delete works.

### Phase 6 — Optional clinical-covariate layer (Section F)
- ✅ Gate: with toggle OFF, numbers identical to Phase 2; with toggle ON (and a validated set), adjustment applies and is logged in provenance; xlsx covariate import works.

### Phase 7 — Intended use & disclaimers (Section G)
- ✅ Gate: first-run acknowledgement required; disclaimer in every exported report.

### Phase 8 — Test framework hardening
- Expand vitest coverage to the calculation engine, parsers (txt + DICOM), nomenclature, anonymizer, report export. Add a **clinical validation suite** comparing engine outputs to published/reference cases (QUANTEC endpoints where applicable) with tolerances.
- Keep/extend the existing self-test scripts (`offline-engine`, `dvh-parse`, `report-export`, `composite-plan`, `therapeutic-window`) and the `app-selftest` / `mobile-boot-selftest` in-app self-tests.
- Wire everything into `npm run test:ci`.
- ✅ Gate: **all self-tests and unit/validation tests green.**

### Phase 9 — Real-data integration test (run only after Phase 8 passes)
Create `scripts/run_real_data_suite.ts` driven by `INPUT_FOLDERS=C:\Users\Sampa\OneDrive\Desktop\input_folders\radbiocalc_input`. It must:
1. Parse **all 163** `.txt` DVH files → assert 100% parse, correct roles, plausible dose ranges.
2. Parse the **DICOM** patient → assert 13 structures, correct ROI names, Gy units, plan = 60 Gy/30 fx.
3. Build composite PTV+OAR plans (e.g., lung PTV 60Gy/30FR + Lung/Cord/Heart; HN larynx/parotid OAR + matching PTV) → compute TCP, NTCP, therapeutic window (UTCP/TWI), XAI explanation, and export a PDF/DOCX report per case.
4. **Clinical covariates: test both modes** — once with the covariate layer OFF (default) and once ON using `clinical_input/*.xlsx`; assert OFF-mode numbers are unchanged and ON-mode differences are logged.
5. Where a real PTV/OAR pairing or prescription is missing, **substitute tagged SYNTHETIC data** and continue; report which cases used synthetic inputs.
6. Emit `test-output/REAL_DATA_REPORT.md` + `.json` with a per-case table: structure, role, mean/max dose, BED, EQD2, gEUD, TCP, NTCP, TWI, model used, parameter sources, synthetic? pass/fail.
- ✅ Gate: suite overall PASS; report generated; no PHI in outputs.

### Phase 10 — Offline Android build with local Android Studio (no EAS cloud)
- Use the locally installed Android Studio / Android SDK + Gradle on this PC.
- Steps:
  1. `npx expo prebuild --platform android --clean` with `EXPO_PUBLIC_OFFLINE_BUILD=1` to generate the native `android/` project.
  2. Open `android/` in Android Studio **or** build via CLI: from `android/`, run `gradlew.bat assembleRelease` (or `assembleDebug` for fast iteration) with `EXPO_PUBLIC_OFFLINE_BUILD=1`.
  3. Ensure release build **disables cleartext traffic**, uses the offline flag (no server calls), bundles the JS, and signs with a debug keystore (or a generated release keystore — document where it is, never commit secrets).
  4. Verify the APK boots in an emulator (AVD) or on a connected device, runs the in-app self-test, imports a real `.txt` and the DICOM file **with networking disabled**, and produces a report.
- Provide exact commands actually used and the resulting APK path. Update `docs/MOBILE_APP.md` / `APK_BUILD_GUIDE.md` accordingly.
- ✅ Gate: a working **offline APK** built locally + smoke-tested on real data with no network.

### Phase 11 — Technical note (`document.md`)
Write a comprehensive, publication-oriented `document.md` at repo root (the user will use it to draft a research paper / technical note). Include:
1. **Title, abstract, intended use & limitations** (research/decision-support).
2. **Introduction & clinical motivation** (radiobiological modeling at point of care for physicists/oncologists).
3. **App architecture** — Expo/RN, offline-first design, module map (parsers, engine, nomenclature, anonymizer, store, report), data-flow diagram (DVH/DICOM → bundle → metrics → TCP/NTCP/TW → report), on-device vs optional server.
4. **Radiobiological methods** — full equations and references for BED, EQD2, gEUD/EUD, TCP (Poisson, LKB, Poisson-DVH, Zaider–Minerbo), NTCP (LKB log-logit, LKB-probit with effective-volume reduction, Poisson), EQD2/fractionation handling, therapeutic window / UTCP / TWI. State every parameter source.
5. **DICOM & DVH ingestion** — Eclipse `.txt` format, DICOM RTDOSE embedded DVHSequence approach, TG-263 normalization, de-identification.
6. **Optional clinical-covariate layer** — design, validation status, why it's opt-in.
7. **Testing & validation** — unit tests, self-tests, clinical validation suite, tolerances, and the **real-data results** (summarize `REAL_DATA_REPORT.md`: 163 txt files, the DICOM patient, composite cases, TCP/NTCP/TWI tables, synthetic-fallback notes).
8. **Privacy & regulatory posture.**
9. **Build & deployment** (offline Android build).
10. **Limitations, future work** (multi-vendor DVH, grid-based DVH, prospective validation, cohort module).
11. **References** (numbered; QUANTEC, Niemierko, Lyman, Kutcher–Burman, Zaider–Minerbo, RTOG, TG-263, ICRU).
- Keep figures/tables reproducible from the test outputs. Use real numbers from Phase 9.
- ✅ Gate: `document.md` complete, internally consistent with test outputs, no PHI.

### Phase 12 — Deep repo cleanup
- Remove dead/duplicate code, unused screens, stale lockfiles (keep one package manager — npm; remove `pnpm-lock.yaml` if unused), build artifacts, `test-output/` large logs (keep the final reports), temporary/scratch files, and any committed secrets or local absolute paths.
- Ensure `.gitignore` covers `node_modules`, `android/`, `.expo`, `dist`, build outputs, keystores, `.env`.
- Consolidate docs; ensure README reflects the offline build + real-data validation. Run `tsc`, `lint`, `format`, and the full `test:ci` once more — all green.
- ✅ Gate: clean working tree builds, tests pass, no secrets/PHI/absolute-path leakage (`git grep` for `C:\\Users` etc.).

### Phase 13 — Git release: fresh v1.0.0, old work as pre-release
Target remote: `https://github.com/kalyan2031990/radiobiocalc_app`
1. Preserve history of prior work: tag the current `main` tip as a **pre-release** (e.g. `v0.9.0-pre`) and create a GitHub Release marked **"Pre-release"** pointing at it.
2. Merge `release/v1.0.0` into `main` (squash or merge — keep history sane). Bump app version to **1.0.0** everywhere (`app.config.ts` version + buildNumber/versionCode, `package.json`).
3. Commit with a clear message, push `main` + tags.
4. Create annotated tag `v1.0.0`, push it, and create a GitHub Release **"v1.0.0"** (latest) with release notes summarizing: offline DICOM+DVH, corrected models, TG-263, PHI de-id, encrypted local store, optional covariates, offline Android build, validation results.
5. Verify on GitHub that `v1.0.0` is "Latest" and the older one is "Pre-release", and CI passes on `main`.
- ✅ Gate: GitHub shows v1.0.0 latest, older release flagged pre-release, CI green.

---

## 4. Definition of Done (acceptance checklist)
- [ ] App works **fully offline** (airplane mode): import `.txt` + DICOM, compute, export report.
- [ ] On-device DICOM parser extracts the real patient's 13 structures correctly.
- [ ] Models corrected (EQD2/fractionation, LKB-probit reduction, parameterized clonogens) with cited parameters.
- [ ] TG-263 nomenclature mapping with user override; no silent default-to-HN.
- [ ] PHI de-identified on all imports; no PHI in logs/reports/storage; CI check enforces it.
- [ ] Encrypted local persistence works across restarts.
- [ ] Clinical-covariate layer is OFF by default, optional, tested both ways.
- [ ] Intended-use/disclaimer enforced and in reports.
- [ ] Unit + validation + self-tests all green via `npm run test:ci`.
- [ ] Real-data suite PASS; `test-output/REAL_DATA_REPORT.md` generated; synthetic fallbacks tagged.
- [ ] Offline APK built locally with Android Studio/Gradle and smoke-tested on real data.
- [ ] `document.md` technical note complete and consistent with results.
- [ ] Repo deeply cleaned; no secrets/PHI/absolute paths.
- [ ] GitHub: `v1.0.0` latest, prior work marked pre-release, CI green.

## 5. Working rules for Cursor
- Make **small, reviewable commits per phase**; never push until Phase 13.
- If a library doesn't work in RN/Hermes, choose another or write a minimal native implementation — **do not** silently fall back to a server.
- Prefer fixing root causes over masking; if you must approximate, **label it** in code comments, UI, and `document.md`.
- After each phase, print: what changed, files touched, test results, and the gate status.
- If blocked, state the blocker and the smallest unblocking decision needed — don't stall the whole run.
