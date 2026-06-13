/**
 * Save generated reports to on-device storage (no export server).
 * On web/desktop: triggers browser download to Downloads folder.
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

function isWebBrowser(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

/** Trigger a file download in the desktop browser. */
export function downloadBlobWeb(
  filename: string,
  data: BlobPart,
  mimeType: string,
): SavedReportFile {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { uri: url, filename };
}

export function downloadBase64Web(
  filename: string,
  base64: string,
  mimeType: string,
): SavedReportFile {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return downloadBlobWeb(filename, bytes, mimeType);
}

export function downloadTextWeb(filename: string, content: string, mimeType: string): SavedReportFile {
  return downloadBlobWeb(filename, content, mimeType);
}

/** Open print dialog for HTML report (Save as PDF in browser). */
export function printHtmlReportWeb(html: string): boolean {
  if (!isWebBrowser()) return false;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  window.setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  }, 1500);
  return true;
}

export async function saveTextReport(
  filename: string,
  content: string,
  encoding: "utf8" | "base64" = "utf8",
): Promise<SavedReportFile> {
  if (isWebBrowser() && encoding === "utf8") {
    const mime = filename.endsWith(".html")
      ? "text/html;charset=utf-8"
      : "text/plain;charset=utf-8";
    return downloadTextWeb(filename, content, mime);
  }

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
  if (isWebBrowser()) {
    return downloadBase64Web(
      filename,
      base64,
      filename.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  }
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
  const folder =
    Platform.OS === "web"
      ? "your browser Downloads folder"
      : "App storage → reports/";
  if (Platform.OS === "web") {
    Alert.alert(
      `${kind} downloaded`,
      `${file.filename}\n\nCheck ${folder}. For PDF on desktop, use Print → Save as PDF if the print dialog opened.`,
    );
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
