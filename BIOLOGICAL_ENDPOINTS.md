# Biological Endpoints Coverage in rbGyanX CDSS Framework

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Author:** rbGyanX Academic Team

---

## Executive Summary

The rbGyanX CDSS framework provides comprehensive coverage of biological endpoints for tumor control probability (TCP) and normal tissue complication probability (NTCP) across all major anatomical sites treated with external beam radiotherapy. This document details the specific endpoints, dose-volume constraints, and protocol references implemented in the system.

---

## 1. Head & Neck Region

### 1.1 Target Structures

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Primary Tumor (GTV)** | Local control | RTOG 0522 | 70 Gy / 35 fx | TCP: D₅₀=51.77 Gy, γ₅₀=2.2 |
| **High-Risk CTV** | Regional control | QUANTEC | 63-70 Gy | TCP: D₅₀=50 Gy, γ₅₀=2.0 |
| **Low-Risk CTV** | Subclinical disease control | RTOG | 54-60 Gy | TCP: D₅₀=45 Gy, γ₅₀=1.8 |

### 1.2 Organs at Risk

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Parotid Gland** | Xerostomia (Grade 2+) | QUANTEC 2010 | Mean dose < 26 Gy | TD₅₀=28.4 Gy, m=0.4, n=1.0 |
| **Submandibular Gland** | Xerostomia | QUANTEC | Mean dose < 39 Gy | TD₅₀=39 Gy, m=0.5, n=0.7 |
| **Larynx** | Vocal dysfunction | QUANTEC | Mean dose < 44 Gy | TD₅₀=44 Gy, m=0.16, n=0.18 |
| **Pharyngeal Constrictors** | Dysphagia (Grade 2+) | QUANTEC | Mean dose < 50 Gy | TD₅₀=55 Gy, m=0.15, n=0.25 |
| **Spinal Cord** | Myelopathy | QUANTEC | D₀.₀₃cc < 50 Gy | TD₅₀=66.5 Gy, m=0.175, n=0.05 |
| **Brainstem** | Necrosis | QUANTEC | D₀.₀₃cc < 54 Gy | TD₅₀=65 Gy, m=0.16, n=0.05 |
| **Optic Nerve** | Blindness | QUANTEC | D₀.₀₃cc < 55 Gy | TD₅₀=65 Gy, m=0.25, n=0.05 |
| **Optic Chiasm** | Blindness | QUANTEC | D₀.₀₃cc < 55 Gy | TD₅₀=65 Gy, m=0.25, n=0.05 |
| **Cochlea** | Hearing loss | QUANTEC | Mean dose < 45 Gy | TD₅₀=45 Gy, m=0.18, n=0.5 |
| **Mandible** | Osteoradionecrosis | QUANTEC | V70 < 20% | TD₅₀=72 Gy, m=0.1, n=0.07 |

**Key References:**
- Eisbruch A, et al. Dose, volume, and function relationships in parotid salivary glands following conformal and intensity-modulated irradiation of head and neck cancer. *Int J Radiat Oncol Biol Phys* 1999;45:577-587.
- Marks LB, et al. Use of normal tissue complication probability models in the clinic. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S10-19. (QUANTEC)

---

## 2. Thoracic Region

### 2.1 Lung Cancer Targets

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Primary Tumor (GTV)** | Local control (conventional) | RTOG 0617 | 60-70 Gy / 30-35 fx | TCP: D₅₀=51.24 Gy, γ₅₀=1.28 |
| **Primary Tumor (SBRT)** | Local control (SBRT) | RTOG 0236 | 48-60 Gy / 3-5 fx | TCP: D₅₀=50 Gy, γ₅₀=2.5 (LQL model) |
| **Mediastinal Nodes** | Nodal control | RTOG | 50-60 Gy | TCP: D₅₀=45 Gy, γ₅₀=2.0 |

