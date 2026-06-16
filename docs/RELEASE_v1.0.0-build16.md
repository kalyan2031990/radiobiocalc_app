# rbGyanX Mobile v1.0.0 — build 16 (offline)

**Release date:** 2026-06-14  
**Commit:** `586b223`  
**Package:** `com.rbgyanx.radiobiocalc`  
**versionCode:** 16

## Summary

Offline Android release with corrected radiobiology indices, full multi-model TCP/NTCP reporting, active clinical covariate display, prescription auto-fill from DVH headers, and validated on-device workflow (17/17 autonomous UI tests).

## Validation (build 16)

| Tier | Result |
|------|--------|
| CI / unit tests | 81/81 PASS |
| Engine (17 composite DVH) | 17/17 PASS |
| Clinical PDF export | 17/17 PASS |
| Autonomous device UI | 17/17 PASS |

## Key fixes since build 15

- **RTOG CI:** computed from BODY DVH only; N/A when BODY absent (cohort composites)
- **HI:** ICRU-83 homogeneity index + ratio (no longer mis-labelled TCI/100)
- **Prescription:** dose/fractions from DVH header (e.g. RBX-TXT-001: 66 Gy not 70 Gy default)
- **Models:** all TCP/NTCP models per structure in UI and PDF
- **Covariates:** NTCP base→adjusted labels when clinical xlsx linked
- **UI:** clinical xlsx import, visual user guide, restored credits

## Install

Download `rbGyanX_mobile_build16_offline.apk` from this release (or EAS artefact).  
Android 8+; enable “Install unknown apps” for the file manager used.

```bash
adb install -r rbGyanX_mobile_build16_offline.apk
```

**Note:** If upgrading from an APK signed with a different key, uninstall the previous build first.

## Reproduce validation

```bash
git checkout v1.0.0-build16
npm ci
npm run test:ci
npm run test:mobile-clinical-batch-export
npm run test:mobile-all-17-device   # requires USB device + adb
```

## Data package

Reviewer supplementary data: see `rbGyanX_mobile_paper/REVIEWER_DATA_PACKAGE_build16/` (Zenodo deposit pending).

## EAS build

- Build ID: `a341004c-f3c0-4b3c-9729-368bbf42a511`
- Profile: `offline` (`EXPO_PUBLIC_OFFLINE_BUILD=1`)

## Licence

See repository `LICENSE`.
