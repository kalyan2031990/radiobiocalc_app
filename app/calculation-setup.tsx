/**
 * Calculation setup — offline screen avoids tRPC bundle on Android.
 */

import { usesLocalEngine } from "@/lib/offline-mode";

export default function CalculationSetupScreen() {
  if (usesLocalEngine()) {
    return require("./calculation-setup-offline").default();
  }
  return require("./calculation-setup-online").default();
}
