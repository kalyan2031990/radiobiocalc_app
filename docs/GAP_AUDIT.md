# Gap audit — desktop Python (py_ntcpx) vs rbGyanX mobile/TS

Many items reference **desktop** files (`code7_tcp_ntcp_integration.py`, `site_detector.py`, `poisson_tcp.py`) that are **not in this repository**. This document maps each gap to **this repo** and fix status.

## Clinical covariates (your Gap 1 — real product gap)

| Today (mobile) | py_ntcpx-style target |
|----------------|----------------------|
| Optional presets: age, sex, KPS, HPV, smoking, chemo, TNM, site-specific fields (`lib/clinical-fields-schema.ts`) | Multivariable regression adjusting TCP/NTCP for chemo, age, BMI, HPV, etc. |
| **Not used in** `performCalculation()` | Coefficients per site/endpoint, validated on cohort |

**Recommendation:** Keep presets; add opt-in **clinical modifier layer** (`lib/clinical-tcp-modifiers.ts`) that applies only when user enables “Adjust for clinical factors” and a validated model exists. Until then, UI must state presets are **traceability only** (already in `rbgyanx-explain` limitations).

---

## Gap-by-gap

| # | Desktop gap | In this repo? | Action |
|---|-------------|---------------|--------|
| 1 | MV clinical covariates | Presets only, not in formulas | Document + roadmap; add BMI preset; `clinicalModifierPlan()` |
| 2 | Dual UTCP (code7 vs engine) | **No code7** — single `lib/therapeutic-window.ts` | Add vitest product consistency test |
| 3 | Site fallback → HN | Default `cancerSite = "HN"` in composite setup | **Fixed:** `lib/infer-cancer-site.ts`, UNKNOWN if ambiguous |
| 4 | `filterwarnings('ignore')` | N/A (TypeScript) | N/A |
| 5 | V-metric on wrong DVH type | `performCalculation` uses `toDifferentialDVH` then metrics | **Fixed:** Vxx from differential bins |
| 6 | Dmean assumes vol sum = 1 | gEUD used `max(volume)` | **Fixed:** normalize by sum of differential bins |
| 7 | `iterrows()` slow | N/A | N/A (vectorized TS) |
| 8 | Incomplete SITE_REGISTRY | `server/sites-registry.ts` has 7 sites | OK for mobile; map explicit in routers |
| 9 | Duplicate NTCP paths | Single `server/radiobiology.ts` | N/A in this repo |
| 10 | Empty DVH → spurious NTCP | Returned gEUD=0 | **Fixed:** suppress TCP/NTCP when no DVH mass |
| 11 | Lung UTCP SBRT vs conv | Single OAR weight table | Document; site+technique OAR lists = future |
| 12 | QUANTEC missing organs | Prostate/rectum/bladder in `benchmark-comparison.ts` | Add liver/kidney benchmark rows |
| 13 | ZM approximation | `server/zaider-minerbo.ts` | **Fixed:** code comment on approximation |
| 14 | Multi-patient UTCP grouping | Mobile = single patient | N/A; desktop cohort only |

---

## Fix desktop Python gaps

Use the **desktop rbGyanX / py_ntcpx** repo for gaps 2, 4, 7, 9, 11, 14. This mobile repo shares **therapeutic window math** with `lib/therapeutic-window.ts` ported from `utcp.py` concepts.
