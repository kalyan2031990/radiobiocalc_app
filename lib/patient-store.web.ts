/**
 * Web patient case store — sessionStorage (no expo-sqlite / WASM on desktop browser).
 */

import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import type { PatientCase } from "@/lib/patient-store.types";

export type { PatientCase } from "@/lib/patient-store.types";

const INDEX_KEY = "rbgyanx:patient_cases:index";
const caseKey = (id: string) => `rbgyanx:patient_cases:${id}`;

function readIndex(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export async function savePatientCase(
  pseudonymId: string,
  planLabel: string,
  bundle: ParsedDvhBundle,
): Promise<string> {
  const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: PatientCase = {
    id,
    pseudonymId,
    planLabel,
    createdAt: new Date().toISOString(),
    bundle,
  };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(caseKey(id), JSON.stringify(record));
    const ids = readIndex();
    writeIndex([id, ...ids.filter((x) => x !== id)]);
  }
  return id;
}

export async function listPatientCases(): Promise<PatientCase[]> {
  const ids = readIndex();
  const out: PatientCase[] = [];
  if (typeof sessionStorage === "undefined") return out;
  for (const id of ids) {
    const raw = sessionStorage.getItem(caseKey(id));
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as PatientCase);
    } catch {
      /* skip corrupt entry */
    }
  }
  return out;
}

export async function deletePatientCase(id: string): Promise<void> {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(caseKey(id));
    writeIndex(readIndex().filter((x) => x !== id));
  }
}

export async function loadPatientCase(id: string): Promise<PatientCase | null> {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(caseKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PatientCase;
  } catch {
    return null;
  }
}
