/**
 * Persist composite plan evaluation (therapeutic window, UTCP, plan indices).
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";

const PREFIX = "rbgyanx_plan_eval:";

export async function savePlanEvalSession(
  evaluation: CompositePlanEvaluation,
): Promise<string> {
  const id = `pe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const json = JSON.stringify(evaluation);
  const key = PREFIX + id;

  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, json);
    return id;
  }

  await AsyncStorage.setItem(key, json);
  return id;
}

export async function loadPlanEvalSession(
  sessionId: string,
): Promise<CompositePlanEvaluation | null> {
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
    return JSON.parse(json) as CompositePlanEvaluation;
  } catch {
    return null;
  }
}