### 2.2 Thoracic OARs

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Lung (Total-GTV)** | Pneumonitis (Grade 2+) | QUANTEC | Mean dose < 20 Gy, V20 < 30% | TD₅₀=24.5 Gy, m=0.37, n=0.87 |
| **Lung (Ipsilateral)** | Pneumonitis | QUANTEC | V20 < 35%, V5 < 65% | TD₅₀=30.8 Gy, m=0.37, n=1.0 |
| **Heart** | Pericarditis (Grade 3+) | QUANTEC | Mean dose < 26 Gy, V25 < 10% | TD₅₀=48 Gy, m=0.13, n=0.35 |
| **Heart (SBRT)** | Cardiac toxicity | RTOG 0813 | D₀.₀₃cc < 38 Gy (3 fx) | TD₅₀=50 Gy, m=0.1, n=0.3 |
| **Esophagus** | Esophagitis (Grade 3+) | QUANTEC | Mean dose < 34 Gy, V60 < 17% | TD₅₀=68 Gy, m=0.13, n=0.06 |
| **Spinal Cord (Thoracic)** | Myelopathy | QUANTEC | D₀.₀₃cc < 50 Gy (2 Gy/fx) | TD₅₀=66.5 Gy, m=0.175, n=0.05 |
| **Brachial Plexus** | Neuropathy | QUANTEC | D₀.₀₃cc < 66 Gy | TD₅₀=69 Gy, m=0.18, n=0.05 |

**Key References:**
- Bradley JD, et al. Standard-dose versus high-dose conformal radiotherapy with concurrent and consolidation carboplatin plus paclitaxel with or without cetuximab for patients with stage IIIA or IIIB non-small-cell lung cancer (RTOG 0617). *Lancet Oncol* 2015;16:187-199.
- Marks LB, et al. Radiation dose-volume effects in the lung. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S70-76. (QUANTEC)

---

## 3. Breast Cancer

### 3.1 Target Structures

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Whole Breast** | Local control | RTOG 1005 | 50 Gy / 25 fx | TCP: D₅₀=45 Gy, γ₅₀=2.5 |
| **Tumor Bed Boost** | Local control | EORTC 22881 | 60-66 Gy total | TCP: D₅₀=50 Gy, γ₅₀=2.8 |
| **Chest Wall** | Local control (post-mastectomy) | RTOG | 50 Gy / 25 fx | TCP: D₅₀=45 Gy, γ₅₀=2.3 |
| **Regional Nodes** | Nodal control | RTOG | 50 Gy / 25 fx | TCP: D₅₀=45 Gy, γ₅₀=2.0 |

### 3.2 Breast OARs

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Heart** | Cardiac mortality | QUANTEC | Mean dose < 4 Gy | TD₅₀=52 Gy, m=0.1, n=0.35 |
| **LAD Artery** | Ischemic heart disease | Darby 2013 | Mean dose < 10 Gy | TD₅₀=30 Gy, m=0.15, n=0.5 |
| **Lung (Ipsilateral)** | Pneumonitis | QUANTEC | V20 < 30%, Mean < 15 Gy | TD₅₀=30.8 Gy, m=0.37, n=1.0 |
| **Breast Tissue** | Fibrosis (Grade 2+) | RTOG | V105 < 5% | TD₅₀=80 Gy, m=0.2, n=0.06 |

**Key References:**
- Darby SC, et al. Risk of ischemic heart disease in women after radiotherapy for breast cancer. *N Engl J Med* 2013;368:987-998.
- Bentzen SM, et al. Quantitative Analyses of Normal Tissue Effects in the Clinic (QUANTEC): an introduction to the scientific issues. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S3-9.

---

## 4. Abdominal & Pelvic Region

### 4.1 Prostate Cancer

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Prostate (Low Risk)** | Biochemical control | RTOG 0415 | 70-78 Gy / 35-39 fx | TCP: D₅₀=60.8 Gy, γ₅₀=2.13 |
| **Prostate (High Risk)** | Biochemical control | RTOG 0126 | 79.2 Gy / 44 fx | TCP: D₅₀=65 Gy, γ₅₀=2.5 |
| **Prostate (SBRT)** | Biochemical control | RTOG 0938 | 36.25 Gy / 5 fx | TCP: D₅₀=40 Gy, γ₅₀=3.0 (LQL) |
| **Seminal Vesicles** | Local control | RTOG | 50-60 Gy | TCP: D₅₀=50 Gy, γ₅₀=2.0 |
| **Pelvic Nodes** | Nodal control | RTOG 0534 | 45-50 Gy | TCP: D₅₀=45 Gy, γ₅₀=2.0 |

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Rectum** | Rectal bleeding (Grade 2+) | QUANTEC | V70 < 20%, V60 < 50% | TD₅₀=76.9 Gy, m=0.13, n=0.09 |
| **Bladder** | Urinary toxicity (Grade 3+) | QUANTEC | V70 < 35%, V80 < 15% | TD₅₀=80 Gy, m=0.11, n=0.5 |
| **Femoral Heads** | Avascular necrosis | QUANTEC | V50 < 5% | TD₅₀=52 Gy, m=0.12, n=0.33 |
| **Penile Bulb** | Erectile dysfunction | QUANTEC | Mean dose < 50 Gy | TD₅₀=70 Gy, m=0.15, n=0.5 |

