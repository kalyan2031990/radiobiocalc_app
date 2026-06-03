# rbGyanX-genius evolved Mobile App - Design Document

## Overview

rbGyanX-genius evolved is a comprehensive radiobiology and dosimetry calculation app for medical physicists and radiation oncologists. It enables rapid calculation of radiobiological parameters (BED, EQD2, TCP, NTCP, EUD, gEUD) based on traditional published models, supporting both DICOM-RT and DVH file input.

**Target Users:** Medical physicists, radiation oncologists, physics residents

**Design Philosophy:** Professional, data-driven, publication-ready outputs with instant visual feedback

---

## Screen List

### 1. **Home Screen (Dashboard)**
   - Quick access to main workflows
   - Recent calculations (if stored locally)
   - Quick links to: New Calculation, Load DICOM, Load DVH, Settings
   - Visual summary of last calculation (if available)

### 2. **Input Selection Screen**
   - Three input options:
     * **Load DICOM-RT** (RT Dose + RT Structure Set)
     * **Load DVH File** (CSV/TXT differential or cumulative DVH)
     * **Manual Entry** (Direct dose/volume input)
   - File picker UI with drag-and-drop support (web)
   - File validation feedback

### 3. **Patient & Structure Selection Screen**
   - Display patient info (if DICOM available)
   - List of structures from DICOM or user-defined
   - Separate tabs/sections for:
     * **Targets:** PTV, GTV, CTV
     * **OARs:** Parotid, Larynx, Spinal Cord, Lung, Heart, Esophagus, etc.
   - Structure type classification (Target vs OAR)
   - DVH preview for selected structure

### 4. **Calculation Setup Screen**
   - **Fractionation Parameters:**
     * Total dose (Gy)
     * Number of fractions
     * Dose per fraction (auto-calculated)
     * Alpha/Beta ratio (with presets for organ/tumor type)
   - **Model Selection:**
     * Traditional Models: LKB (Log-Logistic, Probit), Poisson
     * Dose metrics: gEUD, EUD, mean dose, max dose, etc.
   - **Protocol Selection:**
     * QUANTEC recommendations
     * RTOG guidelines
     * Custom parameters
   - **Tumor Site Selection:**
     * Dropdown with all supported sites (Head & Neck, Lung, Prostate, Breast, etc.)
     * Auto-loads relevant OAR parameters

### 5. **Calculation Results Screen**
   - **Tabbed Interface:**
     * **Summary Tab:** Key results (TCP, NTCP, BED, EQD2)
     * **Dose Metrics Tab:** gEUD, EUD, mean dose, max dose, Vxx, Dxx
     * **Model Details Tab:** Parameters used, model equations, references
   - **Visual Outputs:**
     * Dose-Response Curve (sigmoid curve for TCP/NTCP)
     * Therapeutic Window (TCP vs NTCP trade-off plot)
     * DVH visualization with dose levels
   - **Export Options:**
     * PDF report (with all calculations and plots)
     * CSV data export
     * Share results

### 6. **Dose-Response Curve Screen**
   - Interactive plot showing:
     * Predicted TCP/NTCP vs dose
     * Current patient's dose point highlighted
     * Confidence intervals (if available)
     * Literature data points (if available)
   - Zoom/pan controls
   - Toggle between TCP and NTCP
   - Show model parameters on plot

### 7. **Therapeutic Window Screen**
   - 2D plot: TCP (Y-axis) vs NTCP (X-axis)
   - Current patient point highlighted
   - Iso-dose contours (optional)
   - Show "safe zone" (high TCP, low NTCP)
   - Interactive legend showing model/organ combinations

### 8. **DVH Visualization Screen**
   - Cumulative DVH plot
   - Overlay multiple structures
   - Highlight dose levels (e.g., 50%, 95% of prescription)
   - Show dose metrics on plot (Vxx, Dxx)
   - Toggle between cumulative and differential DVH

### 9. **Settings Screen**
   - **Default Parameters:**
     * Default alpha/beta ratios
     * Default tumor site
     * Default protocol (QUANTEC/RTOG)
   - **Display Options:**
     * Dark/Light mode
     * Plot resolution
     * Units (Gy vs cGy)
   - **Data Management:**
     * Clear recent calculations
     * Export/import settings

### 10. **Literature Reference Screen**
   - Display QUANTEC/RTOG recommendations for selected organ
   - Show TD50, gamma50, parameters used
   - Link to original papers (if available)
   - Comparison with current calculation

---

## Primary Content and Functionality

### **Calculation Engine (Backend)**
- **BED Calculation:** BED = D × (1 + d / (α/β))
- **EQD2 Calculation:** EQD2 = D × ((α/β + d) / (α/β + 2))
- **gEUD Calculation:** gEUD = (Σ vi × Di^a)^(1/a)
- **TCP Models:**
  * Poisson: TCP = exp(-N × S(D))
  * LKB-based: TCP using dose-response relationships
- **NTCP Models:**
  * LKB Log-Logistic: NTCP = 1 / (1 + (TD50/gEUD)^4γ50)
  * LKB Probit: NTCP = Φ((D - TD50) / (m × TD50))
  * Poisson: NTCP = 1 - exp(-λ × (D/D50)^γ)

### **Data Handling**
- **DICOM-RT Input:**
  * Parse RT Dose files (dose grid)
  * Parse RT Structure Sets (contours)
  * Extract DVH from dose grid + contours
  * Display patient info, plan info
- **DVH File Input:**
  * Support CSV/TXT formats (dose, volume columns)
  * Auto-detect cumulative vs differential
  * Validate data integrity
