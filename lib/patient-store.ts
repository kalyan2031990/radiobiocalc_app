/**
 * Encrypted local patient case store (SQLite). Survives app restarts.
 */

import * as SQLite from "expo-sqlite";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";

const DB_NAME = "rbgyanx_cases.db";

export type PatientCase = {
  id: string;
  pseudonymId: string;
  planLabel: string;
  createdAt: string;
  bundle: ParsedDvhBundle;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS patient_cases (
      id TEXT PRIMARY KEY NOT NULL,
      pseudonym_id TEXT NOT NULL,
      plan_label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      bundle_json TEXT NOT NULL
    );
  `);
  return db;
}

export async function savePatientCase(
  pseudonymId: string,
  planLabel: string,
  bundle: ParsedDvhBundle,
): Promise<string> {
  const db = await getDb();
  const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    `INSERT INTO patient_cases (id, pseudonym_id, plan_label, created_at, bundle_json) VALUES (?, ?, ?, ?, ?)`,
    id,
    pseudonymId,
    planLabel,
    new Date().toISOString(),
    JSON.stringify(bundle),
  );
  return id;
}

export async function listPatientCases(): Promise<PatientCase[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    pseudonym_id: string;
    plan_label: string;
    created_at: string;
    bundle_json: string;
  }>(`SELECT id, pseudonym_id, plan_label, created_at, bundle_json FROM patient_cases ORDER BY created_at DESC`);
  return rows.map((r) => ({
    id: r.id,
    pseudonymId: r.pseudonym_id,
    planLabel: r.plan_label,
    createdAt: r.created_at,
    bundle: JSON.parse(r.bundle_json) as ParsedDvhBundle,
  }));
}

export async function deletePatientCase(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM patient_cases WHERE id = ?`, id);
}

export async function loadPatientCase(id: string): Promise<PatientCase | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    pseudonym_id: string;
    plan_label: string;
    created_at: string;
    bundle_json: string;
  }>(`SELECT id, pseudonym_id, plan_label, created_at, bundle_json FROM patient_cases WHERE id = ?`, id);
  if (!row) return null;
  return {
    id: row.id,
    pseudonymId: row.pseudonym_id,
    planLabel: row.plan_label,
    createdAt: row.created_at,
    bundle: JSON.parse(row.bundle_json) as ParsedDvhBundle,
  };
}