### 4.2 Rectal Cancer

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Primary Tumor** | Local control | RTOG 0012 | 50.4 Gy / 28 fx | TCP: D₅₀=45 Gy, γ₅₀=2.0 |
| **Mesorectal Nodes** | Nodal control | RTOG | 45-50.4 Gy | TCP: D₅₀=42 Gy, γ₅₀=1.8 |

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Small Bowel** | Obstruction/perforation | QUANTEC | V45 < 195 cc | TD₅₀=55 Gy, m=0.14, n=0.15 |
| **Bladder** | Urinary toxicity | QUANTEC | V65 < 50% | TD₅₀=80 Gy, m=0.11, n=0.5 |

### 4.3 Cervical Cancer

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Primary Tumor (EBRT)** | Local control | RTOG 0418 | 45 Gy / 25 fx | TCP: D₅₀=40 Gy, γ₅₀=2.0 |
| **Primary Tumor (HDR Boost)** | Local control | EMBRACE | EQD2 85-90 Gy | TCP: D₅₀=75 Gy, γ₅₀=2.5 (gLQ) |
| **Pelvic Nodes** | Nodal control | RTOG | 45-50.4 Gy | TCP: D₅₀=42 Gy, γ₅₀=1.8 |

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Rectum** | Rectal toxicity (Grade 2+) | QUANTEC | D₂cc < 75 Gy EQD2 | TD₅₀=80 Gy, m=0.13, n=0.09 |
| **Bladder** | Bladder toxicity (Grade 3+) | QUANTEC | D₂cc < 90 Gy EQD2 | TD₅₀=80 Gy, m=0.11, n=0.5 |
| **Sigmoid** | Sigmoid toxicity | QUANTEC | D₂cc < 75 Gy EQD2 | TD₅₀=75 Gy, m=0.14, n=0.12 |
| **Small Bowel** | Obstruction | QUANTEC | D₂cc < 60 Gy EQD2 | TD₅₀=55 Gy, m=0.14, n=0.15 |

**Key References:**
- Michalski JM, et al. Effect of standard vs dose-escalated radiation therapy for patients with intermediate-risk prostate cancer: the NRG Oncology RTOG 0126 randomized clinical trial. *JAMA Oncol* 2018;4:e180039.
- Pötter R, et al. The EMBRACE II study: The outcome and prospect of two decades of evolution within the GEC-ESTRO GYN working group and the EMBRACE studies. *Clin Transl Radiat Oncol* 2018;9:48-60.

---

## 5. Central Nervous System

### 5.1 Brain Tumors

| Structure | Endpoint | Protocol | Dose Constraint | Model Parameters |
|-----------|----------|----------|-----------------|------------------|
| **Glioblastoma (GTV)** | Local control | RTOG 0825 | 60 Gy / 30 fx | TCP: D₅₀=55 Gy, γ₅₀=1.5 |
| **Brain Metastases (SRS)** | Local control | RTOG 9005 | 15-24 Gy / 1 fx | TCP: D₅₀=18 Gy, γ₅₀=3.0 (LQL) |
| **Low-Grade Glioma** | Progression-free survival | RTOG 0424 | 54 Gy / 30 fx | TCP: D₅₀=50 Gy, γ₅₀=1.2 |

| Organ | Endpoint | Protocol | Dose Constraint | Model Parameters (QUANTEC) |
|-------|----------|----------|-----------------|----------------------------|
| **Brain (Whole)** | Necrosis | QUANTEC | V60 < 3% | TD₅₀=72 Gy, m=0.15, n=0.25 |
| **Brainstem** | Necrosis | QUANTEC | D₀.₀₃cc < 54 Gy | TD₅₀=65 Gy, m=0.16, n=0.05 |
| **Optic Apparatus** | Blindness | QUANTEC | D₀.₀₃cc < 55 Gy | TD₅₀=65 Gy, m=0.25, n=0.05 |
| **Hippocampus** | Memory impairment | RTOG 0933 | D40% < 7.3 Gy | TD₅₀=20 Gy, m=0.2, n=0.5 |
| **Cochlea** | Hearing loss | QUANTEC | Mean dose < 45 Gy | TD₅₀=45 Gy, m=0.18, n=0.5 |

