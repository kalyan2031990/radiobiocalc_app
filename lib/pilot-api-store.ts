/**
 * Pilot builds: override API base URL without rebuilding the APK.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const PILOT_API_STORAGE_KEY = "@rbgyanx_pilot_api_url";

let cachedOverride: string | null = null;

export function normalizeApiBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
}

export function getPilotApiOverride(): string | null {
  return cachedOverride;
}

export async function loadPilotApiOverride(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(PILOT_API_STORAGE_KEY);
    cachedOverride = stored ? normalizeApiBaseUrl(stored) : null;
  } catch {
    cachedOverride = null;
  }
  return cachedOverride;
}

export async function setPilotApiOverride(raw: string | null): Promise<void> {
  if (!raw?.trim()) {
    cachedOverride = null;
    await AsyncStorage.removeItem(PILOT_API_STORAGE_KEY);
    return;
  }
  cachedOverride = normalizeApiBaseUrl(raw);
  await AsyncStorage.setItem(PILOT_API_STORAGE_KEY, cachedOverride);
}

export async function testPilotApiConnection(baseUrl: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const url = normalizeApiBaseUrl(baseUrl);
  if (!url) {
    return { ok: false, message: "Enter a server address (e.g. http://192.168.1.10:3000)" };
  }
  try {
    const res = await fetch(`${url}/api/health`, { method: "GET" });
    if (!res.ok) {
      return { ok: false, message: `Server returned HTTP ${res.status}` };
    }
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return {
      ok: body?.ok === true,
      message: body?.ok === true ? "rbGyanX API is running" : "Unexpected health response",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Cannot reach server",
    };
  }
}
