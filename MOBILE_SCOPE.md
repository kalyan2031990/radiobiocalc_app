# rbGyanX Mobile — Product scope

**One patient · one plan · one evaluation session**

Mobile rbGyanX is not a copy of desktop rbGyanX. It supports bedside / MDT / corridor review of a **single treatment plan** for **one structure** (target or OAR).

## Included

| Layer | Metrics / tools |
|--------|------------------|
| **Physical (DVH)** | Mean, min, max dose; V5–V70; D1–D98; total volume |
| **Biological (DVH + fractionation)** | BED, EQD2, EUD, gEUD; TCP (target) or NTCP (OAR); **Zaider–Minerbo** TCP |
| **Sites** | Brain, H&N, Breast, Lung, Cervix, Rectum, Prostate + site OAR lists |
| **Techniques** | 3D-CRT, IMRT, VMAT, IGRT, SRT, SBRT (LQ validity flags) |
| **Parameters** | Literature defaults (QUANTEC-style tables) **or** manual override (TD50, γ50, n, m, α/β, etc.) |
| **Physical** | Dmean, Dmin, Dmax, D95, D2, V95, V100, Vxx, Dxx (target & OAR) |
| **Simple statistics** | DVH dose/volume descriptive stats for plan QA (not cohort ML) |

## Excluded (desktop rbGyanX)

- Multi-patient cohort / batch preprocessing  
- Full DICOM RT pipeline on phone  
- ML, SHAP, integration (P+/CFTC), research/advanced pipelines  
- Clinical Excel adapter at scale  

## Input paths (clinician-realistic)

1. **Import one DVH** — TPS export (.txt / .csv) via Files / Share  
2. **Manual DVH** — few dose/volume points or paste  
3. **Optional:** open case synced from desktop (future)

Patient ID and plan label are captured in setup for traceability only.

**Clinical data:** no Excel import. Optional on-device fields with **site- and organ-specific dropdowns** for both **TCP (target)** and **NTCP (OAR)** sessions — stored for MDT context, not fed into TCP/NTCP formulas.

## Workflow

```
Home → Import DVH / Manual → Plan & structure setup → Evaluate
         ↓
   Physical | Biological | Parameters | Plan statistics
```
