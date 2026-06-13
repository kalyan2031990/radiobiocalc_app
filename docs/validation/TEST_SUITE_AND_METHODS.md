# Test suite and methods

See `02_TEST_SUITE_AND_METHODS.md` in Desktop package `rbGyanX_v1.0.0_validation_output` for the canonical copy.

## Quick reference

### CI (no device)

```bash
npm run test:ci
```

### Engine — 17 composite DVHs

```bash
npm run test:mobile-app-input
```

Method: `offlineParseDvh` → `offlineEvaluateComposite`; check TCP%, NTCP%, TWI%, TCI%, D95, parser Δ < 0.5 Gy.

### Single clinical + covariates + chart

```bash
npm run test:single-clinical-report
```

### Device smoke

```bash
npm run test:mobile-app-input-device
npm run test:mobile-clinical-device-smoke
```

### Full patient PDF export (PC + phone)

```bash
npm run test:mobile-clinical-batch-export
```

Method: `buildMobileAppReportInput` with clinical bundle → `buildAnalysisReport` → headless PDF → adb push.

### Report chart (v1.0.0)

One therapeutic-window plot: TCP + NTCP dose–response on shared dose axis (`lib/report-chart-svg.ts`).

### Clinical covariates

Default ON when xlsx/bundled clinical linked; log-odds adjustment via `lib/manuscript-covariates.ts`.
