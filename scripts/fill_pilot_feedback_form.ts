/**
 * Regenerate filled pilot feedback PDF (uses shared form builder).
 */
import { writePilotFeedbackForms } from "./pilot-feedback-form";

writePilotFeedbackForms()
  .then((p) => console.log("Wrote", p.filled))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
