# rbGyanX Mobile — Validation & Release Program

**Product type:** Medical / scientific software for radiobiological plan evaluation (TCP, NTCP, DVH metrics).  
**Stack:** React Native (Expo) + TypeScript + tRPC API; cross-check against desktop rbGyanX (Python).

**Current app version:** 2.0.0 (see `app.config.ts`, home screen badge).

**Positioning (pre-regulatory clearance):**

- ✅ Research support tool / plan evaluation assistant / educational radiobiology calculator  
- ❌ Not marketed as autonomous treatment-authorization software

---

## 1. Technical testing

### A. Functional testing

| Module | What to test |
|--------|----------------|
| DVH import | CSV/TXT, composite structures, corrupt/missing files |
| TCP models | Literature benchmark cases |
| NTCP models | vs published values / Python engine |
| EQD2/BED | vs spreadsheet / MATLAB / Python |
| DVH metrics | Vx, Dx, Dmean, Dmax consistency |
| Export | PDF/DOCX reports |
| UI | Invalid inputs, empty fields, navigation |

Maintain **20–50 benchmark cases** in `docs/BENCHMARK_CASES.md` with locked expected outputs.

### B. Numerical validation (priority)

- Hand checks for selected cases  
- Python/desktop rbGyanX cross-validation  
- Published paper benchmarks  
- Repeatability (same DVH → same output)  
- Optional: interobserver review of interpretation text (rb X)

Suggested metrics: MAE, relative difference (%), ICC, Bland–Altman.

### C. Clinical scenario testing

- Multiple sites (HN, lung, breast, brain, pelvis)  
- Conventional, hypofractionated, SBRT  
- Missing OARs, extreme doses  
- HDR brachytherapy: document scope (EBRT-first mobile)

### D. Device testing

- Small/large Android phones, tablets, low RAM  
- Android API levels per Play target SDK  
- iOS device sizes if building for App Store  
- Web (Expo) for development only unless explicitly supported

**Automated baseline today:** `npm run test:cycle`

---

## 2. Regulatory / clinical risk

In-app and store listing must include:

- Intended use (research/education unless certified)  
- Version number (shown on home + Product screen)  
- Equation/model references (Gyan tab, references screen)  
- Assumptions and limitations  
- Disclaimer (first launch modal + Product screen)  
- Audit logs (future): calculation timestamp, model version

---

## 3. Beta testing

**Android:** Play Console internal → closed testing (5–10 physicists, residents, dosimetrists, oncologists).  
**iOS:** TestFlight after Apple Developer enrollment.

Collect: wrong outputs, UI issues, missing structures, feature requests.

---

## 4. Android release (Google Play)

1. Developer account  
2. Signed `.aab` (`eas build` / `npm run build:android`)  
3. Store listing, screenshots, feature graphic  
4. Privacy policy URL  
5. Content rating  
6. Internal → closed → production rollout  

Console: https://play.google.com/console/

---

## 5. iOS release

Requires Mac or cloud Mac, signing, multi-size screenshots.

Archive → TestFlight → App Store review.

Program: https://developer.apple.com/programs/

---

## 6. Clinical documentation package

Prepare **Validation Report** (PDF) with:

1. Algorithms and equations  
2. Literature references  
3. Datasets (anonymised)  
4. Methodology  
5. Results (tables, Bland–Altman)  
6. Known limitations  
7. Version history  

Supports publications, ethics, hospital review.

---

## 7. Security / privacy (DICOM / PHI)

- De-identify before import on mobile  
- Prefer local processing; no cloud upload by default  
- Encrypt stored sessions (roadmap)  
- Privacy policy page before production

---

## 8. Publication angle

Example title: *Development and Validation of a Mobile Application for Radiobiological Plan Evaluation Using TCP, NTCP, and DVH-Based Metrics*

Include accuracy study, usability, comparison vs TPS/Python/desktop rbGyanX.

---

## Suggested timeline

| Week | Focus |
|------|--------|
| 1–2 | Numerical validation vs Python/desktop |
| 3 | Clinical benchmark matrix |
| 4 | Beta with physicists |
| 5 | Disclaimer + validation report draft |
| 6 | Android closed testing |
| 7–8 | Production release (if metrics pass) |

---

## Repository anchors

| Item | Path |
|------|------|
| App version | `app.config.ts`, `lib/app-meta.ts` |
| Feature roadmap (in-app) | `lib/feature-roadmap.ts` |
| Test cycle | `scripts/run_phase_cycle.ts` |
| Help (draft) | `docs/USER_HELP.md` |
| Benchmark registry | `docs/BENCHMARK_CASES.md` |
