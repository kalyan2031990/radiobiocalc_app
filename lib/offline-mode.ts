/**
 * True offline APK — calculations on device, no PC API required.
 */

import Constants from "expo-constants";
import { getPilotApiOverride } from "@/lib/pilot-api-store";

export function isOfflineBuild(): boolean {
  if (Constants.expoConfig?.extra?.offlineBuild === true) return true;
  return process.env.EXPO_PUBLIC_OFFLINE_BUILD === "1";
}

export const OFFLINE_MODE_LABEL =
  "Offline — TCP/NTCP/DVH run on this device. No server or Wi‑Fi required.";

export const OFFLINE_EXPORT_HINT =
  "PDF/DOCX reports need a one-time export server URL (HTTPS ngrok or LAN). Calculations stay on-device.";

export function isExportServerConfigured(): boolean {
  return !!getPilotApiOverride();
}
