/**
 * Desktop (browser) DVH import — file picker + on-device parser (no emulator, no API required).
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { saveDvhSession } from "@/lib/dvh-session";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import { analyzePlanScope } from "@/lib/plan-scope";
import { readDocumentContent } from "@/lib/read-document-content";
import { getVersionLine } from "@/lib/app-meta";
import { parseDvhOnDevice, mergeDvhsOnDevice, summarizeDvhBundle } from "@/lib/parse-dvh-mobile";

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => setTimeout(resolve, 0));
  });
}

export default function DVHInputDesktopScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string } | null>(null);
  const [dvhData, setDVHData] = useState<ParsedDvhBundle | null>(null);

  const handleSelectFile = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (pick.canceled || !pick.assets?.length) return;

      const assets = pick.assets;
      setLoading(true);
      setDVHData(null);

      const parsedBundles: ParsedDvhBundle[] = [];
      const fileNames: string[] = [];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setSelectedFile({
          name:
            assets.length === 1
              ? asset.name
              : `${i + 1}/${assets.length}: ${asset.name}`,
        });
        await yieldToUi();
        const content = await readDocumentContent(asset);
        parsedBundles.push(parseDvhOnDevice(content, asset.name));
        fileNames.push(asset.name);
      }

      const data =
        parsedBundles.length === 1
          ? parsedBundles[0]
          : mergeDvhsOnDevice(parsedBundles);

      setDVHData(data);
      const stats = summarizeDvhBundle(data);
      const scope = analyzePlanScope(data);
      Alert.alert(
        "DVH loaded",
        `${stats.structureCount} structure(s), ${stats.pointCount} points` +
          (scope.therapeuticWindowEligible ? " · composite plan (target + OAR)" : ""),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Parse error", msg);
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
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not save DVH session";
      Alert.alert("Error", msg);
    }
  };

  const structureCount = dvhData ? summarizeDvhBundle(dvhData).structureCount : 0;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View style={{ gap: 16, paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>
              Back
            </Text>
          </Pressable>

          <Text style={{ color: colors.muted, fontSize: 12 }}>{getVersionLine()} · Desktop</Text>

          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>
            Import plan DVH
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            Windows desktop mode — pick Varian Eclipse .txt files from your PC. Select PTV and OAR
            together (multi-select) for therapeutic window analysis.
          </Text>

          <Pressable
            onPress={handleSelectFile}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialIcons name="upload-file" size={22} color="#fff" />
            )}
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              {loading ? "Parsing…" : "Select DVH file(s)"}
            </Text>
          </Pressable>

          {dvhData && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.primary + "40",
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {selectedFile?.name}
              </Text>
              <Text style={{ color: colors.primary, marginTop: 4 }}>
                {structureCount} structure(s) ready
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleProceed}
            disabled={!dvhData || loading}
            style={{
              backgroundColor: dvhData ? colors.primary : colors.muted,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: dvhData && !loading ? 1 : 0.5,
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
