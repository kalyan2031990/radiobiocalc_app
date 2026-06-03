// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
const bundleId = "space.manus.radiobiocalc_app.t20260101235427";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

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
  version: "2.1.0",
  extra: {
    offlineBuild: isOfflineBuild,
    pilotBuild: isPilotBuild,
    eas: {
      projectId: "956761c0-431c-4624-bbed-6381ab7e4516",
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
  },
  android: {
    versionCode: 6,
    /** Pilot LAN API uses http:// — required for phone → PC on Wi‑Fi */
    usesCleartextTraffic: true,
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
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
