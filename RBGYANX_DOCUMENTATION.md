# rbGyanX: genius evolved
## Comprehensive Radiobiology & Dosimetry Calculation Platform

**Version:** 2.0.0  
**Primary Developer:** K. Mondal (Medical Physicist)  
**Institution:** North Bengal Medical College, Darjeeling, India  
**Copyright:** © rbGyanX Academic Team

---

## Executive Summary

**rbGyanX** (genius evolved) is a state-of-the-art mobile and web application designed for comprehensive radiobiology and dosimetry calculations in radiation oncology. The platform integrates traditional radiobiological models with advanced computational methods to provide clinicians and medical physicists with instant, evidence-based treatment plan evaluation tools. Built on QUANTEC and RTOG guidelines, rbGyanX supports all contemporary external beam photon radiotherapy modalities, including conventional EBRT, SBRT, SRS, HDR brachytherapy, proton therapy, and pediatric treatments.

---

## Software Workflow

The rbGyanX workflow is designed to guide users from data input through calculation to clinical decision-making in a seamless, intuitive process.

### 1. Data Input Phase

Users can input dose-volume histogram (DVH) data through three primary methods:

**Method A: DICOM-RT Import**  
The application accepts DICOM-RT Dose and Structure Set files directly from treatment planning systems (TPS). The backend pydicom parser automatically extracts DVH data for all delineated structures, including targets (PTV, GTV, CTV) and organs at risk (OARs). This method ensures maximum accuracy by eliminating manual data entry errors.

**Method B: DVH File Upload**  
For systems that export DVH data in tabular format, rbGyanX accepts CSV or TXT files containing differential or cumulative DVH data. The intelligent parser automatically detects the DVH format, validates data integrity, and converts differential DVH to cumulative format when necessary. This method is particularly useful for legacy systems or when DICOM export is unavailable.

**Method C: Manual Entry**  
For quick calculations or when full DVH data is unavailable, users can manually enter key dose metrics (mean dose, maximum dose, Vxx, Dxx) along with fractionation parameters. This method is ideal for rapid treatment plan comparison or educational purposes.

### 2. Treatment Characterization Phase

Once data is loaded, rbGyanX automatically characterizes the treatment based on multiple parameters:

**Modality Detection**  
The system analyzes dose-per-fraction, total dose, and fractionation scheme to automatically detect the treatment modality (EBRT, SBRT, SRS, HDR brachytherapy, proton therapy, or pediatric treatment). This detection triggers modality-specific parameter selection and model recommendations.

**Model Selection**  
Based on the detected modality and dose-per-fraction, rbGyanX employs an intelligent clinical decision tree to recommend the most appropriate radiobiological model:

- **Dose per fraction ≤ 4 Gy:** Linear-Quadratic (LQ) model with standard BED/EQD2 calculations
- **Dose per fraction 4-6 Gy:** Modified LQ model with cautionary warnings
- **Dose per fraction > 6 Gy:** Linear-Quadratic-Linear (LQL) model for accurate high-dose modeling
- **SBRT/SRS/HDR:** Automatic LQL or generalized LQ (gLQ) model selection
- **Treatment gaps:** LQ model with repopulation correction
- **Re-irradiation:** Cumulative BED calculation with recovery factors
- **Proton therapy:** LQ model with RBE adjustment
- **Pediatric cases:** Age-appropriate α/β parameters with conservative modeling

Users retain the ability to manually override automatic model selection for research or exploratory purposes.

### 3. Calculation Phase

The calculation engine processes DVH data through multiple radiobiological models simultaneously:

**Dose Conversion**  
Physical dose distributions are converted to biologically effective dose (BED) and equivalent dose in 2 Gy fractions (EQD2) using organ-specific α/β ratios from QUANTEC guidelines. For fractionation-aware calculations, the system accounts for dose-per-fraction effects on both tumor control and normal tissue complications.

**TCP Calculation**  
Tumor Control Probability is calculated using three complementary models:

- **Poisson TCP Model:** Based on the assumption of Poisson-distributed clonogenic cell survival, this model calculates TCP from mean tumor dose, α/β ratio, and clonogenic cell density
- **LKB-based TCP Model:** Adapted from the Lyman-Kutcher-Burman NTCP formalism, this model uses generalized Equivalent Uniform Dose (gEUD) with tumor-specific parameters
- **Monte Carlo TCP:** For uncertainty quantification, a simplified Monte Carlo simulation propagates parameter uncertainties through the TCP calculation