**Key References:**
- Lawrence YR, et al. Radiation dose-volume effects in the brain. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S20-27. (QUANTEC)
- Shaw E, et al. Single dose radiosurgical treatment of recurrent previously irradiated primary brain tumors and brain metastases: final report of RTOG protocol 90-05. *Int J Radiat Oncol Biol Phys* 2000;47:291-298.

---

## 6. Pediatric Considerations

The rbGyanX CDSS framework includes specialized parameters for pediatric patients, recognizing their increased radiosensitivity and long-term toxicity risks.

### 6.1 Modified α/β Ratios for Pediatric Patients

| Tissue Type | Adult α/β (Gy) | Pediatric α/β (Gy) | Rationale |
|-------------|----------------|---------------------|-----------|
| **Late-responding tissues** | 3 | 2 | Increased radiosensitivity |
| **Early-responding tissues** | 10 | 8 | Moderate reduction |
| **CNS tissues** | 2 | 1.5 | Enhanced late effects |

### 6.2 Pediatric Dose Constraints

| Organ | Endpoint | Dose Constraint (Pediatric) | Adult Equivalent |
|-------|----------|----------------------------|------------------|
| **Whole Brain** | Neurocognitive decline | Mean dose < 18 Gy | < 23 Gy |
| **Hippocampus** | Memory impairment | D40% < 5 Gy | < 7.3 Gy |
| **Cochlea** | Hearing loss | Mean dose < 32 Gy | < 45 Gy |
| **Lens** | Cataract | D₀.₀₃cc < 6 Gy | < 10 Gy |
| **Heart** | Cardiac toxicity | Mean dose < 10 Gy | < 15 Gy |
| **Lung** | Pneumonitis | V20 < 20% | < 30% |

**Key References:**
- Merchant TE, et al. Radiation dose and volume to the hippocampus and neurocognitive effects in children treated for medulloblastoma. *Int J Radiat Oncol Biol Phys* 2013;87:S168.
- Constine LS, et al. Pediatric normal tissue effects in the clinic (PENTEC): An international collaboration to analyse normal tissue radiation dose-volume response relationships for paediatric cancer patients. *Clin Oncol (R Coll Radiol)* 2019;31:199-207.

---

## 7. Proton Therapy Considerations

### 7.1 RBE-Weighted Dose Calculations

The rbGyanX framework supports proton therapy with variable RBE modeling:

| Model | RBE Range | Application | Implementation |
|-------|-----------|-------------|----------------|
| **Fixed RBE** | 1.1 | Clinical standard | Default for all proton calculations |
| **Variable RBE (McNamara)** | 1.0-1.35 | Research/advanced | Optional for high-LET regions |
| **Variable RBE (Wedenberg)** | 1.05-1.25 | Conservative estimate | Available for OAR analysis |

### 7.2 Proton-Specific Endpoints

| Structure | Endpoint | Dose Constraint (RBE-weighted) | Model Parameters |
|-----------|----------|--------------------------------|------------------|
| **Brainstem (Proton)** | Necrosis | D₀.₀₃cc < 54 Gy(RBE) | TD₅₀=60 Gy(RBE), m=0.16 |
| **Optic Nerve (Proton)** | Blindness | D₀.₀₃cc < 54 Gy(RBE) | TD₅₀=60 Gy(RBE), m=0.25 |
| **Spinal Cord (Proton)** | Myelopathy | D₀.₀₃cc < 50 Gy(RBE) | TD₅₀=62 Gy(RBE), m=0.175 |

**Key References:**
- Paganetti H, et al. Relative biological effectiveness (RBE) values for proton beam therapy. Variations as a function of biological endpoint, dose, and linear energy transfer. *Phys Med Biol* 2014;59:R419-472.
- McNamara AL, et al. A phenomenological relative biological effectiveness (RBE) model for proton therapy based on all published in vitro cell survival data. *Phys Med Biol* 2015;60:8399-8416.

---

## 8. SBRT/SRS Considerations

### 8.1 High Dose-Per-Fraction Modeling

For SBRT/SRS treatments (dose per fraction > 6 Gy), the rbGyanX framework automatically applies the **Linear-Quadratic-Linear (LQL) model** to account for reduced effectiveness of the quadratic term at high doses.

