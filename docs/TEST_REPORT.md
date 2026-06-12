# rbGyanX — Complete Test Report

**Date:** 2026-06-07  
**Build:** v2.2.1 (build 14)  
**Test data:** `C:\Users\Sampa\OneDrive\Desktop\input_folders`  
**Overall:** **PASS**

---

## Executive summary

| Area | Result |
|------|--------|
| Offline engine (TCP/NTCP/BED) | PASS |
| DVH parse (Eclipse .txt, merge) | PASS |
| PDF/DOCX report export | PASS |
| rb X / XAI explainability | PASS (composite + single-structure) |
| Composite therapeutic window | PASS |
| Clinical scenarios (Kastoori, Motilal) | PASS (4/4) |
| Full rbgyanx_test_data walk | PASS (861/861 files) |
| BlueStacks | **Removed** — use desktop browser or USB phone |

---

## Automated commands

```powershell
cd C:\Users\Sampa\OneDrive\Desktop\radiobiocalc_app
npm run test:automation          # core suite (~15s)
npm run test:automation:full     # + full 861-file walk (~2 min)
npm run test:ci                  # unit tests + vitest
```

Reports written to:

- `test-output/FULL_AUTOMATION_REPORT.md`
- `test-output/FULL_AUTOMATION_REPORT.json`
- `test-output/rbgyanx_test_data_report.json` (full walk)

---

## Unit / integration steps

| Step | Status | Notes |
|------|--------|-------|
| `run_offline_engine_test.ts` | PASS | On-device engine smoke test |
| `run_dvh_parse_test.ts` | PASS | Kastoori + Motilal Eclipse files |
| `run_report_export_test.ts` | PASS | DOCX export bytes validated |
| `run_phase4_xai_test.ts` | PASS | Composite + single-structure XAI |
| `run_composite_plan_test.ts` | PASS | UTCP / composite evaluation |
| `run_therapeutic_window_all_sites.ts` | PASS | 7 cancer sites |

---

## Clinical scenarios (your input_folders)

| Scenario | Files | Structures | Therapeutic window | TCP | NTCP | TWI | XAI | Status |
|----------|-------|------------|-------------------|-----|------|-----|-----|--------|
| Kastoori PTV70 + COMB_PRTD | 2 | PTV70new, COMB_PRTD | Yes | 11.4% | 16.4% | 6.5% | 4 bullets | PASS |
| Motilal PTV + parotid + cord | 3 | PTV 66, COMB PRTD, Spinal Cord | Yes | 7.9% | 22.8% | 1.1% | 4 bullets | PASS |
| Kastoori PTV only | 1 | PTV70new | No | 0.0% | — | — | 4 bullets | PASS |
| Kastoori OAR only | 1 | COMB_PRTD | No | — | 16.4% | — | 3 bullets | PASS |

**Therapeutic window** requires importing **PTV + OAR together** (multi-select on desktop).

---

## Full dataset walk (rbgyanx_test_data)

- **Root:** `input_folders\rbgyanx_test_data`
- **DVH files:** 861
- **Calculated:** 861
- **Failed:** 0
- **Sample NTCP:** PT001_Parotid.csv → 24.8% (Parotid)
- **LKB reference:** 0.431195 (sanity check)

Total discoverable DVH under `input_folders` (all subfolders): **1441** files (automation scans; full walk uses rbgyanx_test_data subset).

---

## rb X (XAI) — rbGyanX naming

The **X** in rbGyanX = **explainable AI (XAI)** on mobile/desktop:

| Location | What you see |
|----------|----------------|
| **Results → rb X tab** | Citation-linked narrative for TCP/NTCP, LQ/BED, technique profile, limitations |
| **Therapeutic window screen** | Composite TCP/NTCP/TWI drivers + literature citations (after PTV+OAR import) |
| **Gyan tab** | Parameter provenance (QUANTEC/RTOG sources) |

Not PINN/ML on device — rule-based, transparent reasoning (appropriate for single-patient scope).

---

## Supported platforms

| Platform | How to run | Status |
|----------|------------|--------|
| **Desktop browser** | `npm run dev:desktop` → http://localhost:8081 | Working |
| **Android phone (USB)** | `npm run build:android:release` + `npm run install:phone` | Supported |
| **BlueStacks / emulators** | Removed from repo | Not supported (RN New Architecture) |

---

## Manual UI checklist (desktop)

1. Accept clinical disclaimer
2. **Import plan DVH** — multi-select KASTOORI_PTV70.txt + KASTOORI_COM_PRTD.txt
3. **Plan evaluation setup** — clinical context dropdowns, patient ID
4. **Run calculation** → check **rb X** tab
5. **Therapeutic Window** button → TWI chart + composite XAI
6. **Export** PDF/DOCX (optional export server)

---

## Changes in this pass

- Added **rb X XAI panel** on calculation results
- Restored **clinical context** + **therapeutic window** hints in offline setup
- Added **`npm run test:automation`** full pipeline
- **Removed all BlueStacks** scripts and npm commands
