/**
 * Email/password auth — file-backed when DATABASE_URL is unset (local/dev).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const STORE_PATH = path.join(process.cwd(), "server", "data", "email-users.json");

type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type Store = { users: StoredUser[] };

function readStore(): Store {
  try {
    if (!fs.existsSync(STORE_PATH)) return { users: [] };
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Store;
  } catch {
    return { users: [] };
  }
}

function writeStore(store: Store): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function hashPassword(password: string, salt: Buffer): Promise<string> {
  const key = await scrypt(password, salt, 64);
  return key.toString("hex");
}

export async function registerEmailUser(
  email: string,
  password: string,
  name: string,
): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  const store = readStore();
  if (store.users.some((u) => u.email === normalized)) {
    return { success: false, error: "Email already registered" };
  }
  const salt = crypto.randomBytes(16);
  const passwordHash = await hashPassword(password, salt);
  const user: StoredUser = {
    id: `usr_${Date.now()}`,
    email: normalized,
    name: name.trim(),
    passwordHash,
    salt: salt.toString("hex"),
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);
  return { success: true, userId: user.id };
}

export async function loginEmailUser(
  email: string,
  password: string,
): Promise<
  | { success: true; userId: string; name: string; email: string }
  | { success: false; error: string }
> {
  const normalized = email.trim().toLowerCase();
  const store = readStore();
  const user = store.users.find((u) => u.email === normalized);
  if (!user) return { success: false, error: "Invalid email or password" };
  const salt = Buffer.from(user.salt, "hex");
  const hash = await hashPassword(password, salt);
  if (hash !== user.passwordHash) {
    return { success: false, error: "Invalid email or password" };
  }
  return {
    success: true,
    userId: user.id,
    name: user.name,
    email: user.email,
  };
}
