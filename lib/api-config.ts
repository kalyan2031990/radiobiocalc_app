import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Resolve API base URL for web, iOS simulator, Android emulator, and physical devices.
 *
 * Set EXPO_PUBLIC_API_BASE_URL in .env (see .env.example).
 * Physical device: use your PC LAN IP, e.g. http://192.168.1.10:3000
 */
export function resolveApiBaseUrl(configured?: string): string {
  const fromEnv = (configured ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );

  // Local web dev: always hit API on same host (ignore LAN IP in .env)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
    if (fromEnv) {
      return fromEnv;
    }
    return `${protocol}//${hostname}:3000`;
  }

  if (fromEnv) {
    return fromEnv;
  }

  if (Platform.OS === "android") {
    // Android emulator -> host machine
    return "http://10.0.2.2:3000";
  }

  if (Platform.OS === "ios") {
    return "http://127.0.0.1:3000";
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return "http://127.0.0.1:3000";
}
