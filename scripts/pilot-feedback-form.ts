/**
 * Shared pilot feedback PDF form builder (mobile-friendly field sizing).
 */
import fs from "fs";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
  type PDFPage,
  type PDFTextField,
  rgb,
} from "pdf-lib";

export const PAGE_W = 595;
export const PAGE_H = 842;
export const M = 40;
export const FIELD_W = PAGE_W - 2 * M;
export const FONT_SIZE = 8;
export const LINE = 14;

export function drawLabel(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size = 9,
) {
  page.drawText(text, { x, y, size, font, color: rgb(0.12, 0.16, 0.22) });
}

export function configureField(
  field: PDFTextField,
  opts: { multiline?: boolean; fontSize?: number } = {},
) {
  const size = opts.fontSize ?? FONT_SIZE;
  field.setFontSize(size);
  if (opts.multiline) field.enableMultiline();
  field.enableScrolling();
}

/** Wrap prose for multiline PDF fields (~chars per line at 8pt full width). */
export function wrapFieldText(text: string, maxChars = 78): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export type PilotFeedbackData = {
  participant_id: string;
  date: string;
  role: string;
  device: string;
  android: string;
  apk_ok: string;
  a_tcp: string;
  a_ntcp: string;
  a_twi: string;
  a_notes: string;
  b_tcp: string;
  b_ntcp: string;
  b_twi: string;
  b_notes: string;
  rate_install: string;
  rate_calc: string;
  rate_report: string;
  use_research: string;
  ready_beta: string;
  overall_notes: string;
  checks: string[];
};

export const INVESTIGATOR_FILLED: PilotFeedbackData = {
  participant_id: "Pilot-1 (investigator device validation)",
  date: "2026-06-13",
  role: "Investigator / medical physicist",
  device: "vivo 1907",
  android: "12",
  apk_ok: "Y",
  a_tcp: "95.0",
  a_ntcp: "62.7",
  a_twi: "35.0",
  a_notes:
    "Composite DVH imported from Downloads. Setup: HN, IMRT, 70 Gy / 35 fx. Calculation completed; TCP 95%, NTCP 62.7%, TWI 35.0% (matches PC engine). Therapeutic-window chart viewed. PDF export verified. Clinical context: smoking Former, concurrent chemo Yes, target role PTV.",
  b_tcp: "95.0",
  b_ntcp: "66.3",
  b_twi: "41.7",
  b_notes:
    "50 Gy composite case imported and calculated successfully. Results screen verified. Export screen required scrolling on 1080p display. Metrics match PC reference run.",
  rate_install: "5",
  rate_calc: "4",
  rate_report: "5",
  use_research: "Yes",
  ready_beta: "After fixes",
  overall_notes:
    "No crashes. Run calculation and Export report buttons often below fold — scroll needed. Composite calc ~60–90 s. Engine metrics match PC reference. Clinical xlsx panel and context form usable. Top improvements: sticky action buttons; calc progress indicator; clinical form scroll retention.",
  checks: [
    "a_import",
    "a_calc",
    "a_pdf",
    "a_plausible",
    "a_chart",
    "a_ref",
    "b_done",
    "b_import",
    "b_calc",
    "b_pdf",
    "b_plausible",
    "c_used",
    "c_report",
  ],
};

