/**
 * Optional external rbgyanx_test_data path (never commit local paths).
 * Set RBGYANX_TEST_DATA to your checkout of anonymised test DVH files.
 */
import fs from "fs";

export function getRbgyanxTestDataRoot(): string | null {
  const root = process.env.RBGYANX_TEST_DATA?.trim();
  if (!root) return null;
  if (!fs.existsSync(root)) {
    console.warn(`RBGYANX_TEST_DATA not found: ${root}`);
    return null;
  }
  return root;
}
