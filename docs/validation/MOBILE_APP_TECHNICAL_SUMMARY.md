# Technical validation summary

## Parser
- rbGyanX composite format: multi-structure, Dose[Gy], Role TARGET/OAR
- Server, offline engine, and mobile native parser aligned (max-dose Δ < 0.5 Gy)

## Physical indices
- Target TCI, D95, BED₁₀ computed per case with prescription from clinical or DVH header

## Biological models
- Per-structure probes: LKB log-logistic, LKB probit, Poisson, Zaider–Minerbo, Poisson-LQ (DVH) where literature params exist
- Composite therapeutic window: TCP + NTCP + TWI

## Composite therapeutic window

TCP + composite NTCP + TWI per case (see engine results table).

## PDF report chart (v1.0.0)

Single therapeutic-window dose–response plot per composite report: TCP and limiting OAR NTCP sigmoids vs dose, Rx marker, shaded band where TCP > NTCP.

## Model probe counts

- RBX-DCM-001: 49 finite model outputs across 16 structures
- RBX-DCM-002: 36 finite model outputs across 10 structures
- RBX-DCM-003: 17 finite model outputs across 5 structures
- RBX-TXT-001: 17 finite model outputs across 4 structures
- RBX-TXT-002: 12 finite model outputs across 3 structures
- RBX-TXT-003: 7 finite model outputs across 3 structures
- RBX-TXT-004: 17 finite model outputs across 4 structures
- RBX-TXT-005: 17 finite model outputs across 4 structures
- RBX-TXT-006: 17 finite model outputs across 4 structures
- RBX-TXT-007: 12 finite model outputs across 3 structures
- RBX-TXT-008: 12 finite model outputs across 3 structures
- RBX-TXT-009: 17 finite model outputs across 4 structures
- RBX-TXT-010: 12 finite model outputs across 3 structures
- RBX-TXT-011: 17 finite model outputs across 4 structures
- RBX-TXT-012: 12 finite model outputs across 3 structures
- RBX-TXT-013: 7 finite model outputs across 2 structures
- RBX-TXT-014: 12 finite model outputs across 3 structures