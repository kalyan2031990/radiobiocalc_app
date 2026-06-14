/**
 * User guide catalog — versioned steps; bump GUIDE_CONTENT_VERSION when steps change.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAppVersion } from "@/lib/app-meta";

/** Bump when guide content changes (independent of app semver). */
export const GUIDE_CONTENT_VERSION = "1.0.1-fix-indices-covariates";

const SEEN_KEY = "@rbgyanx_guide_version_seen";
const TOGGLE_KEY = "@rbgyanx_visual_guide_enabled";

export type GuideStep = {
  id: string;
  title: string;
  body: string;
  icon?: string;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "import-dvh",
    title: "1. Import composite DVH",
    body:
      "Copy rbGyanX composite .txt (PTV + OARs) to Downloads/rbGyaX_mobile_app_input/. Home → Import plan DVH → Refresh → select file → Continue to setup.",
    icon: "folder-open",
  },
  {
    id: "import-clinical",
    title: "2. Clinical xlsx (optional)",
    body:
      "On DVH import or plan setup, upload radiobiocalc_clinical_input.xlsx. Toggle “Apply covariates to calculation” to adjust NTCP (exploratory log-odds). TCP covariates are inactive when TCP is at ceiling.",
    icon: "upload-file",
  },
  {
    id: "prescription",
    title: "3. Prescription dose",
    body:
      "Total dose and fractions auto-fill from the DVH header (Prescribed dose / fx). TCI, V100 and CI use this prescription — not an arbitrary default.",
    icon: "medical-services",
  },
  {
    id: "physical-metrics",
    title: "4. Physical metrics",
    body:
      "Physical tab shows QUANTEC/RTOG Dxx and Vxx by technique (3DCRT, IMRT, VMAT, SBRT). CI (RTOG) requires BODY/external DVH; otherwise reported as N/A.",
    icon: "analytics",
  },
  {
    id: "models",
    title: "5. All TCP/NTCP models",
    body:
      "Biological tab lists every literature model for the selected structure. Composite reports include a per-structure model comparison table.",
    icon: "science",
  },
  {
    id: "composite-report",
    title: "6. Composite PDF report",
    body:
      "Export shows PTV TCP, composite NTCP (max OAR), TWI, per-OAR NTCP with covariate base→adjusted when enabled, and abbreviation notes.",
    icon: "picture-as-pdf",
  },
];

export async function isVisualGuideEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(TOGGLE_KEY);
  return v !== "false";
}

export async function setVisualGuideEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(TOGGLE_KEY, on ? "true" : "false");
}

export async function shouldShowGuideUpdateBanner(): Promise<boolean> {
  const seen = await AsyncStorage.getItem(SEEN_KEY);
  return seen !== GUIDE_CONTENT_VERSION;
}

export async function markGuideVersionSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, GUIDE_CONTENT_VERSION);
}

export function guideVersionLabel(): string {
  return `Guide v${GUIDE_CONTENT_VERSION} · App ${getAppVersion()}`;
}