**NTCP Calculation**  
Normal Tissue Complication Probability is calculated using three validated models:

- **LKB Log-Logistic Model:** The standard Lyman-Kutcher-Burman model with log-logistic dose-response, using organ-specific TD50, m, and n parameters from QUANTEC
- **LKB Probit Model:** An alternative formulation using probit (cumulative normal) dose-response, providing slightly different sensitivity to dose variations
- **Poisson NTCP Model:** Based on functional subunit architecture, particularly suitable for parallel organs (lung, liver, kidney)

**Dose Metrics**  
The system automatically extracts comprehensive dose metrics from DVH data:

- **Vxx:** Volume receiving at least xx Gy (e.g., V20Gy for lung)
- **Dxx:** Minimum dose to the hottest xx% of the volume (e.g., D95% for PTV)
- **Mean dose:** Volume-weighted average dose
- **Maximum dose:** Highest dose in the structure
- **gEUD:** Generalized Equivalent Uniform Dose with organ-specific a parameter

### 4. Analysis & Visualization Phase

Calculation results are presented through multiple interactive visualizations:

**Results Dashboard**  
The primary results screen displays TCP and NTCP values with confidence intervals, dose metrics organized by clinical relevance, and BED/EQD2 conversions for all structures. Color-coded risk indicators (green for acceptable, yellow for borderline, red for concerning) provide instant clinical feedback.

**Dose-Response Curves**  
Sigmoid dose-response curves visualize the probability of tumor control or normal tissue complication as a function of dose. The user's treatment plan is marked on the curve, showing the current TCP/NTCP and the dose required to achieve specific probability thresholds (e.g., TCP50, TCP90).

**Therapeutic Window Visualization**  
A scatter plot displays TCP versus NTCP for the current treatment plan, with reference regions indicating optimal (high TCP, low NTCP), acceptable, and concerning zones. Multiple fractionation schemes can be compared simultaneously to identify the optimal therapeutic window.

**Benchmark Comparison**  
The system compares calculated NTCP values against QUANTEC and RTOG benchmark constraints, displaying deviations and clinical significance assessments. This feature enables instant quality assurance and protocol compliance checking.

**DVH Visualization**  
Cumulative dose-volume histograms are displayed for all structures, with overlays showing QUANTEC constraint lines and dose levels corresponding to specific complication probabilities.

### 5. Decision Support Phase

rbGyanX provides actionable clinical recommendations based on calculation results:

**Model Selection Wizard**  
An interactive step-by-step wizard guides users through the clinical decision tree, explaining the rationale for each model recommendation and allowing users to explore alternative modeling approaches.

**Real-Time Preview**  
As users adjust fractionation parameters (number of fractions, dose per fraction, treatment gaps), TCP and NTCP values update in real-time, enabling rapid "what-if" analysis and treatment plan optimization.

**Comparative Analysis**  
Side-by-side comparison of multiple fractionation schemes displays TCP/NTCP differences, therapeutic index rankings, and confidence intervals, helping clinicians select the optimal treatment approach.

**Quality Assurance**  
A two-tier QA system validates all calculations:

- **Tier 1 (Automated):** Checks for data integrity, parameter validity, model appropriateness, and numerical stability
- **Tier 2 (Clinical Review):** Flags calculations requiring expert review based on unusual parameter combinations, high-risk scenarios, or results near decision thresholds

### 6. Export & Documentation Phase

Results can be exported in multiple formats for clinical documentation and research:

**PDF Reports**  
Comprehensive clinical reports include all calculation results, dose-response curves, therapeutic window plots, DVH visualizations, model parameters, literature references, and developer information. All graphics are exported as publication-ready 1200 DPI SVG files.

**Word Documents**  
Editable Word documents provide the same content as PDF reports, enabling clinicians to add case-specific notes and integrate results into clinical workflows.

**CSV/JSON Data Export**  
Raw calculation results and DVH data can be exported in structured formats for further analysis, quality assurance databases, or research studies.

