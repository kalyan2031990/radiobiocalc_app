// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

/** Apple/Google-safe IDs (alphanumeric, dots, hyphens only — no underscores). */
const bundleId = "com.rbgyanx.radiobiocalc";
const schemeFromBundleId = "rbgyanx";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "rbGyanX Radiobiocalc",
  appSlug: "rbgyanx-radiobiocalc",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "/assets/images/icon.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const isOfflineBuild = process.env.EXPO_PUBLIC_OFFLINE_BUILD === "1";
const isPilotBuild =
  !isOfflineBuild && process.env.EXPO_PUBLIC_PILOT_BUILD === "1";

const config: ExpoConfig = {
  name: isOfflineBuild
    ? "rbGyanX Mobile"
    : isPilotBuild
      ? "rbGyanX Pilot"
      : env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  extra: {
    buildNumber: 15,
    offlineBuild: isOfflineBuild,
    pilotBuild: isPilotBuild,
    eas: {
      projectId: "18c44a97-154f-45ec-93d4-a38b115fe196",
    },
  },
  description: "Knowledge-guided clinical decision support system (CDSS) framework for radiation oncology. Calculates TCP/NTCP, BED, EQD2, EUD using traditional radiobiological models with QUANTEC/RTOG parameters. Supports single-patient and cohort outcome evaluation. Privacy-first with offline-capable calculations.",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    versionCode: 15,
    adaptiveIcon: {
      backgroundColor: "#E8EEF4",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#E8EEF4",
        dark: {
          backgroundColor: "#1A2332",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a", "x86_64"],
          usesCleartextTraffic: isPilotBuild,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;
