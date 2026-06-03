/**
 * DVH Input Screen — pick CSV/TXT and parse via API
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import { saveDvhSession } from "@/lib/dvh-session";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";
import { mergeDvhBundles } from "@/lib/merge-dvh-bundle";
import { analyzePlanScope } from "@/lib/plan-scope";
import { isOfflineBuild } from "@/lib/offline-mode";
import { offlineMergeDvhs, offlineParseDvh } from "@/lib/offline-engine";

async function readDocumentContent(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<string> {
  const webFile = (asset as DocumentPicker.DocumentPickerAsset & { file?: File })
    .file;
  if (Platform.OS === "web" && webFile instanceof File) {
    return webFile.text();
  }
  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error(`Could not read file (HTTP ${response.status})`);
  }
  return response.text();
}

export default function DVHInputScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string } | null>(null);
  const [dvhData, setDVHData] = useState<ParsedDvhBundle | null>(null);
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);

  const parseMutation = trpc.radiobiology.parseCSV.useMutation();
  const mergeSessionsMutation = trpc.radiobiology.mergeDvhSessions.useMutation();

  const handleSelectFile = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (pick.canceled || !pick.assets?.length) {
        return;
      }

      const assets = pick.assets;
      setLoading(true);
      setSelectedFile({
        name:
          assets.length === 1
            ? assets[0].name
            : `${assets.length} files (composite plan)`,
      });
      setDVHData(null);
      setServerSessionId(null);

      const parsedBundles: ParsedDvhBundle[] = [];
      const sessionIds: string[] = [];
      const fileNames: string[] = [];

      for (const asset of assets) {
        const content = await readDocumentContent(asset);
        if (isOfflineBuild()) {
          parsedBundles.push(offlineParseDvh(content, asset.name));
        } else {
          const result = await parseMutation.mutateAsync({
            content,
            fileName: asset.name,
          });

          if (!result.success || !result.data) {
            Alert.alert("Parse error", result.error ?? `Could not parse ${asset.name}`);
            return;
          }

          parsedBundles.push(result.data as ParsedDvhBundle);
          if ("sessionId" in result && typeof result.sessionId === "string") {
            sessionIds.push(result.sessionId);
          }
        }
        fileNames.push(asset.name);
      }

      let data =
        parsedBundles.length === 1
          ? parsedBundles[0]
          : isOfflineBuild()
            ? offlineMergeDvhs(parsedBundles)
            : mergeDvhBundles(parsedBundles, fileNames);

      let serverId: string | null = null;
      if (!isOfflineBuild()) {
        if (sessionIds.length > 1) {
          const merged = await mergeSessionsMutation.mutateAsync({
            sessionIds,
          });
          if (merged.success && merged.data) {
            data = merged.data as ParsedDvhBundle;
            serverId = merged.sessionId ?? null;
          }
        } else if (sessionIds.length === 1) {
          serverId = sessionIds[0];
        }
      }

      setDVHData(data);
      setServerSessionId(serverId);

      const scope = analyzePlanScope(data);
      if (scope.therapeuticWindowEligible) {
        Alert.alert(
          "Composite plan detected",
          `${scope.structureCount} structures (target + OAR). Therapeutic window and plan indices are available after setup.`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      Alert.alert(
        "Error",
        isOfflineBuild()
          ? `Failed to parse DVH on device.\n\n${msg}`
          : `Failed to load DVH. Is the API running at ${getApiBaseUrl()}?\n\n${msg}`,
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!dvhData) {
      Alert.alert("Error", "Please load a DVH file first");
      return;
    }

    try {
      const clientSessionId = await saveDvhSession(dvhData);
      router.push({
        pathname: "/calculation-setup",
        params: {
          dvhSessionId: clientSessionId,
          fileName: selectedFile?.name ?? "",
          ...(serverSessionId ? { serverDvhSessionId: serverSessionId } : {}),
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not save DVH session";
      Alert.alert("Error", msg);
    }
  };

  const structureCount = dvhData
    ? Object.keys(dvhData.dvhByStructure ?? {}).filter(
        (k) => (dvhData.dvhByStructure[k]?.length ?? 0) > 0,
      ).length
    : 0;

  const pointCount = dvhData
    ? Object.values(dvhData.dvhByStructure ?? {}).reduce(
        (n, pts) => n + (pts?.length ?? 0),
        0,
      )
    : 0;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 pb-8 px-4 pt-4">
          <View className="gap-2">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
                <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                  Import plan DVH
                </Text>
              </View>
            </Pressable>
            <Text className="text-sm" style={{ color: colors.muted }}>
              TPS export (.csv / .txt), 3-column composite CSV (dose, volume, structure), or
              multi-select files (PTV + OARs). API: {getApiBaseUrl()}
            </Text>
          </View>

          <Pressable onPress={handleSelectFile} disabled={loading}>
            <View
              className="rounded-2xl p-8 items-center justify-center gap-4 border-2"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.primary + "40",
                borderStyle: "dashed",
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ color: colors.muted }}>Parsing DVH file…</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="upload-file" size={48} color={colors.primary} />
                  <Text className="font-medium" style={{ color: colors.foreground }}>
                    {selectedFile ? selectedFile.name : "Tap to select file"}
                  </Text>
                  {structureCount > 0 && (
                    <Text style={{ color: colors.primary }}>
                      {structureCount} structure(s) · {pointCount.toLocaleString()} points
                    </Text>
                  )}
                </>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={handleProceed}
            disabled={!dvhData}
            className="rounded-2xl py-4 items-center"
            style={{
              backgroundColor: dvhData ? colors.primary : colors.muted,
              opacity: dvhData ? 1 : 0.5,
            }}
          >
            <Text className="text-base font-semibold text-white">Continue to setup</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
