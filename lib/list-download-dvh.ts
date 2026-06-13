/**
 * List .txt DVH files in Download and app-accessible inbox folders.
 */

import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";

export type ListedDvhFile = { name: string; uri: string };

function androidPackage(): string {
  return (
    Constants.expoConfig?.android?.package ??
    (Constants.manifest2 as { extra?: { expoClient?: { android?: { package?: string } } } })?.extra
      ?.expoClient?.android?.package ??
    "com.rbgyanx.radiobiocalc"
  );
}

function downloadRoots(): string[] {
  const pkg = androidPackage();
  const roots = [
    "file:///storage/emulated/0/Download/",
    "file:///storage/emulated/0/Download/rbgyanx_test/",
    "file:///storage/emulated/0/Download/rbGyaX_mobile_app_input/",
    "file:///sdcard/Download/",
    "file:///sdcard/Download/rbgyanx_test/",
    "file:///sdcard/Download/rbGyaX_mobile_app_input/",
    `file:///storage/emulated/0/Android/data/${pkg}/files/rbgyanx_inbox/`,
    `file:///storage/emulated/0/Android/data/${pkg}/files/`,
  ];
  if (FileSystem.documentDirectory) {
    roots.push(`${FileSystem.documentDirectory}rbgyanx_inbox/`);
  }
  return roots;
}

export async function listDvhTxtInDownloads(): Promise<ListedDvhFile[]> {
  const found: ListedDvhFile[] = [];
  const seen = new Set<string>();

  for (const root of downloadRoots()) {
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
