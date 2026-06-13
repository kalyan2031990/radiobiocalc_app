# Device smoke tests

## A. DVH import smoke — PASS (2026-06-13)

**Command:** `npm run test:mobile-app-input-device`  
**Duration:** ~41 s

```
PASS push_composite: RBX-TXT-001 → inbox + Downloads
PASS select_dvh: Selected RBX-TXT-001_composite_DVH.txt
PASS parse_composite: 2+ structures, Continue enabled
SKIP setup_screen: Reached setup
```

## B. Combined validation smoke — PASS

**Command:** `npm run test:mobile-app-input`  
Engine 17/17 + push all inputs + device smoke above.

## C. Clinical device UI smoke — PARTIAL FAIL (2026-06-13)

**Command:** `npm run test:mobile-clinical-device-smoke`  
**Patient:** RBX-TXT-001

| Step | Status |
|------|--------|
| adb_device | PASS |
| engine_eval (TCP 95%, NTCP 62.7%) | PASS |
| clinical_covariates | PASS |
| clinical_sections (3) | PASS |
| push_inputs (DVH + xlsx) | PASS |
| select_dvh / parse_composite / setup_screen | PASS |
| clinical_on_setup | SKIP |
| **calculation_results** | **FAIL** (UI timeout) |

Batch PDF export (engine-built) unaffected: 17/17 PASS.

## D. Single clinical report check — PASS

**Command:** `npm run test:single-clinical-report`  
Covariates applied; therapeutic-window chart embedded in HTML.
