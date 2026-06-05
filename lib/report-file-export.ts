/**
 * Save generated reports to on-device storage (no export server).
 */

import { Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;

async function ensureReportsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(REPORTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
  }
}

export type SavedReportFile = {
  uri: string;
  filename: string;
};

export async function saveTextReport(
  filename: string,
  content: string,
  encoding: "utf8" | "base64" = "utf8",
): Promise<SavedReportFile> {
  await ensureReportsDir();
  const uri = `${REPORTS_DIR}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding:
      encoding === "base64"
        ? FileSystem.EncodingType.Base64
        : FileSystem.EncodingType.UTF8,
  });
  return { uri, filename };
}

export async function saveBytesReport(
  filename: string,
  base64: string,
): Promise<SavedReportFile> {
  return saveTextReport(filename, base64, "base64");
}

/** Copy a temp file (e.g. from expo-print) into persistent app reports folder. */
export async function persistReportFile(
  tempUri: string,
  filename: string,
): Promise<SavedReportFile> {
  await ensureReportsDir();
  const dest = `${REPORTS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return { uri: dest, filename };
}

export async function shareSavedReport(
  file: SavedReportFile,
  mimeType: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: file.filename,
    UTI: mimeType,
  });
}

export function notifyReportSaved(file: SavedReportFile, kind: string): void {
  const folder = "App storage → reports/";
  if (Platform.OS === "web") {
    Alert.alert(`${kind} saved`, file.filename);
    return;
  }
  Alert.alert(
    `${kind} saved on device`,
    `${file.filename}\n\nStored in ${folder} You can open it from Files or share to Drive/WhatsApp.`,
    [
      { text: "OK", style: "default" },
      {
        text: "Share",
        onPress: () => {
          void shareSavedReport(
            file,
            kind === "PDF"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
        },
      },
    ],
  );
}
