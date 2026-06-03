/**
 * Persist parsed DVH bundles between screens without stuffing URL query params.
 * Web uses sessionStorage; native uses AsyncStorage.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";

const PREFIX = "rbgyanx_dvh:";

export async function saveDvhSession(bundle: ParsedDvhBundle): Promise<string> {
  const id = `dvh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const json = JSON.stringify(bundle);
  const key = PREFIX + id;

  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, json);
    return id;
  }

  await AsyncStorage.setItem(key, json);
  return id;
}

export async function loadDvhSession(
  sessionId: string,
): Promise<ParsedDvhBundle | null> {
  if (!sessionId) return null;
  const key = PREFIX + sessionId;

  let json: string | null = null;
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    json = sessionStorage.getItem(key);
  } else {
    json = await AsyncStorage.getItem(key);
  }

  if (!json) return null;
  try {
    return JSON.parse(json) as ParsedDvhBundle;
  } catch {
    return null;
  }
}