**Case Database**  
All calculations are automatically saved to a local database with patient identifiers removed (HIPAA/GDPR compliant anonymization). Users can browse, search, and retrieve historical cases for comparison or re-analysis.

---

## Core Features

### Radiobiological Models

**Linear-Quadratic (LQ) Model**  
The foundation of modern radiobiology, the LQ model describes cell survival as a function of dose through two components: α (linear) and β (quadratic). The model is valid for conventional fractionation (dose per fraction ≤ 4 Gy) and forms the basis for BED and EQD2 calculations.

$$BED = D \times \left(1 + \frac{d}{\alpha/\beta}\right)$$

$$EQD2 = D \times \frac{\alpha/\beta + d}{\alpha/\beta + 2}$$

where D is total dose, d is dose per fraction, and α/β is the tissue-specific fractionation sensitivity parameter.

**Linear-Quadratic-Linear (LQL) Model**  
For high dose-per-fraction treatments (SBRT, SRS, HDR), the LQL model provides more accurate predictions by transitioning from quadratic to linear cell kill at high doses. This model addresses the limitation of the LQ model, which overestimates cell kill at very high doses.

**Lyman-Kutcher-Burman (LKB) NTCP Model**  
The LKB model calculates NTCP from the dose-volume histogram using three parameters: TD50 (dose causing 50% complication probability for uniform irradiation), m (slope of dose-response curve), and n (volume effect parameter). The model uses gEUD to reduce the DVH to a single equivalent dose:

$$gEUD = \left(\sum_{i} v_i \cdot D_i^a\right)^{1/a}$$

where vi is the fractional volume receiving dose Di, and a is the volume effect parameter (a = 1/n for the LKB model).

**Poisson TCP/NTCP Models**  
Poisson models assume that tumor control or normal tissue complication follows Poisson statistics based on the number of surviving clonogenic cells or functional subunits. These models are particularly suitable for parallel organ architecture.

### Treatment Modality Support

**External Beam Radiotherapy (EBRT)**  
Conventional fractionation (1.8-2.0 Gy per fraction) with standard LQ modeling and QUANTEC-based NTCP parameters for all major organs.

**Stereotactic Body Radiotherapy (SBRT)**  
High-dose, hypofractionated treatment (typically 3-8 fractions) with automatic LQL model selection and SBRT-specific TCP/NTCP parameters.

**Stereotactic Radiosurgery (SRS)**  
Single-fraction or few-fraction intracranial treatment with LQL modeling and brain-specific complication parameters.

**High-Dose-Rate (HDR) Brachytherapy**  
High dose-per-fraction interstitial or intracavitary treatment with gLQ modeling and brachytherapy-specific parameters.

**Low-Dose-Rate (LDR) Brachytherapy**  
Continuous low-dose-rate treatment with time-corrected LQ modeling accounting for dose rate effects.

**Proton Therapy**  
Charged particle therapy with RBE-adjusted dose calculations (RBE = 1.1 for clinical proton beams, with optional variable RBE modeling).

**Pediatric Radiotherapy**  
Age-appropriate α/β parameters and conservative modeling for pediatric patients, with emphasis on late effects and second cancer risk.

**Re-irradiation**  
Cumulative BED calculation from multiple treatment courses with tissue recovery factors based on time interval between treatments.

**Combined Modality Treatment**  
EBRT + brachytherapy boost with gLQ-based dose summation accounting for different fractionation schemes.

**Adaptive Radiotherapy**  
Fast EUD-based recalculation for adaptive replanning scenarios with anatomical changes.

### Advanced Computational Features

**Uncertainty Quantification**  
Monte Carlo simulation propagates parameter uncertainties (α/β, TD50, m, n) through all calculations, providing confidence intervals and risk bands for TCP and NTCP predictions. This feature enables clinicians to assess the reliability of model predictions and identify cases requiring additional scrutiny.

**Sensitivity Analysis**  
Automated sensitivity analysis identifies the parameters with the greatest influence on TCP and NTCP, helping users understand which uncertainties matter most and where additional measurement precision would be most valuable.

**Statistical Analysis**  
Comprehensive statistical tools support research and quality assurance:

