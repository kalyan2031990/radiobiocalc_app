/**
 * Read picked document text on web and native (Android content:// / file://).
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export async function readDocumentContent(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<string> {
  const webFile = (asset as DocumentPicker.DocumentPickerAsset & { file?: File })
    .file;
  if (Platform.OS === "web" && webFile instanceof File) {
    return webFile.text();
  }

  const uri = asset.uri;
  if (!uri) {
    throw new Error("No file URI from document picker");
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error("File not found after pick (try again)");
    }
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (fsErr) {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Could not read file (HTTP ${response.status})`);
      }
      return await response.text();
    } catch {
      const msg = fsErr instanceof Error ? fsErr.message : "Could not read file";
      throw new Error(msg);
    }
  }
}
