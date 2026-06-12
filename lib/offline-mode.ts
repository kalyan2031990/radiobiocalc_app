/**
 * True offline APK — calculations on device, no PC API required.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import { getPilotApiOverride } from "@/lib/pilot-api-store";

function isPilotBuild(): boolean {
  const extra = Constants.expoConfig?.extra?.pilotBuild;
  if (extra === true || extra === "true" || extra === 1) return true;
  if (Constants.expoConfig?.name === "rbGyanX Pilot") return true;
  return process.env.EXPO_PUBLIC_PILOT_BUILD === "1";
}

/** Browser on Windows — same on-device DVH/calc path as mobile offline (no API). */
export function isDesktopClient(): boolean {
  return Platform.OS === "web";
}

/** Use local parser + offline engine (mobile APK or desktop browser). */
export function usesLocalEngine(): boolean {
  return isDesktopClient() || isOfflineBuild();
}

export function isOfflineBuild(): boolean {
  if (isPilotBuild()) return false;

  const extra = Constants.expoConfig?.extra?.offlineBuild;
  if (extra === true || extra === "true" || extra === 1) return true;
  if (Constants.expoConfig?.name === "rbGyanX Mobile") return true;
  if (process.env.EXPO_PUBLIC_OFFLINE_BUILD === "1") return true;

  // Local release APKs often miss baked env flags — native non-pilot = on-device engine.
  if (Platform.OS === "android" || Platform.OS === "ios") return true;

  return false;
}

export const OFFLINE_MODE_LABEL =
  "Offline — TCP/NTCP/DVH run on this device. No server or Wi‑Fi required.";

export const OFFLINE_EXPORT_HINT =
  "PDF/DOCX are saved on this device. Export server on Home is optional (web templates only).";

export function isExportServerConfigured(): boolean {
  return !!getPilotApiOverride();
}