- **Descriptive Statistics:** Mean, median, standard deviation, percentiles for dose distributions
- **Correlation Analysis:** Pearson and Spearman correlation between dose metrics and outcomes
- **Regression Analysis:** Linear and logistic regression for dose-response modeling
- **Survival Analysis:** Kaplan-Meier and Cox proportional hazards for time-to-event outcomes
- **ROC Analysis:** Receiver operating characteristic curves for model performance evaluation
- **Hypothesis Testing:** t-tests, ANOVA, chi-square tests for comparative studies

**Error Handling & Auto-Recovery**  
Robust error handling with automatic recovery mechanisms:

- **DVH Validation:** Automatic detection and correction of common DVH errors (negative volumes, dose discontinuities)
- **Parameter Clamping:** Out-of-range parameters are automatically clamped to physiologically plausible values with user warnings
- **Flexible Parsing:** Tolerant parsing of DVH files with varying formats and delimiters
- **Exponential Backoff Retry:** Automatic retry with exponential backoff for transient calculation failures
- **Graceful Degradation:** Partial results returned when complete calculation is impossible

### Quality Assurance System

**Two-Tier QA Framework**  
rbGyanX implements a comprehensive two-tier quality assurance system:

**Tier 1: Automated Validation**  
- DVH data integrity checks (monotonicity, volume conservation, dose range)
- Parameter validity checks (α/β within physiological range, TD50 consistent with literature)
- Model appropriateness checks (dose-per-fraction within model validity range)
- Numerical stability checks (convergence of iterative algorithms, absence of NaN/Inf)
- Benchmark comparison (NTCP within expected range for given dose metrics)

**Tier 2: Clinical Review Flags**  
- Unusual parameter combinations (e.g., very high α/β for late-responding tissue)
- High-risk scenarios (e.g., NTCP > 20% for critical serial organs)
- Results near decision thresholds (e.g., TCP 45-55% where small changes affect treatment decisions)
- Extrapolation warnings (e.g., dose-per-fraction outside published parameter range)
- Conflicting model predictions (e.g., large discrepancy between LKB Log-Logistic and Probit)

### Privacy & Security

**HIPAA/GDPR Compliance**  
rbGyanX implements comprehensive patient data protection:

- **AES-256-GCM Encryption:** All patient data encrypted at rest and in transit
- **Automatic Anonymization:** Patient identifiers automatically removed before storage
- **Audit Logging:** All data access and calculations logged with user authentication
- **Data Retention Policies:** Configurable automatic deletion of old cases
- **Export Controls:** Encrypted export with password protection for sensitive data

**Institutional Review Board (IRB) Support**  
Built-in tools for research compliance:

- **Informed Consent Tracking:** Digital consent forms with version control
- **Protocol Management:** IRB protocol tracking with expiration alerts
- **Adverse Event Reporting:** Structured adverse event documentation
- **Data De-identification:** Automated removal of 18 HIPAA identifiers
- **Audit Trail Export:** Complete audit trails for regulatory submissions

### Collaboration & Workflow

**Real-Time Collaboration**  
Multiple users can work on the same case simultaneously with:

- **Presence Indicators:** See who else is viewing/editing the case
- **Threaded Comments:** Discussion threads attached to specific calculations
- **Change Tracking:** Complete history of all modifications with user attribution
- **Conflict Detection:** Automatic detection and resolution of simultaneous edits

**Institutional Admin Dashboard**  
Administrators can manage department-wide settings:

- **User Role Management:** Define roles (physicist, dosimetrist, physician) with granular permissions
- **Protocol Templates:** Create and distribute institutional protocol templates
- **Compliance Monitoring:** Track protocol adherence and QA metrics across all users
- **Usage Analytics:** Department-wide statistics on calculation volume and model usage

---

## Working Principles

### Dose-Response Modeling

The fundamental principle underlying rbGyanX is the dose-response relationship: as radiation dose increases, the probability of tumor control increases while the probability of normal tissue complications also increases. The goal of treatment planning is to maximize TCP while minimizing NTCP, creating a favorable "therapeutic window."

**Tumor Control Probability (TCP)**  
TCP modeling assumes that tumor control requires sterilization of all clonogenic tumor cells. The Poisson TCP model expresses this as:

$$TCP = e^{-N \cdot SF}$$

where N is the initial number of clonogenic cells and SF is the surviving fraction after radiation. For a given dose D with fractionation d:

$$SF = e^{-\alpha D - \beta D d}$$

