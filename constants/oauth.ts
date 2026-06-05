import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import { resolveApiBaseUrl } from "@/lib/api-config";
import { getPilotApiOverride } from "@/lib/pilot-api-store";
import { isOfflineBuild } from "@/lib/offline-mode";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.radiobiocalc_app.t20260101235427";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
/**
 * API base URL. Offline/mobile builds use network only for PDF/DOCX export —
 * set via Home → Report export server (stored override). No default LAN IP.
 */
/** Absolute URL for tRPC only — native fetch rejects relative paths like `/api/trpc`. */
export const OFFLINE_TRPC_STUB = "http://127.0.0.1:9";

export function getApiBaseUrl(): string {
  const override = getPilotApiOverride();
  if (override) return override;
  if (isOfflineBuild()) return "";
  return resolveApiBaseUrl(API_BASE_URL);
}

export function getTrpcHttpUrl(): string {
  try {
    const base = getApiBaseUrl();
    if (base) return `${base.replace(/\/$/, "")}/api/trpc`;
    if (isOfflineBuild()) return `${OFFLINE_TRPC_STUB}/api/trpc`;
    const resolved = resolveApiBaseUrl(API_BASE_URL).replace(/\/$/, "");
    if (resolved) return `${resolved}/api/trpc`;
  } catch {
    /* use stub below */
  }
  return `${OFFLINE_TRPC_STUB}/api/trpc`;
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

export const getLoginUrl = () => {
  let redirectUri: string;

  if (ReactNative.Platform.OS === "web") {
    // Web platform: redirect to API server callback (not Metro bundler)
    // The API server will then redirect back to the frontend with the session token
    redirectUri = `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    // Native platform: use deep link scheme for mobile OAuth callback
    // This allows the OS to redirect back to the app after authentication
    redirectUri = Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }

  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
