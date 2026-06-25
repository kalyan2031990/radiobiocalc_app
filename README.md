# rbGyanX Mobile

[![Release](https://img.shields.io/github/v/release/kalyan2031990/radiobiocalc_app?label=latest)](https://github.com/kalyan2031990/radiobiocalc_app/releases)
[![License](https://img.shields.io/badge/license-Academic-blue)](LICENSE)

**Offline radiobiology plan evaluation** for radiation oncology — composite DVH import, TCP/NTCP (multi-model), therapeutic-window metrics (UTCP, P+, TWI), citation-first PDF/DOCX reports, and v1.1.0 comparison & fractionation tools.

| | |
|---|---|
| **Current release** | **v1.1.0** (build 18) |
| **Package** | `com.rbgyanx.radiobiocalc` |
| **Stack** | Expo · React Native · TypeScript |
| **Engine** | On-device (no network required) |

> Research and educational decision-support only — not for autonomous treatment authorization.

---

## Features (v1.1.0)

- Single-plan composite evaluation (17-case validated cohort)
- **Plan A/B compare** with Δ metrics and DVH overlay
- DVH curves with **gEUD** marker; dose–response with published CI bands where available
- **Parameter library** (QUANTEC-oriented, citation-linked)
- **BED / EQD₂** fractionation-equivalence table (LQL optional)
- PDF / DOCX export with per-calculation references

See [CHANGELOG_v1.1.0.md](CHANGELOG_v1.1.0.md) and [docs/RELEASE_v1.1.0-build18.md](docs/RELEASE_v1.1.0-build18.md).

---

## Quick start

```bash
git clone https://github.com/kalyan2031990/radiobiocalc_app.git
cd radiobiocalc_app
npm install
npm run dev:mobile          # Expo dev client
```

**Offline APK (local):** [docs/LOCAL_ANDROID_BUILD.md](docs/LOCAL_ANDROID_BUILD.md)

```bash
cross-env EXPO_PUBLIC_OFFLINE_BUILD=1 npx expo prebuild --platform android
npm run build:android:release
```

---

## Validation

| Gate | Result (build 18) |
|------|-------------------|
| `npm run test:ci` | 95/95 PASS |
| Engine audit (17 composite DVHs) | 17/17 PASS |
| Independent six-metric parity | Unchanged from build 17 |

```bash
INPUT_FOLDERS=<path-to-composite-dvh-input> npx tsx scripts/audit_radiobiology_full.ts
```

Full program: [docs/VALIDATION_AND_RELEASE.md](docs/VALIDATION_AND_RELEASE.md)

---

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Expo Router screens |
| `lib/` | Offline engine wrapper, plan compare, parameter library, exports |
| `server/` | Radiobiology engine (shared with on-device path) |
| `scripts/` | Audit, validation, supplementary-data pipeline |
| `docs/` | User guide, validation, release notes |

---

## Branches & releases

We keep a **single active branch:** `main`. Releases are **tags** (`v1.1.0-build18`, `v1.0.1-build17`, …). Historical feature branches are removed after merge.

---

## Documentation

| Topic | File |
|-------|------|
| User guide | [docs/MOBILE_USER_GUIDE.md](docs/MOBILE_USER_GUIDE.md) |
| Validation | [docs/VALIDATION_AND_RELEASE.md](docs/VALIDATION_AND_RELEASE.md) |
| Latest release | [docs/RELEASE_v1.1.0-build18.md](docs/RELEASE_v1.1.0-build18.md) |
| Sample DVH | [samples/README.md](samples/README.md) |

---

## Citation & team

Copyright © rbGyanX Academic Team. Primary developer: K. Mondal (Medical Physicist), North Bengal Medical College, Darjeeling, India.
