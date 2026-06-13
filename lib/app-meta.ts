/**
 * App identity — version, intended use, validation status (shown in UI).
 */

import Constants from "expo-constants";

/** Keep in sync with app.config.ts `version`. */
export const APP_VERSION = "1.0.0";

export const APP_DISPLAY_NAME = "rbGyanX";
export const APP_TAGLINE = "One Patient · One Plan · Complete Evaluation";

/** Semantic version from Expo / app.config.ts */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? APP_VERSION;
}

export function getBuildLabel(): string {
  const extra = Constants.expoConfig?.extra as { buildNumber?: number } | undefined;
  const build =
    Constants.nativeBuildVersion ??
    extra?.buildNumber ??
    Constants.expoConfig?.android?.versionCode;
  if (build != null && build !== "") {
    return `build ${build}`;
  }
  return __DEV__ ? "development" : "release";
}

/** Clinician-facing — version only (no build number). */
export function getUserVersionLine(): string {
  return `v${getAppVersion()}`;
}

export function getVersionLine(): string {
  return `v${getAppVersion()} (${getBuildLabel()})`;
}

/** Regulatory-safe positioning */
export const INTENDED_USE = {
  short:
    "Research and educational plan-evaluation assistant — not a standalone treatment-authorization system.",
  desktop:
    "Full cohort / DICOM pipeline with XAI: use desktop rbGyanX.",
  helpDocStatus: "User help guide: in preparation (not published yet).",
  validationStatus:
    "Numerical validation — see docs/VALIDATION_AND_RELEASE.md and docs/validation/.",
} as const;
