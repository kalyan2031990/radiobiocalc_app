# rbGyanX mobile — validation index

**Version:** 1.0.0 (build 15)  
**Date:** 2026-06-13  
**Repository:** https://github.com/kalyan2031990/radiobiocalc_app  
**Tag:** v1.0.0

## Summary

| Test | Result |
|------|--------|
| Engine (17 composite DVHs) | **17/17 PASS** |
| Clinical PDF batch export | **17/17 PASS** |
| Single clinical report (RBX-TXT-001) | **PASS** |
| Report chart (therapeutic-window dose–response) | **PASS** |
| Device import smoke | **PASS** |
| Clinical UI smoke (full calc results) | **FAIL** (timeout) |

## Documents in this folder

- `TEST_SUITE_AND_METHODS.md` — commands and pass criteria  
- `MOBILE_APP_ENGINE_RESULTS.md` — per-patient engine table  
- `MOBILE_APP_DEVICE_SMOKE.md` — adb smoke logs  
- `CLINICAL_BATCH_EXPORT.md` — 17 PDF export log  
- `MOBILE_APP_CLINICAL_ANALYSIS.md` — clinical xlsx coverage  
- `MOBILE_APP_INPUT_CASES.md` — case manifest  
- `MOBILE_APP_TECHNICAL_SUMMARY.md` — architecture  
- `RELEASE_READINESS.md` — pilot and Play Store plan  

Full PDF archive (17 files) is stored locally on Desktop: `rbGyanX_v1.0.0_validation_output/exported_pdfs_clinical/`.
