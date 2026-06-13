/**
 * Read picked document bytes (xlsx) on web and native.
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

function safeCacheName(raw: string): string {
  return raw.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "clinical.xlsx";
}

async function copyToCache(uri: string, name: string): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("App cache directory unavailable");
  const dest = `${cacheDir}clinical_${Date.now()}_${safeCacheName(name)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not read file (${response.status})`);
  return response.arrayBuffer();
}

export async function readDocumentBytes(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<ArrayBuffer> {
  const webFile = (asset as DocumentPicker.DocumentPickerAsset & { file?: Blob }).file;
  if (Platform.OS === "web" && webFile instanceof Blob) {
    return webFile.arrayBuffer();
  }

  const rawUri = asset.uri;
  if (!rawUri) throw new Error("No file URI from document picker");

  const isFileUri = rawUri.startsWith("file://") || rawUri.startsWith("/");
  let readUri = isFileUri
    ? rawUri.startsWith("/")
      ? `file://${rawUri}`
      : rawUri
    : rawUri;

  if (!isFileUri) {
    readUri = await copyToCache(rawUri, asset.name ?? "clinical.xlsx");
  }

  try {
    return await uriToArrayBuffer(readUri);
  } catch (firstErr) {
    if (isFileUri) {
      try {
        const copied = await copyToCache(rawUri, asset.name ?? "clinical.xlsx");
        return await uriToArrayBuffer(copied);
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
