/**
 * Generate pilot participant feedback workbook (.xlsx).
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const OUT =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_pilot_study_kit",
    "05_instructions",
    "rbGyanX_pilot_feedback_TEMPLATE.xlsx",
  );

function sheetFromRows(rows: (string | number)[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

function main(): void {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["rbGyanX Mobile — Pilot feedback workbook"],
    ["Version 1.0.0 (build 15)"],
    [""],
    ["How to use"],
    ["1. Save a copy as: rbGyanX_pilot_feedback_YOURNAME.xlsx"],
    ["2. Fill one row per task in the task sheets (green header = column names)."],
    ["3. Use Y / N / Unsure where indicated; leave blank if not applicable."],
    ["4. Return the file to the investigator (email or shared Drive upload folder)."],
    ["5. Also upload exported PDF(s) from Task A (and B if done) to the submissions folder."],
    [""],
    ["Pilot vs beta"],
    ["This pilot is a small expert study BEFORE Play Store closed beta."],
    ["Pilot = accuracy, usability, report quality with physicists (5–10 people)."],
    ["Beta = wider closed testing on Google Play after pilot issues are fixed."],
    [""],
    ["Contact investigator:"],
    ["(add email before distributing)"],
  ];

  const participant = [
    [
      "participant_id",
      "date_completed",
      "your_role",
      "institution_optional",
      "device_model",
      "android_version",
      "apk_installed_ok",
      "comments",
    ],
    ["P01", "", "Physicist / Dosimetrist / Resident / Oncologist / Other", "", "", "", "Y / N", ""],
  ];

  const taskA = [
    [
      "case_id",
      "dvh_import_ok",
      "structure_count",
      "calculation_ok",
      "tcp_percent",
      "ntcp_percent",
      "twi_percent",
      "tcp_ntcp_plausible",
      "therapeutic_window_chart_useful",
      "pdf_export_ok",
      "docx_export_ok",
      "matches_reference_pdf",
      "issues_or_notes",
    ],
    [
      "RBX-TXT-001",
      "Y / N",
      "",
      "Y / N",
      "",
      "",
      "",
      "Y / N / Unsure",
      "Y / N",
      "Y / N",
      "Y / N / Not tried",
      "Match / Partial / Different / Not compared",
      "",
    ],
  ];

  const taskB = [
    [
      "case_id",
      "dvh_import_ok",
      "calculation_ok",
      "tcp_percent",
      "ntcp_percent",
      "twi_percent",
      "results_plausible",
      "pdf_export_ok",
      "issues_or_notes",
    ],
    ["RBX-TXT-004", "Y / N", "Y / N", "", "", "", "Y / N / Unsure", "Y / N", ""],
  ];

  const taskC = [
    [
      "clinical_xlsx_used",
      "clinical_sections_in_report",
      "covariate_adjustment_seen",
      "base_vs_adjusted_tcp_clear",
      "comments",
    ],
    ["Y / N / Not tried", "Y / N", "Y / N", "Y / N", ""],
  ];

  const taskD = [
    [
      "case_id",
      "completed",
      "import_ok",
      "calculation_ok",
      "tcp_percent",
      "ntcp_percent",
      "plausible",
      "notes",
    ],
    ["RBX-DCM-001", "Y / N", "Y / N", "Y / N", "", "", "Y / N / Unsure", ""],
    ["RBX-DCM-002", "Y / N", "Y / N", "Y / N", "", "", "Y / N / Unsure", ""],
    ["RBX-DCM-003", "Y / N", "Y / N", "Y / N", "", "", "Y / N / Unsure", ""],
  ];

  const overall = [
    [
      "install_rating_1to5",
      "import_rating_1to5",
      "calculation_rating_1to5",
      "report_rating_1to5",
      "ui_clarity_rating_1to5",
      "use_in_research_yes_maybe_no",
      "ready_for_play_beta_yes_after_fixes_no",
      "top_improvement_1",
      "top_improvement_2",
      "top_improvement_3",
      "bugs_crashes",
      "wrong_numbers_description",
      "other_feedback",
    ],
    [
      "1=poor 5=excellent",
      "",
      "",
      "",
      "",
      "Yes / Maybe / No",
      "Yes / After fixes / No",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];

  XLSX.utils.book_append_sheet(wb, sheetFromRows(instructions), "00_Instructions");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(participant), "01_Participant");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(taskA), "02_TaskA_TXT001");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(taskB), "03_TaskB_TXT004");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(taskC), "04_TaskC_Clinical");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(taskD), "05_TaskD_Advanced");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(overall), "06_Overall");

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  XLSX.writeFile(wb, OUT);
  console.log("Wrote", OUT);
}

main();