- **DVH Processing:**
  * Calculate dose metrics (Vxx, Dxx, gEUD)
  * Handle fractionation (physical dose → EQD2)
  * Generate biological DVH

### **Visualization**
- **Dose-Response Curves:**
  * Sigmoid curves for TCP/NTCP
  * Show current patient dose point
  * Interactive zoom/pan
  * Legend with model name and parameters
- **Therapeutic Window:**
  * 2D scatter plot (TCP vs NTCP)
  * Show multiple organs/models
  * Highlight optimal zone
- **DVH Plot:**
  * Cumulative DVH with dose levels
  * Multiple structures overlay
  * Dose metrics annotations

---

## Key User Flows

### **Flow 1: Load DICOM and Calculate TCP/NTCP**
1. User opens app → Home screen
2. Tap "Load DICOM-RT"
3. Select RT Dose + RT Structure Set files
4. App parses files, displays patient info
5. User selects target (e.g., PTV) and OARs (e.g., Parotid, Larynx)
6. User enters fractionation (total dose, # fractions)
7. User selects tumor site (e.g., Head & Neck)
8. App auto-loads QUANTEC parameters for selected organs
9. User reviews/adjusts parameters
10. Tap "Calculate"
11. Results screen shows:
    - TCP for target
    - NTCP for each OAR
    - Dose-response curves
    - Therapeutic window
    - DVH visualization
12. User can export PDF or share results

### **Flow 2: Load DVH File and Calculate**
1. User opens app → Home screen
2. Tap "Load DVH File"
3. Select CSV/TXT file with dose/volume data
4. App displays DVH preview
5. User confirms structure type (Target vs OAR) and organ name
6. User enters fractionation
7. User selects model (LKB, Poisson, etc.)
8. Tap "Calculate"
9. Results displayed as above

### **Flow 3: Manual Entry and Quick Calculation**
1. User opens app → Home screen
2. Tap "Manual Entry"
3. Enter:
   - Organ name
   - Mean dose (or gEUD)
   - Total dose
   - # Fractions
   - Alpha/Beta ratio
   - Structure type (Target vs OAR)
4. Select model
5. Tap "Calculate"
6. Results displayed

### **Flow 4: Compare Multiple Plans**
1. User loads first plan (DICOM or DVH)
2. Calculates and saves results
3. Returns to Home
4. Loads second plan
5. Calculates
6. Results screen shows side-by-side comparison
7. Therapeutic window shows both plans' points

---

## Color Choices

**Brand Colors:**
- **Primary (Accent):** `#0a7ea4` (Medical Blue) - Used for buttons, highlights
- **Secondary:** `#2E86AB` (Professional Blue) - Used for plots/models
- **Success:** `#22C55E` (Green) - For safe zones, acceptable results
- **Warning:** `#F59E0B` (Amber) - For caution zones
- **Error:** `#EF4444` (Red) - For high-risk zones, errors
- **Background:** `#ffffff` (Light) / `#151718` (Dark)
- **Surface:** `#f5f5f5` (Light) / `#1e2022` (Dark)
- **Foreground:** `#11181C` (Light) / `#ECEDEE` (Dark)
- **Muted:** `#687076` (Light) / `#9BA1A6` (Dark)

**Plot Colors (for dose-response curves):**
- **TCP:** `#2E86AB` (Blue)
- **NTCP:** `#EF4444` (Red)
- **Therapeutic Window Safe Zone:** `#22C55E` (Green)
- **Current Patient Point:** `#F59E0B` (Amber, highlighted)

---

## Mobile-First Design Principles

- **Portrait Orientation (9:16):** All screens optimized for portrait mode
- **One-Handed Usage:** Key actions accessible with thumb
- **Touch Targets:** Minimum 44pt for buttons
- **Readable Text:** 14-16pt for body text, 20-24pt for headers
- **Minimal Scrolling:** Prioritize above-the-fold content
- **Clear Hierarchy:** Important results prominent, details in tabs/expandable sections
- **Haptic Feedback:** Subtle vibration on button taps and successful calculations

---

## Technical Implementation Notes

- **Frontend:** React Native (Expo), NativeWind (Tailwind CSS)
- **Backend:** Node.js/Express API for heavy calculations
- **Data Storage:** AsyncStorage for local results, optional cloud sync
- **Visualization:** react-native-svg or chart libraries (e.g., react-native-chart-kit)
- **DICOM Parsing:** pydicom (Python backend) or dcmread.js (if available)
- **File Input:** Expo FileSystem for local file access, web file picker for browser

---

## Accessibility

- **Color Contrast:** WCAG AA compliant (4.5:1 for text)
- **Font Sizes:** Scalable with system settings
- **Keyboard Navigation:** All interactive elements keyboard-accessible
- **Screen Reader Support:** Semantic HTML/React Native components
- **Haptic Feedback:** Optional toggle in settings

---

## Performance Considerations

- **Calculation Performance:** Heavy calculations (DVH processing, curve generation) offloaded to backend
- **Visualization:** Lazy-load plots, cache results
- **File Handling:** Stream large DICOM files, validate before processing
- **Memory:** Limit DVH resolution to ~1000 points for smooth rendering

---

## Future Enhancements

- Multi-plan comparison dashboard
- Fractionation optimization (suggest # fractions for target TCP)
- Integration with TPS (export plans directly)
- Cloud sync for cross-device access
- Collaborative features (share calculations with colleagues)
- Machine learning models (optional, future phase)
- 3D dose visualization
