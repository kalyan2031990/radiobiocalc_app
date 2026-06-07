/**
 * List .txt DVH files in common Download folders (no document picker).
 */

import * as FileSystem from "expo-file-system/legacy";

export type ListedDvhFile = { name: string; uri: string };

const DOWNLOAD_ROOTS = [
  "file:///storage/emulated/0/Download/",
  "file:///storage/emulated/0/Download/rbgyanx_test/",
  "file:///sdcard/Download/",
  "file:///sdcard/Download/rbgyanx_test/",
];

export async function listDvhTxtInDownloads(): Promise<ListedDvhFile[]> {
  const found: ListedDvhFile[] = [];
  const seen = new Set<string>();

  for (const root of DOWNLOAD_ROOTS) {
    try {
      const info = await FileSystem.getInfoAsync(root);
      if (!info.exists) continue;
      const entries = await FileSystem.readDirectoryAsync(root);
      for (const name of entries) {
        if (!/\.txt$/i.test(name)) continue;
        const uri = root.endsWith("/") ? `${root}${name}` : `${root}/${name}`;
        if (seen.has(uri)) continue;
        seen.add(uri);
        found.push({ name, uri });
      }
    } catch {
      /* folder not readable */
    }
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}
