/**
 * True offline APK — calculations on device, no PC API required.
 */

import Constants from "expo-constants";
import { getPilotApiOverride } from "@/lib/pilot-api-store";

export function isOfflineBuild(): boolean {
  const extra = Constants.expoConfig?.extra?.offlineBuild;
  if (extra === true || extra === "true" || extra === 1) return true;
  if (Constants.expoConfig?.name === "rbGyanX Mobile") return true;
  return process.env.EXPO_PUBLIC_OFFLINE_BUILD === "1";
}

export const OFFLINE_MODE_LABEL =
  "Offline — TCP/NTCP/DVH run on this device. No server or Wi‑Fi required.";

export const OFFLINE_EXPORT_HINT =
  "PDF/DOCX are saved on this device. Export server on Home is optional (web templates only).";

export function isExportServerConfigured(): boolean {
  return !!getPilotApiOverride();
}
