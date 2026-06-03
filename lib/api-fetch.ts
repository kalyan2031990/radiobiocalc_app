/**
 * Shared fetch for rbGyanX API — ngrok-friendly, no broken credentials on native.
 */

import { Platform } from "react-native";

export function apiFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "69420",
  };
  return headers;
}

export async function appFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(apiFetchHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }

  const useCredentials =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    url.startsWith(window.location.origin);

  return fetch(url, {
    ...init,
    headers,
    credentials: useCredentials ? init?.credentials ?? "include" : "omit",
  });
}