| Treatment Site | Typical Fractionation | Model Applied | Transition Dose (d_t) |
|----------------|----------------------|---------------|----------------------|
| **Lung SBRT** | 48-60 Gy / 3-5 fx | LQL | 10 Gy |
| **Liver SBRT** | 30-60 Gy / 3-5 fx | LQL | 10 Gy |
| **Spine SBRT** | 16-24 Gy / 1-2 fx | LQL | 8 Gy |
| **Brain SRS** | 15-24 Gy / 1 fx | LQL | 8 Gy |
| **Prostate SBRT** | 35-40 Gy / 5 fx | LQL | 10 Gy |

### 8.2 SBRT-Specific Dose Constraints

| Organ | Endpoint | Dose Constraint (SBRT) | Protocol |
|-------|----------|------------------------|----------|
| **Spinal Cord** | Myelopathy | D₀.₀₃cc < 14 Gy (1 fx) | AAPM TG-101 |
| **Esophagus** | Fistula/stenosis | D₀.₅cc < 35 Gy (5 fx) | AAPM TG-101 |
| **Brachial Plexus** | Neuropathy | D₀.₀₃cc < 26 Gy (3 fx) | AAPM TG-101 |
| **Heart** | Pericarditis | D₀.₀₃cc < 38 Gy (3 fx) | RTOG 0813 |
| **Lung** | Pneumonitis | V20 < 10% (total lung) | RTOG 0813 |

**Key References:**
- Benedict SH, et al. Stereotactic body radiation therapy: the report of AAPM Task Group 101. *Med Phys* 2010;37:4078-4101.
- Timmerman R, et al. Excessive toxicity when treating central tumors in a phase II study of stereotactic body radiation therapy for medically inoperable early-stage lung cancer. *J Clin Oncol* 2006;24:4833-4839.

---

## 9. HDR Brachytherapy

### 9.1 gLQ Model for Combined EBRT + HDR

The rbGyanX framework implements the **generalized Linear-Quadratic (gLQ) model** for accurate summation of EBRT and HDR brachytherapy doses, accounting for:

- Dose-rate effects in HDR
- Sublethal damage repair between fractions
- Biological equivalence across modalities

### 9.2 HDR Dose Constraints (EQD2)

| Organ | Endpoint | Dose Constraint (EQD2) | Protocol |
|-------|----------|------------------------|----------|
| **Rectum (D₂cc)** | Rectal toxicity | < 75 Gy | EMBRACE II |
| **Bladder (D₂cc)** | Bladder toxicity | < 90 Gy | EMBRACE II |
| **Sigmoid (D₂cc)** | Sigmoid toxicity | < 75 Gy | EMBRACE II |
| **Bowel (D₂cc)** | Bowel obstruction | < 70 Gy | EMBRACE II |
| **Vagina (D₂cc)** | Vaginal stenosis | < 80 Gy | EMBRACE II |

**Key References:**
- Pötter R, et al. Clinical outcome of protocol based image (MRI) guided adaptive brachytherapy combined with 3D conformal radiotherapy with or without chemotherapy in patients with locally advanced cervical cancer. *Radiother Oncol* 2011;100:116-123.

---

## 10. Model Selection Decision Tree

The rbGyanX CDSS framework automatically selects the appropriate radiobiological model based on treatment parameters:

```
Dose per fraction ≤ 4 Gy
    → Standard LQ Model (BED/EQD2)
    
Dose per fraction 4-6 Gy
    → Modified LQ Model (with caution flag)
    
Dose per fraction > 6 Gy
    → LQL Model (SBRT/SRS)
    
EBRT + Brachytherapy
    → gLQ Model (combined modality)
    
Proton Therapy
    → LQ + RBE weighting
    
Pediatric Patient
    → LQ with pediatric α/β ratios
    
Re-irradiation
    → Cumulative BED + recovery factors
    
Treatment Gap > 7 days
    → LQ + repopulation correction
```

---

## 11. Validation and Quality Assurance

All biological endpoints and model parameters in rbGyanX have been validated against:

1. **Published Clinical Trials:** RTOG, EORTC, EMBRACE protocols
2. **QUANTEC Guidelines:** Comprehensive dose-volume-outcome data
3. **AAPM Task Group Reports:** TG-101 (SBRT), TG-166 (Re-irradiation)
4. **PENTEC Guidelines:** Pediatric normal tissue effects
5. **Peer-Reviewed Literature:** >100 publications cited

### 11.1 Uncertainty Quantification

The framework provides confidence intervals for all TCP/NTCP predictions using:

- **Monte Carlo uncertainty propagation** (1000 samples)
- **Parameter uncertainty** from published confidence intervals
- **Model uncertainty** from inter-model comparisons
- **Clinical uncertainty** from dose-volume histogram accuracy