The LKB-based TCP model uses gEUD with tumor-specific parameters to account for dose heterogeneity within the target volume.

**Normal Tissue Complication Probability (NTCP)**  
NTCP modeling recognizes that normal tissues have varying sensitivities to radiation dose and volume effects. Serial organs (spinal cord, esophagus) are sensitive to maximum dose, while parallel organs (lung, liver) tolerate partial volume irradiation better. The LKB model captures this through the volume effect parameter n:

- n ≈ 1: Serial organ (maximum dose dominates)
- n ≈ 0: Parallel organ (mean dose dominates)
- 0 < n < 1: Mixed serial-parallel architecture

### Fractionation Effects

The rationale for fractionated radiotherapy is the differential response of tumors and normal tissues to dose per fraction. The α/β ratio quantifies this sensitivity:

- **Low α/β (1-3 Gy):** Late-responding normal tissues (spinal cord, brain, lung) - highly sensitive to dose per fraction
- **Medium α/β (3-5 Gy):** Early-responding normal tissues (mucosa, skin) - moderately sensitive
- **High α/β (8-10 Gy):** Tumors and acutely responding tissues - relatively insensitive to dose per fraction

Conventional fractionation (2 Gy per fraction) exploits this differential, sparing late-responding tissues while achieving tumor control. Hypofractionation (dose per fraction > 2 Gy) increases biological effectiveness for low α/β tissues, requiring careful NTCP modeling.

### Equivalent Dose Concepts

**Biologically Effective Dose (BED)**  
BED quantifies the biological effect of a fractionation scheme, enabling comparison of different schedules. Higher BED indicates greater biological effect (more cell kill). For tumor control, higher BED is desirable; for normal tissue complications, lower BED is desirable.

**Equivalent Dose in 2 Gy Fractions (EQD2)**  
EQD2 converts any fractionation scheme to the equivalent total dose delivered in 2 Gy fractions. This standardization enables direct comparison with clinical trial data and dose constraints, which are typically reported in conventional fractionation.

### Model Selection Rationale

The choice of radiobiological model depends on the dose-per-fraction and treatment modality:

**LQ Model (d ≤ 4 Gy)**  
The LQ model is well-validated for conventional fractionation and supported by extensive clinical data. It provides accurate predictions for the vast majority of EBRT treatments.

**Modified LQ (4 Gy < d ≤ 6 Gy)**  
In the transition zone between conventional and high-dose fractionation, the LQ model remains reasonably accurate but uncertainty increases. rbGyanX flags these cases for careful review.

**LQL Model (d > 6 Gy)**  
At very high doses per fraction (SBRT, SRS), the LQ model overestimates cell kill because it predicts unlimited quadratic cell kill. The LQL model transitions to linear cell kill at high doses, providing more realistic predictions. The transition dose is typically 10-20 Gy.

### Uncertainty and Confidence

All radiobiological models contain inherent uncertainties due to:

- **Parameter Uncertainty:** α/β, TD50, m, and n are population averages with inter-patient variability
- **Model Uncertainty:** All models are simplifications of complex biological processes
- **Measurement Uncertainty:** DVH data depends on structure delineation and dose calculation accuracy

rbGyanX quantifies these uncertainties through Monte Carlo simulation, providing confidence intervals for all predictions. This enables clinicians to distinguish between high-confidence predictions (narrow confidence intervals) and uncertain predictions (wide confidence intervals) requiring additional caution.

---

## Clinical Applications

### Treatment Plan Evaluation

rbGyanX enables rapid, quantitative evaluation of treatment plans:

1. **Import DVH data** from the treatment planning system
2. **Review automatic model selection** and adjust if needed
3. **Examine TCP and NTCP** with confidence intervals
4. **Compare against benchmark constraints** (QUANTEC, RTOG)
5. **Generate dose-response curves** to visualize therapeutic window
6. **Export comprehensive report** for clinical documentation

### Treatment Plan Comparison

When multiple treatment plans are available (e.g., IMRT vs. VMAT, different fractionation schemes), rbGyanX facilitates evidence-based selection:

1. **Load DVH data** for all candidate plans
2. **Calculate TCP and NTCP** for each plan
3. **Generate comparative analysis** with side-by-side results
4. **Visualize therapeutic window** for all plans simultaneously
5. **Rank plans** by therapeutic index (TCP/NTCP ratio)
6. **Select optimal plan** based on quantitative metrics and clinical judgment

