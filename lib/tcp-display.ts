/**
 * TCP display policy — cap saturated model outputs for beta clinician UI.
 */

/** Maximum TCP shown in the app (literature Poisson-LQ DVH often saturates near 100%). */
export const TCP_DISPLAY_CAP = 0.95;

export const TCP_MODEL_CAUTION =
  "High TCP values reflect the Poisson-LQ (DVH) model and corrected cumulative dose — not a bug. " +
  "They do not replace dose metrics or OAR NTCP for plan decisions and must not be interpreted as " +
  "guaranteed clinical tumor control without local validation.";

export const TCP_CAPPED_FOOTNOTE =
  "Displayed TCP is capped at 95% when the model exceeds that value; UTCP/TWI/P+ use the same display TCP.";

export type TcpDisplay = {
  display: number;
  raw: number;
  capped: boolean;
};

export function capTcpForDisplay(rawTcp: number): TcpDisplay {
  const raw = Math.min(1, Math.max(0, rawTcp));
  const display = Math.min(raw, TCP_DISPLAY_CAP);
  return {
    display,
    raw,
    capped: raw > TCP_DISPLAY_CAP + 1e-9,
  };
}

export function formatTcpPercent(rawTcp: number, digits = 1): string {
  const { display, capped, raw } = capTcpForDisplay(rawTcp);
  const main = `${(display * 100).toFixed(digits)}%`;
  if (!capped) return main;
  return `${main} (model ${(raw * 100).toFixed(digits)}%)`;
}
