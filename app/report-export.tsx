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
  Switch,
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
import { buildClinicalReportSections } from "@/lib/clinical-report-sections";
import { parseClinicalContext } from "@/lib/clinical-fields-schema";
import { buildAnalysisReport } from "@/server/analysis-report";

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
  const [includeClinicalInReport, setIncludeClinicalInReport] = useState(
    (params.includeClinicalInReport as string) !== "0",
  );

  const generateMutation = trpc.radiobiology.generateAnalysisReport.useMutation();

  const buildPayload = () => {
    let doseMetricRows: { label: string; value: string; note?: string }[] = [];
    try {
      doseMetricRows = JSON.parse((params.doseMetricsJSON as string) || "[]");
    } catch {
      doseMetricRows = [];
    }
    const structureType = (params.structureType as "target" | "oar") || "oar";
    const organ = (params.organ as string) || "OAR";
    const cancerSite = (params.cancerSite as string) || "UNKNOWN";
    const clinicalCtx = parseClinicalContext(params.clinicalJSON as string);
    const clinicalSections = includeClinicalInReport
      ? buildClinicalReportSections(clinicalCtx, cancerSite, structureType, organ)
      : undefined;

    return {
      patientId: (params.patientId as string) || "—",
      planLabel: (params.planLabel as string) || "Plan",
      organ,
      structureName: (params.structureName as string) || "Structure",
      structureType,
      model: (params.model as string) || "lkb_loglogit",
      cancerSite,
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
      includeClinicalInReport,
      clinicalSections,
    };
  };

  const buildReportOnDevice = () =>
    isOfflineBuild() && !getApiBaseUrl();

  const generateReport = async () => {
    const payload = buildPayload();
    if (buildReportOnDevice()) {
      return buildAnalysisReport(payload);
    }
    try {
      const res = await generateMutation.mutateAsync(payload);
      if (res.success && res.data) return res.data;
      throw new Error(res.error ?? "Generation failed");
    } catch {
      return buildAnalysisReport(payload);
    }
  };

  const ensureExportServer = (): boolean => {
    if (buildReportOnDevice()) return true;
    if (!getApiBaseUrl()) {
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
      const data = await generateReport();
      setLastHtml(data.html);
      setLastDocx(data.docxText);
      setFilenameBase(data.filenameBase);
      return data;
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
    const data = await handleGenerate();
    if (!data) return;
    const b64 = data.docxBase64;
    if (!b64) {
      await writeFile(".docx.txt", data.docxText, "text/plain");
      Alert.alert("DOCX", "Saved as plain text fallback.");
      return;
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const name = `${data.filenameBase}.docx`;
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
            ? buildReportOnDevice()
              ? " Mobile: report (including clinical section) is built on this device."
              : " Mobile: calculations on-device; reports via export server or on-device if server not set."
            : ""}
        </Text>
        {buildReportOnDevice() ? (
          <View
            style={{
              backgroundColor: "#D1FAE5",
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#6EE7B7",
            }}
          >
            <Text style={{ color: "#065F46", fontSize: 13 }}>
              PDF/DOCX built on this device. Optional: set an export server on Home for
              shared templates or older builds.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              Clinical context in report
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              All filled site-specific fields (patient, disease, treatment, structure).
            </Text>
          </View>
          <Switch
            value={includeClinicalInReport}
            onValueChange={setIncludeClinicalInReport}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

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
