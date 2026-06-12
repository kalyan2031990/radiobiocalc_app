# Intended Use & Limitations — rbGyanX Mobile v1.0.0

## Intended use

rbGyanX Mobile is **research and educational decision-support software** for radiation oncology professionals. It assists with:

- Import and review of plan DVH data (Eclipse `.txt`, DICOM RTDOSE embedded DVH)
- On-device radiobiological metrics (BED, EQD2, EUD/gEUD, TCP, NTCP)
- Composite therapeutic window indices (UTCP, P+, TWI)
- Citation-linked explainability (rb X) for single-patient plans
- Optional PDF/DOCX report generation

## Not intended for

- Standalone treatment authorization or prescription
- Use as a cleared/registered medical device unless formally validated and registered in your jurisdiction
- Replacing qualified clinical judgment, peer review, or TPS verification

## Validation status

Numerical engines are validated against unit tests, published reference cases where available, and a real-data suite (`test-output/REAL_DATA_REPORT.md`). **Prospective clinical validation is ongoing.**

## Privacy

All processing is **on-device**. Patient identifiers are pseudonymized on import. No PHI is transmitted by default.

## Optional features

- **Clinical covariates:** documentation-only unless user enables "Adjust for clinical factors" and a validated coefficient set exists.
- **Export server:** optional LAN endpoint for PDF templates only; not required for calculations.

## User acknowledgement

First launch requires acceptance of the clinical disclaimer. Exported reports include the limitation footer.
