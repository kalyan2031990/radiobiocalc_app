/**
 * Read picked document text on web and native (Android content:// / file://).
 * Legacy expo-file-system only — the new File() API can native-crash on some devices.
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

function safeCacheName(raw: string): string {
  return raw.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "dvh.txt";
}

async function readUtf8(path: string): Promise<string> {
  return FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function copyToCache(uri: string, name: string): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("App cache directory unavailable");
  const dest = `${cacheDir}dvh_${Date.now()}_${safeCacheName(name)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/** Read a file already on device storage (e.g. /sdcard/Download/...). */
export async function readDeviceFilePath(path: string): Promise<string> {
  const normalized = path.startsWith("file://") ? path : `file://${path}`;
  try {
    return await readUtf8(normalized);
  } catch {
    const copied = await copyToCache(normalized, path.split("/").pop() ?? "dvh.txt");
    return readUtf8(copied);
  }
}

export async function readDocumentContent(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<string> {
  const webFile = (asset as DocumentPicker.DocumentPickerAsset & { file?: Blob }).file;
  if (Platform.OS === "web" && webFile instanceof Blob) {
    return webFile.text();
  }

  const rawUri = asset.uri;
  if (!rawUri) throw new Error("No file URI from document picker");

  const isFileUri = rawUri.startsWith("file://") || rawUri.startsWith("/");
  const readUri = isFileUri
    ? rawUri.startsWith("/")
      ? `file://${rawUri}`
      : rawUri
    : await copyToCache(rawUri, asset.name ?? "import.txt");

  try {
    return await readUtf8(readUri);
  } catch (firstErr) {
    if (isFileUri) {
      try {
        const copied = await copyToCache(rawUri, asset.name ?? "import.txt");
        return await readUtf8(copied);
      } catch {
        /* fall through */
      }
    }
    const msg = firstErr instanceof Error ? firstErr.message : "Could not read file";
    throw new Error(
      `Could not read ${asset.name ?? "file"}. Copy it to Downloads and try again.\n\n${msg}`,
    );
  }
}
