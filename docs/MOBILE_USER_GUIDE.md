# rbGyanX Mobile — User guide

**One patient · one plan · offline TCP/NTCP**

## Before you start

- Varian Eclipse `.txt` DVH exports for **PTV (target)** and **OAR** (e.g. Parotid)
- Files copied to the phone **Downloads** folder
- USB debugging not required for normal use

## Step-by-step

### 1. Copy files

Copy both `.txt` files to **Downloads** on the phone (USB cable, email → Save, or cloud app).

Example pair: `2019-1934_PTV.txt` + `2019-1934_Parotid.txt`

### 2. Import

1. Open **rbGyanX Mobile**
2. Tap **Import plan DVH**
3. **Option A:** Tap **Refresh Downloads list** → **Import combined plan** (when 2+ files appear)
4. **Option B:** If the list is empty (common on Android 11+), tap **Pick DVH files (PTV + OAR)** and select both `.txt` files
5. Confirm **2+ structures** loaded → **Continue to setup**

### 3. Setup

- **Patient ID** — e.g. `2019-1934`
- **Plan label**, **cancer site**, **technique**
- **Total dose (Gy)** and **fractions**
- **Structure** — choose target (TCP) or OAR (NTCP)
- **Clinical context** (optional) — dropdowns for MDT notes

### 4. Calculate

Tap **Run calculation**. Review TCP/NTCP, BED, EUD, plan statistics, and **rb X** explainability.

### 5. Therapeutic window

When PTV and OAR were imported together, open **Therapeutic window** from results for composite TCP, NTCP, UTCP and TWI.

## Clinical disclaimer

Research and educational support only. Treatment decisions remain the responsibility of licensed clinicians.

## Desktop

Full cohort, DICOM pipeline, clinical xlsx covariates, and manuscript exports: use **desktop rbGyanX**.
