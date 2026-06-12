/**
 * Lightweight startup check for offline mobile — no server/offline-engine import.
 */

import { BUNDLED_KASTOORI_PTV70_SAMPLE } from "@/lib/bundled-test-dvh";
import { parseDvhTextNative } from "@/lib/eclipse-dvh-native";

export function mobileBootSelfTest(): { ok: boolean; detail: string } {
  try {
    const parsed = parseDvhTextNative(
      BUNDLED_KASTOORI_PTV70_SAMPLE,
      "bundled_KASTOORI_PTV70.txt",
    );
    const names = Object.keys(parsed.dvhByStructure).filter(
      (k) => (parsed.dvhByStructure[k]?.length ?? 0) > 0,
    );
    if (!names.length) {
      return { ok: false, detail: "Bundled DVH parse returned no structures" };
    }
    const pts = parsed.dvhByStructure[names[0]]?.length ?? 0;
    return { ok: true, detail: `${names[0]} · ${pts} pts (native parser)` };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "Native DVH parser failed",
    };
  }
}
