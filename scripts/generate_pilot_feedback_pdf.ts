/**
 * Generate blank + filled pilot feedback PDFs (auto-wrapped text fields).
 */
import { writePilotFeedbackForms } from "./pilot-feedback-form";

writePilotFeedbackForms()
  .then((p) => {
    console.log("Blank:", p.blank);
    console.log("Filled:", p.filled);
    console.log("Also: rbGyanX_pilot_study_kit/05_instructions/rbGyanX_pilot_feedback_FORM.pdf");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