### Dose Escalation Studies

rbGyanX supports dose escalation research by predicting TCP and NTCP for hypothetical dose levels:

1. **Input current treatment plan** DVH data
2. **Scale DVH** to higher dose levels
3. **Calculate TCP and NTCP** at each dose level
4. **Identify maximum tolerated dose** (MTD) where NTCP reaches acceptable threshold
5. **Estimate TCP gain** from dose escalation
6. **Generate dose-response curves** showing escalation potential

### Re-irradiation Planning

Re-irradiation requires careful consideration of cumulative dose and tissue recovery:

1. **Input DVH data** from initial treatment
2. **Specify time interval** since initial treatment
3. **Apply recovery factors** based on tissue type and interval
4. **Calculate cumulative BED** from both treatments
5. **Assess NTCP** for cumulative exposure
6. **Determine safe re-irradiation dose** within NTCP constraints

### Adaptive Radiotherapy

When anatomical changes occur during treatment, rbGyanX enables rapid re-evaluation:

1. **Load updated DVH data** from adaptive replan
2. **Use fast EUD-based calculation** for rapid results
3. **Compare TCP and NTCP** to original plan
4. **Assess need for plan adaptation** based on quantitative changes
5. **Document adaptive decision** with calculation results

### Quality Assurance

rbGyanX serves as an independent check on treatment planning system calculations:

1. **Export DVH data** from TPS
2. **Calculate NTCP** using rbGyanX
3. **Compare against TPS predictions** (if available)
4. **Verify compliance** with protocol constraints
5. **Flag plans** requiring additional review
6. **Document QA** in audit trail

### Research & Publication

rbGyanX supports radiobiology research with comprehensive analysis tools:

1. **Collect DVH data** from clinical cohort
2. **Calculate TCP and NTCP** for all patients
3. **Perform statistical analysis** (correlation, regression, ROC)
4. **Generate publication-ready figures** (1200 DPI SVG)
5. **Export data** for external analysis
6. **Cite rbGyanX** using included CITATION.cff

---

## Parameter Database

rbGyanX includes a comprehensive database of radiobiological parameters derived from QUANTEC, RTOG protocols, and peer-reviewed literature. Parameters are organized by:

- **Organ/Structure:** 20+ organs at risk and tumor sites
- **Endpoint:** Specific complications (e.g., pneumonitis, xerostomia, rectal bleeding)
- **Modality:** EBRT, SBRT, SRS, HDR, proton, pediatric
- **Model:** LKB, Poisson, LQL
- **Reference:** Primary literature citation for each parameter set

Users can view parameter details, compare alternative parameter sets, and override defaults for research purposes. All parameter modifications are logged in the audit trail.

---

## Technical Architecture

rbGyanX is built on a modern, scalable architecture:

**Frontend**  
- React Native (Expo SDK 54) for cross-platform mobile and web support
- TypeScript for type safety and developer productivity
- NativeWind (Tailwind CSS) for responsive, accessible UI
- React Native SVG for publication-quality vector graphics

**Backend**  
- Node.js with Express for API server
- tRPC for type-safe API communication
- PostgreSQL with Drizzle ORM for patient database
- S3-compatible storage for DICOM files and exports

**Calculation Engine**  
- Pure TypeScript implementation of all radiobiological models
- Optimized numerical algorithms for real-time calculation
- Monte Carlo simulation with Web Workers for parallel processing
- Comprehensive unit test coverage (60+ tests) for validation

**Security**  
- AES-256-GCM encryption for data at rest
- TLS 1.3 for data in transit
- OAuth 2.0 for user authentication
- Role-based access control (RBAC) for multi-user environments

---

## Validation & Testing

rbGyanX has undergone extensive validation against published data and clinical benchmarks:

**Unit Testing**  
60+ unit tests cover all calculation functions, ensuring numerical accuracy and edge case handling. Tests include:

- BED and EQD2 calculation validation against hand calculations
- TCP and NTCP model validation against published examples
- DVH processing validation with synthetic and clinical data
- Parameter lookup validation against QUANTEC guidelines
- Error handling validation for all failure modes

