# Sample validation bundle

One anonymised composite DVH plus a reference clinical PDF export for independent review.

## Input

- `input/RBX-TXT-001_composite_DVH.txt` — head & neck composite plan (PTV + OARs)

Full clinical spreadsheet and the remaining 16 DVH cases live outside the repo under your local `rbGyaX_mobile_app_input` folder.

## Output

- `output/rbGyanX_RBX-TXT-001_clinical_composite.pdf` — composite report with clinical context, covariate-adjusted TCP where applicable, and a **single therapeutic-window plot** (TCP + NTCP dose–response curves on one dose axis).

## Reproduce (PC)

```bash
npm install
npm run test:report-export
npx tsx scripts/run_single_clinical_report_check.ts
```

With the full local input folder and a connected Android device:

```bash
npm run test:mobile-clinical-batch-export
```

Exports land in `test-output/mobile-exported-pdfs-clinical/` (gitignored) and on the phone at `/sdcard/Download/rbGyaX_exported_reports_clinical/`.
