# Desktop (project_rbGyanx) vs mobile — feasibility

Source: `C:\Users\Sampa\OneDrive\Desktop\project_rbGyanx` (Python engine + ADVANCED stack).

## Already on mobile

- Offline DVH → TCP/NTCP/UTCP/TWI (LKB, Poisson, Zaider)
- Composite multi-structure plans
- Seven cancer sites + plan indices (TCI, CI, …)
- Clinical presets in reports (not in formulas)
- **PDF/DOCX on device** (no export server)
- rbGyanX explain (rule-based, not SHAP)

## Partial — good next steps

| Desktop feature | Mobile status |
|-----------------|---------------|
| QUANTEC pass/fail flags | Metrics only; add checklist (Phase 2) |
| Two-plan ΔNTCP/ΔTCP | `comparative-analysis` is mock — wire to offline engine |
| DICOM → DVH | Planned; desktop is reference |
| Validation vs desktop engine | Use `RBGYANX_TEST_DATA` + CI |

## Not planned on phone

- Cohort ML, SHAP, PINN, Bayesian NTCP, dosiomics
- Full ADVANCED `engine_advanced_f` stack

## Top 3 recommendations

1. Lock benchmark cases vs desktop `engine/tests/`
2. Real two-plan delta UI using `offlineEvaluateComposite`
3. QUANTEC constraint checklist on results screen
