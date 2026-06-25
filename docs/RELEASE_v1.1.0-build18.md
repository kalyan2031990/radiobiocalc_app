# rbGyanX Mobile v1.1.0 — build 18 (offline)

**Release date:** 2026-06-25  
**Tag:** `v1.1.0-build18`  
**Package:** `com.rbgyanx.radiobiocalc`  
**versionName:** 1.1.0 · **versionCode:** 18

## Summary

Feature release adding plan comparison, DVH visualisation, dose–response sweeps, a citation-linked parameter library, enhanced reports, and a BED/EQD₂ fractionation table — **without changing single-plan engine numerics** validated in build 17.

## Validation

| Tier | Result |
|------|--------|
| `npm run test:ci` | 95/95 PASS |
| Engine audit (17 composite DVH) | 17/17 PASS |
| Six-metric independent parity | Same as build 17 (mean \|Δ\|: D95 0.07 Gy, TCP 0.03 pp, NTCP 0.44 pp, UTCP 0.40 pp, P+ 0.14 pp, TWI 0.31 pp) |
| Clinical HTML reports | 17/17 PASS (F5 citation sections) |

Supplementary bundle: `supplementary_data_build18` (manuscript repo).

## New in v1.1.0

| ID | Feature |
|----|---------|
| F1 | Side-by-side plan A/B compare + export |
| F2 | DVH replot with gEUD marker; A/B overlay |
| F3 | Dose–response curves, CI bands (published CIs only), UTCP dose sweep |
| F4 | Offline parameter library with DOI/PMID |
| F5 | Parameters & references in all reports |
| F6 | BED/EQD₂ equivalence table + CSV/PDF export |

F7 (re-irradiation) deferred to v1.2.

## Install

Download `rbGyanX_mobile_v1.1.0_build18_offline.apk` from [Releases](https://github.com/kalyan2031990/radiobiocalc_app/releases).

```bash
adb install -r rbGyanX_mobile_v1.1.0_build18_offline.apk
```

Android 8+. If upgrading from an APK signed with a different key, uninstall the previous build first.

## Build from source

```bash
git checkout v1.1.0-build18
npm ci
cross-env EXPO_PUBLIC_OFFLINE_BUILD=1 npx expo prebuild --platform android
npm run build:android:release
```

## Changelog

See [CHANGELOG_v1.1.0.md](../CHANGELOG_v1.1.0.md).
