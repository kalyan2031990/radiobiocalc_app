# Clinical analysis — rbGyaX_mobile_app_input

## Coverage
- Composite patients: **17**
- With linked NTCP_OAR clinical rows: **14** (14 TXT; DCM uses DVH header + imputation)
- TCP_target rows: synthetic PTV clinical for TXT pilot IDs

## Dose consistency

| Patient | Header Rx (Gy) | Clinical dose (Gy) | Δ |
|---------|---------------:|-------------------:|--:|
| RBX-DCM-001 | — | 70 | 70.0 ⚠ |
| RBX-DCM-002 | — | 60 | 60.0 ⚠ |
| RBX-DCM-003 | — | 46 | 46.0 ⚠ |
| RBX-TXT-001 | 66 | 66 | 0.0 |
| RBX-TXT-002 | — | 70 | 70.0 ⚠ |
| RBX-TXT-003 | — | 72 | 72.0 ⚠ |
| RBX-TXT-004 | 50 | 50 | 0.0 |
| RBX-TXT-005 | 60 | 60 | 0.0 |
| RBX-TXT-006 | 70 | 70 | 0.0 |
| RBX-TXT-007 | 70 | 70 | 0.0 |
| RBX-TXT-008 | 70 | 70 | 0.0 |
| RBX-TXT-009 | 60 | 60 | 0.0 |
| RBX-TXT-010 | 66 | 66 | 0.0 |
| RBX-TXT-011 | 66 | 66 | 0.0 |
| RBX-TXT-012 | 70 | 70 | 0.0 |
| RBX-TXT-013 | — | 70 | 70.0 ⚠ |
| RBX-TXT-014 | — | 70 | 70.0 ⚠ |

## NTCP vs observed toxicity (Parotid, linked cases only)

Covariate adjustment is **ON** in mobile batch reports when clinical rows are linked (log-odds manuscript factors).

## Biological plausibility

- **RBX-DCM-001:** TCP 95%, NTCP 67%, TWI 45% — TCP in typical HN definitive range
- **RBX-DCM-002:** TCP 95%, NTCP 20%, TWI 76% — TCP in typical HN definitive range
- **RBX-DCM-003:** TCP 93%, NTCP 72%, TWI 68% — TCP in typical HN definitive range
- **RBX-TXT-001:** TCP 95%, NTCP 63%, TWI 35% — TCP in typical HN definitive range
- **RBX-TXT-002:** TCP 95%, NTCP 82%, TWI 70% — TCP in typical HN definitive range
- **RBX-TXT-003:** TCP 95%, NTCP 71%, TWI 74% — TCP in typical HN definitive range
- **RBX-TXT-004:** TCP 95%, NTCP 66%, TWI 42% — TCP in typical HN definitive range
- **RBX-TXT-005:** TCP 95%, NTCP 78%, TWI 28% — TCP in typical HN definitive range
- **RBX-TXT-006:** TCP 95%, NTCP 85%, TWI 23% — TCP in typical HN definitive range
- **RBX-TXT-007:** TCP 95%, NTCP 29%, TWI 86% — TCP in typical HN definitive range
- **RBX-TXT-008:** TCP 95%, NTCP 51%, TWI 80% — TCP in typical HN definitive range
- **RBX-TXT-009:** TCP 95%, NTCP 67%, TWI 30% — TCP in typical HN definitive range
- **RBX-TXT-010:** TCP 95%, NTCP 13%, TWI 91% — TCP in typical HN definitive range
- **RBX-TXT-011:** TCP 95%, NTCP 83%, TWI 40% — TCP in typical HN definitive range
- **RBX-TXT-012:** TCP 95%, NTCP 93%, TWI 26% — TCP in typical HN definitive range
- **RBX-TXT-013:** TCP 95%, NTCP 60%, TWI 77% — TCP in typical HN definitive range
- **RBX-TXT-014:** TCP 95%, NTCP 85%, TWI 16% — TCP in typical HN definitive range