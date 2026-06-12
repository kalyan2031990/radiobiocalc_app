/**
 * External test DVH folders (never commit local paths).
 * Priority: RBGYANX_TEST_DATA → INPUT_FOLDERS → default user path.
 */
import fs from "fs";
import os from "os";
import path from "path";

const DEFAULT_INPUT =
  process.platform === "win32"
    ? path.join(os.homedir(), "OneDrive", "Desktop", "input_folders", "radbiocalc_input")
    : null;

export function getRadbiocalcInputRoot(): string | null {
  const env = process.env.INPUT_FOLDERS?.trim();
  if (env && fs.existsSync(env)) return env;
  if (DEFAULT_INPUT && fs.existsSync(DEFAULT_INPUT)) return DEFAULT_INPUT;
  const legacy = path.join(os.homedir(), "OneDrive", "Desktop", "input_folders");
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

export function getInputFoldersRoot(): string | null {
  return getRadbiocalcInputRoot();
}

/** @deprecated use getInputFoldersRoot */
export function getRbgyanxTestDataRoot(): string | null {
  const root = getInputFoldersRoot();
  if (!root) return null;
  const nested = path.join(root, "rbgyanx_test_data");
  return fs.existsSync(nested) ? nested : root;
}