export async function buildPilotFeedbackPdf(filled?: PilotFeedbackData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("rbGyanX Pilot Feedback Form");
  pdf.setAuthor("rbGyanX");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();

  const addField = (
    page: PDFPage,
    name: string,
    y: number,
    height: number,
    multiline = false,
  ) => {
    const f = form.createTextField(name);
    f.addToPage(page, {
      x: M,
      y: y - height,
      width: FIELD_W,
      height,
      borderWidth: 1,
      borderColor: rgb(0.55, 0.58, 0.62),
      backgroundColor: rgb(1, 1, 1),
      multiline,
    });
    configureField(f, { multiline, fontSize: FONT_SIZE });
    return y - height - 6;
  };

  const addShortRow = (page: PDFPage, name: string, label: string, y: number, w = 120) => {
    drawLabel(page, font, label, M, y, 9);
    const f = form.createTextField(name);
    f.addToPage(page, {
      x: M + 200,
      y: y - 14,
      width: w,
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0.55, 0.58, 0.62),
      backgroundColor: rgb(1, 1, 1),
    });
    configureField(f, { fontSize: FONT_SIZE });
    return y - LINE - 4;
  };

  const addCheck = (page: PDFPage, name: string, label: string, y: number) => {
    const cb = form.createCheckBox(name);
    cb.addToPage(page, { x: M, y: y - 8, width: 14, height: 14 });
    drawLabel(page, font, label, M + 20, y, 9);
    return y - LINE;
  };

  // ── Page 1 ───────────────────────────────────────────────────────────
  const p1 = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  p1.drawRectangle({ x: M, y: y - 50, width: FIELD_W, height: 52, color: rgb(0.93, 0.96, 1) });
  drawLabel(p1, bold, "rbGyanX Mobile — Pilot feedback form", M + 8, y - 20, 13);
  drawLabel(p1, font, "v1.0.0 (build 15) · Fill on phone · Save PDF · Return to investigator", M + 8, y - 38, 8);

  y -= 64;
  drawLabel(p1, bold, "1. About you", M, y, 10);
  y -= LINE;

  drawLabel(p1, font, "Participant ID / name", M, y, 8);
  y -= 10;
  y = addField(p1, "participant_id", y, 26, true);

  drawLabel(p1, font, "Date completed", M, y, 8);
  y -= 10;
  y = addField(p1, "date", y, 22, false);

  drawLabel(p1, font, "Role (physicist, dosimetrist, oncologist, etc.)", M, y, 8);
  y -= 10;
  y = addField(p1, "role", y, 26, true);

  drawLabel(p1, font, "Phone model", M, y, 8);
  y -= 10;
  y = addField(p1, "device", y, 22, false);

  drawLabel(p1, font, "Android version", M, y, 8);
  y -= 10;
  y = addField(p1, "android", y, 22, false);

  y = addShortRow(p1, "apk_ok", "APK installed OK? (Y / N)", y, 60);

  y -= 6;
  drawLabel(p1, bold, "2. Task A — RBX-TXT-001", M, y, 10);
  y -= LINE;

  y = addCheck(p1, "a_import", "DVH import OK", y);
  y = addCheck(p1, "a_calc", "Calculation OK", y);
  y = addCheck(p1, "a_pdf", "PDF export OK", y);
  y = addCheck(p1, "a_plausible", "TCP/NTCP results plausible", y);
  y = addCheck(p1, "a_chart", "Therapeutic-window chart useful", y);
  y = addCheck(p1, "a_ref", "Report similar to reference PDF", y);

  y -= 2;
  drawLabel(p1, font, "TCP %", M, y, 8);
  const aTcp = form.createTextField("a_tcp");
  aTcp.addToPage(p1, { x: M + 42, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(aTcp);
  drawLabel(p1, font, "NTCP %", M + 110, y, 8);
  const aNtcp = form.createTextField("a_ntcp");
  aNtcp.addToPage(p1, { x: M + 152, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(aNtcp);
  drawLabel(p1, font, "TWI %", M + 220, y, 8);
  const aTwi = form.createTextField("a_twi");
  aTwi.addToPage(p1, { x: M + 258, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(aTwi);
  y -= LINE + 6;

  drawLabel(p1, font, "Task A notes", M, y, 8);
  y -= 10;
  y = addField(p1, "a_notes", y, 72, true);

  // ── Page 2 ───────────────────────────────────────────────────────────
  const p2 = pdf.addPage([PAGE_W, PAGE_H]);
  y = PAGE_H - M;

  drawLabel(p2, bold, "3. Task B — RBX-TXT-004", M, y, 10);
  y -= LINE;

  y = addCheck(p2, "b_done", "Task B completed", y);
  y = addCheck(p2, "b_import", "DVH import OK", y);
  y = addCheck(p2, "b_calc", "Calculation OK", y);
  y = addCheck(p2, "b_pdf", "PDF export OK", y);
  y = addCheck(p2, "b_plausible", "Results plausible", y);

  y -= 2;
  drawLabel(p2, font, "TCP %", M, y, 8);
  const bTcp = form.createTextField("b_tcp");
  bTcp.addToPage(p2, { x: M + 42, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(bTcp);
  drawLabel(p2, font, "NTCP %", M + 110, y, 8);
  const bNtcp = form.createTextField("b_ntcp");
  bNtcp.addToPage(p2, { x: M + 152, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(bNtcp);
  drawLabel(p2, font, "TWI %", M + 220, y, 8);
  const bTwi = form.createTextField("b_twi");
  bTwi.addToPage(p2, { x: M + 258, y: y - 14, width: 48, height: 20, borderWidth: 1 });
  configureField(bTwi);
  y -= LINE + 6;

  drawLabel(p2, font, "Task B notes", M, y, 8);
  y -= 10;
  y = addField(p2, "b_notes", y, 56, true);

  drawLabel(p2, bold, "4. Optional — clinical xlsx", M, y, 10);
  y -= LINE;
  y = addCheck(p2, "c_used", "Used clinical spreadsheet", y);
  y = addCheck(p2, "c_report", "Clinical sections seen in report", y);

  y -= 4;
  drawLabel(p2, bold, "5. Overall", M, y, 10);
  y -= LINE;
  y = addShortRow(p2, "rate_install", "Install (1=poor, 5=excellent)", y, 50);
  y = addShortRow(p2, "rate_calc", "Calculation experience (1–5)", y, 50);
  y = addShortRow(p2, "rate_report", "Report quality (1–5)", y, 50);
  y = addShortRow(p2, "use_research", "Use in research? (Yes / Maybe / No)", y, 110);
  y = addShortRow(p2, "ready_beta", "Ready for Play beta? (Yes / After fixes / No)", y, 130);

  drawLabel(p2, font, "Bugs, crashes, wrong numbers, top 3 improvements", M, y, 8);
  y -= 10;
  y = addField(p2, "overall_notes", y, 100, true);

  drawLabel(p2, bold, "Return to investigator", M, y - 4, 9);
  drawLabel(p2, font, "Save filled PDF + attach app-exported report PDF(s).", M, y - 18, 8);
  drawLabel(p2, font, "Upload to shared Drive: 06_expert_submissions/", M, y - 32, 8);

  if (filled) {
    const set = (name: string, value: string, wrap = false) => {
      const v = wrap ? wrapFieldText(value) : value;
      form.getTextField(name).setText(v);
    };
    set("participant_id", filled.participant_id, true);
    set("date", filled.date);
    set("role", filled.role, true);
    set("device", filled.device);
    set("android", filled.android);
    set("apk_ok", filled.apk_ok);
    set("a_tcp", filled.a_tcp);
    set("a_ntcp", filled.a_ntcp);
    set("a_twi", filled.a_twi);
    set("a_notes", filled.a_notes, true);
    set("b_tcp", filled.b_tcp);
    set("b_ntcp", filled.b_ntcp);
    set("b_twi", filled.b_twi);
    set("b_notes", filled.b_notes, true);
    set("rate_install", filled.rate_install);
    set("rate_calc", filled.rate_calc);
    set("rate_report", filled.rate_report);
    set("use_research", filled.use_research);
    set("ready_beta", filled.ready_beta);
    set("overall_notes", filled.overall_notes, true);
    for (const c of filled.checks) {
      try {
        form.getCheckBox(c).check();
      } catch {
        /* ignore */
      }
    }
  }

  form.updateFieldAppearances(font);
  return pdf.save();
}

export async function writePilotFeedbackForms(): Promise<{ blank: string; filled: string }> {
  const kit = path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_pilot_study_kit",
    "05_instructions",
  );
  const pilot1 = path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_mobile_paper",
    "pilot_feedback",
    "pilot1",
  );
  const results = path.join(
    process.env.USERPROFILE || "",
    "OneDrive",
    "Desktop",
    "rbGyanX_pilot_study_kit",
    "Pilot_test_results",
  );

  const blankBytes = await buildPilotFeedbackPdf();
  const filledBytes = await buildPilotFeedbackPdf(INVESTIGATOR_FILLED);

  const paths = {
    blankKit: path.join(kit, "rbGyanX_pilot_feedback_FORM.pdf"),
    blankPilot1: path.join(pilot1, "rbGyanX_pilot_feedback_FORM_blank.pdf"),
    filledPilot1: path.join(pilot1, "rbGyanX_pilot_feedback_FORM_filled.pdf"),
    filledResults: path.join(results, "rbGyanX_pilot_feedback_FORM_filled.pdf"),
  };

  for (const p of Object.values(paths)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  }
  fs.writeFileSync(paths.blankKit, blankBytes);
  fs.writeFileSync(paths.blankPilot1, blankBytes);
  fs.writeFileSync(paths.filledPilot1, filledBytes);
  fs.writeFileSync(paths.filledResults, filledBytes);

  return { blank: paths.blankPilot1, filled: paths.filledPilot1 };
}