**Integration Testing**  
End-to-end workflow testing ensures seamless operation from data input through export.

**Clinical Validation**  
Planned validation study will compare rbGyanX predictions against clinical outcomes for 50+ patients across multiple tumor sites. Target accuracy: ±5% for TCP and NTCP predictions compared to published benchmarks.

---

## Future Development

Planned enhancements for future versions:

**Machine Learning Integration**  
- Deep learning NTCP models trained on large clinical datasets
- Automated structure segmentation quality assessment
- Predictive modeling of individual patient radiosensitivity

**Advanced Imaging Integration**  
- Functional imaging (PET, MRI) for biological target volume definition
- Dose-painting optimization based on imaging biomarkers
- Radiomics features for personalized TCP/NTCP prediction

**Clinical Decision Support**  
- AI-powered treatment planning recommendations
- Automated protocol compliance checking
- Real-time dose optimization during planning

**Multi-Institutional Collaboration**  
- Federated learning for model improvement without data sharing
- Benchmarking against national/international databases
- Collaborative research platform for outcomes analysis

---

## Citation

When using rbGyanX in research or clinical practice, please cite:

**Mondal, K.** (2026). *rbGyanX: genius evolved - Comprehensive Radiobiology & Dosimetry Calculation Platform* (Version 2.0.0) [Software]. rbGyanX Academic Team. https://github.com/rbGyanX/rbgyanx-genius-evolved

BibTeX entry:

```bibtex
@software{mondal2026rbgyanx,
  author = {Mondal, K.},
  title = {rbGyanX: genius evolved - Comprehensive Radiobiology & Dosimetry Calculation Platform},
  year = {2026},
  version = {2.0.0},
  publisher = {rbGyanX Academic Team},
  address = {Darjeeling, India},
  institution = {North Bengal Medical College}
}
```

---

## References

1. Marks LB, et al. (2010). Use of normal tissue complication probability models in the clinic. *Int J Radiat Oncol Biol Phys*, 76(3 Suppl):S10-19.
2. Bentzen SM, et al. (2010). Quantitative Analyses of Normal Tissue Effects in the Clinic (QUANTEC): An introduction to the scientific issues. *Int J Radiat Oncol Biol Phys*, 76(3 Suppl):S3-9.
3. Lyman JT. (1985). Complication probability as assessed from dose-volume histograms. *Radiat Res Suppl*, 8:S13-19.
4. Kutcher GJ, Burman C. (1989). Calculation of complication probability factors for non-uniform normal tissue irradiation: The effective volume method. *Int J Radiat Oncol Biol Phys*, 16(6):1623-1630.
5. Niemierko A. (1997). Reporting and analyzing dose distributions: A concept of equivalent uniform dose. *Med Phys*, 24(1):103-110.
6. Fowler JF. (2010). 21 years of biologically effective dose. *Br J Radiol*, 83(991):554-568.
7. Park C, et al. (2008). Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. *Int J Radiat Oncol Biol Phys*, 70(3):847-852.
8. Astrahan M. (2008). Some implications of linear-quadratic-linear radiation dose-response with regard to hypofractionation. *Med Phys*, 35(9):4161-4172.

---

## Contact & Support

**Primary Developer:**  
K. Mondal, M.Sc. (Medical Physics)  
Department of Radiotherapy  
North Bengal Medical College  
Darjeeling, West Bengal, India

**Academic Team:**  
rbGyanX Academic Team  
Email: support@rbgyanx.org  
Website: https://rbgyanx.org

**Issue Tracking:**  
GitHub: https://github.com/rbGyanX/rbgyanx-genius-evolved/issues

**Documentation:**  
Online Manual: https://docs.rbgyanx.org  
Video Tutorials: https://youtube.com/rbGyanX

---

## License

rbGyanX is released under the Academic Free License v3.0 for non-commercial use. Commercial licensing is available for institutional deployment. Contact the rbGyanX Academic Team for licensing inquiries.

---

## Acknowledgments

The rbGyanX team gratefully acknowledges:

- The QUANTEC consortium for establishing evidence-based dose constraints
- The radiation oncology community for clinical validation and feedback
- North Bengal Medical College for institutional support
- Open-source contributors to the underlying software libraries

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Author:** K. Mondal (Medical Physicist), rbGyanX Academic Team
