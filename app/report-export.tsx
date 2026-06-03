/**
 * Export analysis report — HTML (print to PDF) and DOCX-compatible text.
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import { isOfflineBuild } from "@/lib/offline-mode";

function exportServerRequiredMessage(): string {
  return (
    "Set the report export server on Home (PDF/DOCX only). " +
    "For remote phones use an https ngrok URL to your PC running npm run start:server."
  );
}

export default function ReportExportScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [lastDocx, setLastDocx] = useState<string | null>(null);
  const [filenameBase, setFilenameBase] = useState("rbGyanX_report");

  const generateMutation = trpc.radiobiology.generateAnalysisReport.useMutation();

  const buildPayload = () => {
    let doseMetricRows: { label: string; value: string; note?: string }[] = [];
    try {
      doseMetricRows = JSON.parse((params.doseMetricsJSON as string) || "[]");
    } catch {
      doseMetricRows = [];
    }
    return {
      patientId: (params.patientId as string) || "—",
      planLabel: (params.planLabel as string) || "Plan",
      organ: (params.organ as string) || "OAR",
      structureName: (params.structureName as string) || "Structure",
      structureType: (params.structureType as "target" | "oar") || "oar",
      model: (params.model as string) || "lkb_loglogit",
      cancerSite: (params.cancerSite as string) || "HN",
      technique: (params.technique as string) || "IMRT",
      totalDose: parseFloat((params.totalDose as string) || "70"),
      numFractions: parseInt((params.numFractions as string) || "35", 10),
      tcp: params.tcp ? parseFloat(params.tcp as string) : undefined,
      ntcp: params.ntcp ? parseFloat(params.ntcp as string) : undefined,
      bed: parseFloat((params.bed as string) || "0"),
      eqd2: parseFloat((params.eqd2 as string) || "0"),
      meanDose: parseFloat((params.meanDose as string) || "0"),
      maxDose: parseFloat((params.maxDose as string) || "0"),
      gEUD: parseFloat((params.gEUD as string) || "0"),
      doseMetricRows,
    };
  };

  const ensureExportServer = (): boolean => {
    if (isOfflineBuild() && !getApiBaseUrl()) {
      Alert.alert("Export server required", exportServerRequiredMessage(), [
        { text: "Cancel", style: "cancel" },
        { text: "Open settings", onPress: () => router.push("/pilot-api-setup") },
      ]);
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!ensureExportServer()) return null;
    try {
      const res = await generateMutation.mutateAsync(buildPayload());
      if (!res.success || !res.data) {
        Alert.alert("Report", res.error ?? "Generation failed");
        return null;
      }
      setLastHtml(res.data.html);
      setLastDocx(res.data.docxText);
      setFilenameBase(res.data.filenameBase);
      return res.data;
    } catch (e) {
      Alert.alert("Report", e instanceof Error ? e.message : "Unknown error");
      return null;
    }
  };

  const writeFile = async (ext: string, content: string, mime: string) => {
    const name = `${filenameBase}${ext}`;
    const uri = `${FileSystem.documentDirectory}${name}`;
    await FileSystem.writeAsStringAsync(uri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (Platform.OS === "web") {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      Alert.alert("Download", `${name} downloaded`);
      return;
    }
    await Share.share({ url: uri, title: name });
  };

  const handlePdf = async () => {
    if (!ensureExportServer()) return;
    const data = lastHtml
      ? { html: lastHtml, docxText: lastDocx ?? "", filenameBase }
      : await handleGenerate();
    const html = data?.html;
    if (!html) return;
    if (Platform.OS === "web") {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
      return;
    }
    await writeFile(".html", html, "text/html");
    Alert.alert(
      "PDF on device",
      "Open the shared HTML report in a browser and use Print → Save as PDF.",
    );
  };

  const handleDocx = async () => {
    if (!ensureExportServer()) return;
    const res = await generateMutation.mutateAsync(buildPayload());
    if (!res.success || !res.data) {
      Alert.alert("Report", res.error ?? "Generation failed");
      return;
    }
    const b64 = res.data.docxBase64;
    if (!b64) {
      await writeFile(".docx.txt", res.data.docxText, "text/plain");
      Alert.alert("DOCX", "Saved as plain text fallback.");
      return;
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const name = `${res.data.filenameBase}.docx`;
    if (Platform.OS === "web") {
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const uri = `${FileSystem.documentDirectory}${name}`;
    await FileSystem.writeAsStringAsync(uri, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Share.share({ url: uri, title: name });
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          Export report
        </Text>
        <Text style={{ color: colors.muted }}>
          Includes TCP/NTCP, QUANTEC-oriented metrics, and literature references (Gyan layer).
          {isOfflineBuild()
            ? " Mobile build: calculations are on-device; report generation uses your export server only."
            : ""}
        </Text>
        {isOfflineBuild() && !getApiBaseUrl() ? (
          <Pressable
            onPress={() => router.push("/pilot-api-setup")}
            style={{
              backgroundColor: "#FEF3C7",
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <Text style={{ color: "#92400E", fontSize: 13 }}>{exportServerRequiredMessage()}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleGenerate}
          disabled={generateMutation.isPending}
          style={{
            backgroundColor: colors.surface,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground, fontWeight: "600", textAlign: "center" }}>
              Generate report preview
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handlePdf}
          style={{
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <MaterialIcons name="picture-as-pdf" size={28} color="#fff" />
          <View>
            <Text style={{ color: "#fff", fontWeight: "700" }}>PDF</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
              Web: print dialog · Mobile: HTML share → Print to PDF
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleDocx}
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <MaterialIcons name="article" size={28} color={colors.primary} />
          <View>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>DOCX / Word</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Structured text with citations — open in Microsoft Word
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
