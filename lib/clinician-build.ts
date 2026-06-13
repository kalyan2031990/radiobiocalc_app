/**
 * Clinician-facing mobile APK vs developer / desktop tooling.
 */
import { Platform } from "react-native";
import { isOfflineBuild } from "@/lib/offline-mode";

/** Dev-only UI (self-test modal, bundled samples, API URL editor, feature tour link). */
export function showDeveloperTools(): boolean {
  if (__DEV__) return true;
  return process.env.EXPO_PUBLIC_DEV_TOOLS === "1";
}

/** Release offline APK on a physical device — hide internal QA surfaces. */
export function isClinicianMobileApk(): boolean {
  return (
    isOfflineBuild() &&
    Platform.OS !== "web" &&
    !showDeveloperTools()
  );
}
