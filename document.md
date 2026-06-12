# rbGyanX Mobile — Technical Note (v1.0.0)

## Abstract

rbGyanX Mobile is an offline-first React Native application for single-patient radiotherapy plan evaluation. It parses Varian Eclipse cumulative DVH exports and DICOM RTDOSE embedded DVH sequences on-device, computes BED/EQD2/EUD/gEUD/TCP/NTCP and composite therapeutic-window metrics, and provides citation-linked explainability (rb X). **Intended for research and educational decision support — not standalone treatment authorization.**

## Validation summary (real data)

| Dataset | Result |
|---------|--------|
| Eclipse `.txt` (radbiocalc_input) | **163/163** parse success |
| DICOM lung patient (RTDOSE+RTSTRUCT+RTPLAN) | **10** clinical structures, **30** fractions, target max **~62 Gy** |
| Composite TCP+NTCP+TWI | PASS |
| Clinical covariates OFF | Numbers unchanged (traceability-only) |
| PHI | De-identified on import (`lib/anonymize.ts`) |

Full report: `test-output/REAL_DATA_REPORT.md`

## Architecture

```
Import (.txt / DICOM) → anonymize → ParsedDvhBundle → setup (TG-263 nomenclature)
  → offline engine (TCP/NTCP/BED/EQD2) → results + rb X XAI → optional PDF/DOCX
```

Modules: `lib/eclipse-dvh-native.ts`, `lib/dicom-dvh-native.ts`, `lib/structure-nomenclature.ts`, `lib/offline-engine.ts`, `lib/rbgyanx-explain.ts`, `lib/patient-store.ts` (SQLite).

## Radiobiological methods

- **BED:** \(D(1 + d/(\alpha/\beta))\)
- **EQD2:** \(D \cdot ((\alpha/\beta + d)/(\alpha/\beta + 2))\)
- **Per-bin EQD2 for NTCP gEUD:** enabled by default when dose/fraction ≠ 2 Gy (`convertDvhToEqd2Scale`)
- **LKB log-logit NTCP:** Niemierko gEUD formulation
- **LKB probit NTCP:** Kutcher–Burman effective volume (`calculateEffectiveVolume`)
- **TCP Poisson:** clonogen count default `1e9` (documented, configurable)
- **Therapeutic window:** UTCP, P+, TWI (Lee / Brahme / Ågren)

Parameters: QUANTEC/RTOG literature tables in `server/parameters.ts`.

## DICOM ingestion

Embedded **DVHSequence (3004,0050)** from RTDOSE; ROI names from RTSTRUCT; fractions from RTPLAN. Skips Couch/BODY by default. No dose-grid recomputation required for validated test patient.

## Privacy

Pseudonymous patient IDs (FNV hash). No PHI in logs (CI: `npm run test:phi-check`). SQLite local case store.

## Build

```powershell
npm run build:android:release
npm run install:phone
npm run dev:desktop   # browser at http://localhost:8081
```

Offline release: cleartext HTTP disabled (`usesCleartextTraffic` pilot-only).

## Limitations

Single-patient scope; rule-based XAI (not PINN); optional clinical modifiers require validation before use; prospective clinical validation ongoing.

## References

1. Niemierko A. Med Phys. 1997 — gEUD/LKB.
2. Kutcher GJ, Burman C. IJROBP 1989 — effective volume.
3. QUANTEC (IJROBP 2010).
4. TG-263 (AAPM 2018) — structure nomenclature.
5. Lee et al. InTech 2015 — plan indices.

See `INTENDED_USE.md` for regulatory positioning.
