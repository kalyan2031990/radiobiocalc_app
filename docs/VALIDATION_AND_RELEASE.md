# rbGyanX Mobile — Validation & Release Program

**Product:** Medical / scientific software for radiobiological plan evaluation (TCP, NTCP, DVH metrics).  
**Stack:** React Native (Expo) + TypeScript; offline on-device engine.  
**Current version:** **1.1.0** (build **18**) — see `app.config.ts`, `lib/app-meta.ts`  
**GitHub:** https://github.com/kalyan2031990/radiobiocalc_app (tag `v1.1.0-build18`)

**Positioning (pre-regulatory clearance):**

- Research support tool / plan evaluation assistant / educational radiobiology calculator  
- Not marketed as autonomous treatment-authorization software

---

## Validation status (2026-06-25, build 18)

| Gate | Result |
|------|--------|
| `npm run test:ci` | **95/95 PASS** |
| Engine 17 composite DVHs | **17/17 PASS** |
| Six-metric independent parity | Unchanged from build 17 |
| Clinical HTML export (17 cases) | **17/17 PASS** |

Full methods and PDF archive: see `docs/validation/` and local Desktop package `rbGyanX_v1.0.0_validation_output`.

---

## Test suite (automated)

| Tier | Command | Purpose |
|------|---------|---------|
| CI | `npm run test:ci` | Engine smoke, report, DVH parse, PHI check, vitest |
| Engine | `npm run test:mobile-app-input` | 17-case composite validation + device push |
| Single clinical | `npm run test:single-clinical-report` | RBX-TXT-001 + covariates + chart |
| Device smoke | `npm run test:mobile-app-input-device` | adb UI: import → parse → setup |
| Clinical batch | `npm run test:mobile-clinical-batch-export` | 17 PDFs → PC + phone |
| Clinical UI smoke | `npm run test:mobile-clinical-device-smoke` | RBX-TXT-001 end-to-end UI |

Details: `docs/validation/TEST_SUITE_AND_METHODS.md`

---

## Build & release

```bash
npm run build:android:release
npm run install:phone
```

Play Store path: internal testing → closed beta (experts) → production. See `docs/validation/RELEASE_READINESS.md`.

---

## Documentation map

| Document | Content |
|----------|---------|
| `docs/validation/MOBILE_APP_VALIDATION.md` | Summary index |
| `docs/validation/TEST_SUITE_AND_METHODS.md` | Methods |
| `docs/validation/MOBILE_APP_ENGINE_RESULTS.md` | 17-case table |
| `docs/validation/MOBILE_APP_DEVICE_SMOKE.md` | Smoke results |
| `docs/validation/CLINICAL_BATCH_EXPORT.md` | PDF batch log |
| `docs/validation/MOBILE_APP_TECHNICAL_SUMMARY.md` | Architecture |
| `docs/validation/RELEASE_READINESS.md` | Pilot → Play Store |
| `docs/MOBILE_USER_GUIDE.md` | End-user guide |
| `docs/LOCAL_ANDROID_BUILD.md` | APK build |
| `samples/README.md` | One bundled input + reference PDF |

---

## Beta testing (next)

**Android:** Play Console internal → closed testing (5–10 physicists, residents, dosimetrists).  
Collect: wrong outputs, UI issues, missing structures, feature requests.

---

## Regulatory / clinical risk

In-app and store listing must include intended use, version, model references, limitations, disclaimer.  
Exported reports include research/educational disclaimer.

---

## Security / privacy

- De-identify before import on mobile  
- Local processing; no cloud upload by default  
- Privacy policy required before production Play listing