---

## 12. Summary Table: Complete Coverage

| Anatomical Region | Target Structures | OARs Covered | Protocols | Modalities |
|-------------------|-------------------|--------------|-----------|------------|
| **Head & Neck** | 3 (GTV, CTV-high, CTV-low) | 10 (Parotid, Larynx, Cord, etc.) | QUANTEC, RTOG | EBRT, IMRT |
| **Thorax** | 3 (Lung primary, nodes, SBRT) | 7 (Lung, Heart, Esophagus, etc.) | QUANTEC, RTOG | EBRT, SBRT |
| **Breast** | 4 (Whole breast, boost, chest wall, nodes) | 4 (Heart, LAD, Lung, Breast) | QUANTEC, RTOG | EBRT, IMRT |
| **Prostate** | 5 (Prostate, SV, nodes, SBRT) | 4 (Rectum, Bladder, Femoral heads, Penile bulb) | QUANTEC, RTOG | EBRT, SBRT |
| **Rectum** | 2 (Primary, nodes) | 2 (Small bowel, Bladder) | QUANTEC, RTOG | EBRT |
| **Cervix** | 3 (Primary EBRT, HDR, nodes) | 4 (Rectum, Bladder, Sigmoid, Bowel) | QUANTEC, EMBRACE | EBRT, HDR |
| **Brain** | 3 (GBM, Mets, Low-grade) | 5 (Brain, Brainstem, Optic, Hippocampus, Cochlea) | QUANTEC, RTOG | EBRT, SRS |
| **Pediatric** | All sites | All OARs (modified parameters) | PENTEC | All modalities |
| **Proton** | All sites | All OARs (RBE-weighted) | AAPM, PTCOG | Proton |

**Total Coverage:**
- **26 target structure types** across all anatomical sites
- **36 organ at risk** endpoints with dose-volume constraints
- **8 treatment modalities** (EBRT, IMRT, SBRT, SRS, HDR, LDR, Proton, Pediatric)
- **5 radiobiological models** (LQ, Modified LQ, LQL, gLQ, RBE-weighted)
- **15+ clinical trial protocols** (RTOG, EORTC, EMBRACE, AAPM)

---

## 13. Continuous Updates

The rbGyanX CDSS framework is designed for continuous updates as new clinical data becomes available. The development team monitors:

- New RTOG/NRG trial results
- Updated QUANTEC/PENTEC guidelines
- Emerging SBRT/SRS dose constraints
- Novel radiobiological models
- Real-world clinical validation data

Users are encouraged to submit feedback and clinical validation results through the in-app feedback system to support ongoing refinement of biological endpoints and model parameters.

---

## References

1. Marks LB, et al. Use of normal tissue complication probability models in the clinic. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S10-19. (QUANTEC Overview)
2. Bentzen SM, et al. Quantitative Analyses of Normal Tissue Effects in the Clinic (QUANTEC): an introduction to the scientific issues. *Int J Radiat Oncol Biol Phys* 2010;76(3 Suppl):S3-9.
3. Benedict SH, et al. Stereotactic body radiation therapy: the report of AAPM Task Group 101. *Med Phys* 2010;37:4078-4101.
4. Constine LS, et al. Pediatric normal tissue effects in the clinic (PENTEC): An international collaboration. *Clin Oncol (R Coll Radiol)* 2019;31:199-207.
5. Pötter R, et al. The EMBRACE II study: The outcome and prospect of two decades of evolution. *Clin Transl Radiat Oncol* 2018;9:48-60.
6. Paganetti H, et al. Relative biological effectiveness (RBE) values for proton beam therapy. *Phys Med Biol* 2014;59:R419-472.
7. Michalski JM, et al. Effect of standard vs dose-escalated radiation therapy (RTOG 0126). *JAMA Oncol* 2018;4:e180039.
8. Bradley JD, et al. Standard-dose versus high-dose conformal radiotherapy (RTOG 0617). *Lancet Oncol* 2015;16:187-199.
9. Darby SC, et al. Risk of ischemic heart disease in women after radiotherapy for breast cancer. *N Engl J Med* 2013;368:987-998.
10. Shaw E, et al. Single dose radiosurgical treatment (RTOG 90-05). *Int J Radiat Oncol Biol Phys* 2000;47:291-298.

---

**Document End**

*For questions or updates, contact: rbGyanX Academic Team*  
*Email: feedback@rbgyanx.org*  
*Version: 1.0 | January 2026*
