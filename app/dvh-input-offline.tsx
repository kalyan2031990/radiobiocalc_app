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
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCallback, useRef, useState } from "react";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import type { ListedDvhFile } from "@/lib/list-download-dvh";
import { getVersionLine } from "@/lib/app-meta";
import { KASTOORI_PAIR_PATHS } from "@/lib/known-download-dvh";
import { BUNDLED_KASTOORI_PTV70_SAMPLE } from "@/lib/bundled-test-dvh";

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
      fileLabel,
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
    if (Platform.OS !== "android" || Platform.Version >= 33) return;
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
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
          "No .txt in Downloads",
          "Copy Eclipse DVH .txt files to Download/rbgyanx_test on this device (USB, cloud, or email → Save), then tap Refresh.",
        );
      }
    } catch (e) {
      setStatus(null);
      Alert.alert("Error", e instanceof Error ? e.message : "Could not list Downloads");
    }
  }, []);

  const handleBundledTest = async () => {
    try {
      setLoading(true);
      await runParse([BUNDLED_KASTOORI_PTV70_SAMPLE], ["bundled_KASTOORI_PTV70.txt"]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Parse failed";
      Alert.alert("Bundled test failed", msg);
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

  const handleLoadKastooriPair = async () => {
    try {
      setLoading(true);
      const { contents, labels } = await readPaths(KASTOORI_PAIR_PATHS);
      await runParse(contents, labels);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Load failed";
      Alert.alert(
        "Could not load Kastoori test files",
        `${msg}\n\nCopy KASTOORI_PTV70.txt and KASTOORI_COM_PRTD.txt to Download/rbgyanx_test/ on this device.`,
      );
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

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View style={{ gap: 16, paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>
              Back
            </Text>
          </Pressable>

          <Text style={{ color: colors.muted, fontSize: 12 }}>{getVersionLine()}</Text>

          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>
            Import plan DVH
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            Varian Eclipse .txt only. Copy files to{" "}
            <Text style={{ fontWeight: "600" }}>Download/rbgyanx_test</Text> on this device,
            then tap a file below. Do not use the Android system file picker — it crashes on many
            devices.
          </Text>

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
              Test: parse bundled KASTOORI sample
            </Text>
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8 }}>
            No file picker or Downloads — verifies parser only.
          </Text>

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
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Load Kastoori PTV + OAR from Downloads
            </Text>
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8 }}>
            Requires both files in Download/rbgyanx_test/
          </Text>

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
          {downloadFiles.length === 0 && !loading && (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              No .txt found. Copy Eclipse exports to Download or Download/rbgyanx_test.
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
