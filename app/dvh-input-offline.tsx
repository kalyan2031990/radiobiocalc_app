/**
 * Offline DVH import — Downloads folder only (no system file picker, no large TextInput).
 * Large pasted text in TextInput can crash Android/Hermes; use Download/rbgyanx_test instead.
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  InteractionManager,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCallback, useRef, useState } from "react";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import type { ListedDvhFile } from "@/lib/list-download-dvh";
import { getUserVersionLine, getVersionLine } from "@/lib/app-meta";
import { isClinicianMobileApk, showDeveloperTools } from "@/lib/clinician-build";
import { formatImportedPlanLabel } from "@/lib/user-facing-labels";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 0);
    });
  });
}

type ImportSummary = {
  fileLabel: string;
  structureCount: number;
  pointCount: number;
};

export default function DVHInputOfflineScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [downloadFiles, setDownloadFiles] = useState<ListedDvhFile[]>([]);
  const bundleRef = useRef<ParsedDvhBundle | null>(null);

  const finishImport = useCallback((data: ParsedDvhBundle, fileLabel: string) => {
    const { summarizeDvhBundle } =
      require("@/lib/parse-dvh-mobile") as typeof import("@/lib/parse-dvh-mobile");
    bundleRef.current = data;
    setReady(true);
    const stats = summarizeDvhBundle(data);
    setSummary({
      fileLabel: formatImportedPlanLabel(fileLabel),
      structureCount: stats.structureCount,
      pointCount: stats.pointCount,
    });
    setStatus(null);
  }, []);

  const runParse = useCallback(
    async (contents: string[], labels: string[]) => {
      const { parseDvhOnDevice, mergeDvhsOnDevice } =
        require("@/lib/parse-dvh-mobile") as typeof import("@/lib/parse-dvh-mobile");

      setLoading(true);
      setSummary(null);
      bundleRef.current = null;
      setReady(false);

      const parsed: ParsedDvhBundle[] = [];
      for (let i = 0; i < contents.length; i++) {
        setStatus(`Parsing ${labels[i] ?? "DVH"}…`);
        await yieldToUi();
        parsed.push(parseDvhOnDevice(contents[i], labels[i] ?? "dvh.txt"));
        await delay(16);
      }

      setStatus("Finalizing…");
      await yieldToUi();
      const data =
        parsed.length === 1 ? parsed[0] : mergeDvhsOnDevice(parsed);
      const fileLabel =
        labels.length === 1 ? labels[0] : `${labels.length} files: ${labels.join(", ")}`;
      finishImport(data, fileLabel);
    },
    [finishImport],
  );

  const requestStoragePermission = async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      if (Platform.Version >= 33) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);
      } else {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
      }
    } catch {
      /* optional */
    }
  };

  const refreshDownloadList = useCallback(async () => {
    try {
      setStatus("Scanning Downloads…");
      await requestStoragePermission();
      await yieldToUi();
      const { listDvhTxtInDownloads } = await import("@/lib/list-download-dvh");
      const files = await listDvhTxtInDownloads();
      setDownloadFiles(files);
      setStatus(null);
      if (files.length === 0) {
        Alert.alert(
          "No plan files found",
          "Copy PTV and OAR .txt files to your Downloads folder (USB, email, or cloud), then tap Refresh.",
        );
      }
    } catch (e) {
      setStatus(null);
      Alert.alert("Error", e instanceof Error ? e.message : "Could not list Downloads");
    }
  }, []);

  const handleBundledTest = async () => {
    if (!showDeveloperTools()) return;
    try {
      setLoading(true);
      const { BUNDLED_KASTOORI_PTV70_SAMPLE } = await import("@/lib/bundled-test-dvh");
      await runParse([BUNDLED_KASTOORI_PTV70_SAMPLE], ["bundled_KASTOORI_PTV70.txt"]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Parse failed";
      Alert.alert("Bundled test failed", msg);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handleLoadKastooriPair = async () => {
    if (!showDeveloperTools()) return;
    try {
      setLoading(true);
      const { KASTOORI_PAIR_PATHS } = await import("@/lib/known-download-dvh");
      const { contents, labels } = await readPaths(KASTOORI_PAIR_PATHS);
      await runParse(contents, labels);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Load failed";
      Alert.alert(
        "Could not load test files",
        `${msg}\n\nCopy PTV and OAR .txt files to Download/rbgyanx_test/ on this device.`,
      );
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const readPaths = async (paths: readonly string[]): Promise<{ contents: string[]; labels: string[] }> => {
    const { readDeviceFilePath } = await import("@/lib/read-document-content");
    const contents: string[] = [];
    const labels: string[] = [];
    for (const path of paths) {
      setStatus(`Reading ${path.split("/").pop() ?? "file"}…`);
      await yieldToUi();
      const text = await readDeviceFilePath(path);
      if (text.trim().length < 50) {
        throw new Error(`File empty or unreadable: ${path}`);
      }
      contents.push(text);
      labels.push(path.split("/").pop() ?? "dvh.txt");
    }
    return { contents, labels };
  };

  const handleOpenDownloadFile = async (file: ListedDvhFile) => {
    try {
      setLoading(true);
      setStatus(`Reading ${file.name}…`);
      const { readDeviceFilePath } = await import("@/lib/read-document-content");
      await yieldToUi();
      const content = await readDeviceFilePath(file.uri);
      await runParse([content], [file.name]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Read failed";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handlePickDvhFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "application/octet-stream", "*/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setLoading(true);
      const { readDocumentContent } = await import("@/lib/read-document-content");
      const contents: string[] = [];
      const labels: string[] = [];
      for (const asset of result.assets) {
        if (!/\.txt$/i.test(asset.name ?? "")) continue;
        setStatus(`Reading ${asset.name ?? "file"}…`);
        await yieldToUi();
        const text = await readDocumentContent(asset);
        if (text.trim().length < 50) {
          throw new Error(`File empty or unreadable: ${asset.name ?? "file"}`);
        }
        contents.push(text);
        labels.push(asset.name ?? "dvh.txt");
      }
      if (contents.length === 0) {
        Alert.alert("No plan files", "Select PTV and OAR .txt exports.");
        return;
      }
      await runParse(contents, labels);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not read files");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handleMergeAllListed = async () => {
    if (downloadFiles.length < 2) {
      Alert.alert(
        "Need PTV and OAR files",
        "Copy both .txt exports to Downloads, tap Refresh, then use Import combined plan.",
      );
      return;
    }
    try {
      setLoading(true);
      const contents: string[] = [];
      const labels: string[] = [];
      const { readDeviceFilePath } = await import("@/lib/read-document-content");
      for (const file of downloadFiles) {
        setStatus(`Reading ${file.name}…`);
        await yieldToUi();
        const text = await readDeviceFilePath(file.uri);
        if (text.trim().length < 50) {
          throw new Error(`File empty or unreadable: ${file.name}`);
        }
        contents.push(text);
        labels.push(file.name);
      }
      await runParse(contents, labels);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Merge failed");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handleProceed = async () => {
    const dvhData = bundleRef.current;
    if (!dvhData) {
      Alert.alert("Error", "Load a DVH first");
      return;
    }
    try {
      setStatus("Saving…");
      await yieldToUi();
      const { saveDvhSession } = await import("@/lib/dvh-session");
      const clientSessionId = await saveDvhSession(dvhData);
      router.push({
        pathname: "/calculation-setup",
        params: {
          dvhSessionId: clientSessionId,
          fileName: summary?.fileLabel ?? "",
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not save DVH session";
      Alert.alert("Error", msg);
    } finally {
      setStatus(null);
    }
  };

  const handleUploadClinicalXlsx = async () => {
    try {
      setLoading(true);
      setStatus("Reading clinical xlsx…");
      const pick = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });
      if (pick.canceled || !pick.assets?.[0]) return;
      const asset = pick.assets[0];
      const { readDocumentBytes } = await import("@/lib/read-document-bytes");
      const bytes = await readDocumentBytes(asset);
      const { saveUploadedClinicalXlsx } = await import("@/lib/clinical-data-service");
      await saveUploadedClinicalXlsx(asset.name ?? "clinical.xlsx", bytes);
      Alert.alert(
        "Clinical data imported",
        `${asset.name} saved. Link patient rows in plan setup; enable covariates to adjust NTCP.`,
      );
    } catch (e) {
      Alert.alert("Import failed", e instanceof Error ? e.message : "Could not read xlsx");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View style={{ gap: 16, paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>
              Back
            </Text>
          </Pressable>

          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {isClinicianMobileApk() ? getUserVersionLine() : getVersionLine()}
          </Text>

          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>
            Import plan DVH
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            Copy composite DVH .txt (or separate PTV + OAR files) to{" "}
            <Text style={{ fontWeight: "600" }}>Downloads</Text> or{" "}
            <Text style={{ fontWeight: "600" }}>Downloads/rbGyaX_mobile_app_input</Text>,
            refresh the list, then tap one composite file or{" "}
            <Text style={{ fontWeight: "600" }}>Import combined plan</Text>.
            If the list is empty, use <Text style={{ fontWeight: "600" }}>Pick DVH files</Text>.
          </Text>

          <Pressable
            onPress={handlePickDvhFiles}
            disabled={loading}
            accessibilityLabel="Pick DVH files"
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Pick DVH files (PTV + OAR)</Text>
          </Pressable>

          <Pressable
            onPress={handleUploadClinicalXlsx}
            disabled={loading}
            style={{
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              Import clinical xlsx (optional)
            </Text>
          </Pressable>

          {loading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted }}>{status ?? "Working…"}</Text>
            </View>
          )}

          {summary && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.primary + "40",
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>{summary.fileLabel}</Text>
              <Text style={{ color: colors.primary, marginTop: 4 }}>
                {summary.structureCount} structure(s) · {summary.pointCount} points
              </Text>
            </View>
          )}

          {showDeveloperTools() && (
            <>
              <Pressable
                onPress={handleBundledTest}
                disabled={loading}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Test: bundled sample (dev)
                </Text>
              </Pressable>
              <Pressable
                onPress={handleLoadKastooriPair}
                disabled={loading}
                style={{
                  borderWidth: 1,
                  borderColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: loading ? 0.6 : 1,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  Load test PTV + OAR pair (dev)
                </Text>
              </Pressable>
            </>
          )}

          <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 8 }}>
            Files in Downloads
          </Text>
          <Pressable
            onPress={refreshDownloadList}
            disabled={loading}
            style={{
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Refresh Downloads list</Text>
          </Pressable>
          {downloadFiles.length >= 2 && (
            <Pressable
              onPress={handleMergeAllListed}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Import combined plan ({downloadFiles.length} files)
              </Text>
            </Pressable>
          )}
          {downloadFiles.length === 0 && !loading && (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              No plan files found. Copy PTV and OAR .txt files to Downloads.
            </Text>
          )}
          {downloadFiles.map((f) => (
            <Pressable
              key={f.uri}
              onPress={() => handleOpenDownloadFile(f)}
              disabled={loading}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground }}>{f.name}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={handleProceed}
            disabled={!ready || loading}
            style={{
              backgroundColor: ready ? colors.primary : colors.muted,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: ready && !loading ? 1 : 0.5,
              marginTop: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Continue to setup
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
