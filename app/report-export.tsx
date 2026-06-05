/**
 * Export analysis report — PDF and DOCX saved on device (no server required on mobile).
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import * as Print from "expo-print";
import { trpc } from "@/lib/trpc";
import { isOfflineBuild, OFFLINE_EXPORT_HINT } from "@/lib/offline-mode";
import { buildClinicalReportSections } from "@/lib/clinical-report-sections";
import { parseClinicalContext } from "@/lib/clinical-fields-schema";
import { buildAnalysisReport } from "@/server/analysis-report";
import {
  notifyReportSaved,
  persistReportFile,
  saveBytesReport,
  saveTextReport,
  shareSavedReport,
} from "@/lib/report-file-export";

/** Native apps build and store reports on-device; web may use API when online. */
function useOnDeviceReportBuilder(): boolean {
  if (Platform.OS === "android" || Platform.OS === "ios") return true;
  return isOfflineBuild();
}

export default function ReportExportScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const onDevice = useOnDeviceReportBuilder();
  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [lastDocx, setLastDocx] = useState<string | null>(null);
  const [filenameBase, setFilenameBase] = useState("rbGyanX_report");
  const [includeClinicalInReport, setIncludeClinicalInReport] = useState(
    (params.includeClinicalInReport as string) !== "0",
  );
  const [busy, setBusy] = useState(false);

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

  const generateReport = async () => {
    const payload = buildPayload();
    if (onDevice) {
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

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const data = await generateReport();
      setLastHtml(data.html);
      setLastDocx(data.docxText);
      setFilenameBase(data.filenameBase);
      return data;
    } catch (e) {
      Alert.alert("Report", e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async () => {
    setBusy(true);
    try {
      const data = lastHtml
        ? { html: lastHtml, docxText: lastDocx ?? "", filenameBase, docxBase64: "" }
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

      const { uri: tempUri } = await Print.printToFileAsync({ html });
      const saved = await persistReportFile(tempUri, `${data!.filenameBase}.pdf`);
      notifyReportSaved(saved, "PDF");
    } catch (e) {
      Alert.alert("PDF", e instanceof Error ? e.message : "Could not save PDF");
    } finally {
      setBusy(false);
    }
  };

  const handleDocx = async () => {
    setBusy(true);
    try {
      const data = await (lastHtml && lastDocx
        ? Promise.resolve({
            html: lastHtml,
            docxText: lastDocx,
            filenameBase,
            docxBase64: "",
          })
        : handleGenerate());
      if (!data) return;

      if (data.docxBase64) {
        const saved = await saveBytesReport(
          `${data.filenameBase}.docx`,
          data.docxBase64,
        );
        notifyReportSaved(saved, "DOCX");
        return;
      }

      const saved = await saveTextReport(
        `${data.filenameBase}.docx.txt`,
        data.docxText,
      );
      Alert.alert(
        "DOCX saved as text",
        `${saved.filename}\n\nOpen in Word or rename to .docx if needed.`,
        [
          { text: "OK" },
          {
            text: "Share",
            onPress: () =>
              void shareSavedReport(saved, "text/plain"),
          },
        ],
      );
    } catch (e) {
      Alert.alert("DOCX", e instanceof Error ? e.message : "Could not save DOCX");
    } finally {
      setBusy(false);
    }
  };

  const pending = busy || generateMutation.isPending;

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
          TCP/NTCP, QUANTEC-oriented metrics, and literature references. On mobile, PDF and
          DOCX are generated and saved on this device.
        </Text>
        {onDevice ? (
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
              {OFFLINE_EXPORT_HINT}
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
          disabled={pending}
          style={{
            backgroundColor: colors.surface,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {pending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground, fontWeight: "600", textAlign: "center" }}>
              Generate report preview
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handlePdf}
          disabled={pending}
          style={{
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <MaterialIcons name="picture-as-pdf" size={28} color="#fff" />
          <View>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Save PDF on device</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
              {Platform.OS === "web"
                ? "Browser print → Save as PDF"
                : "Creates PDF in app reports folder"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleDocx}
          disabled={pending}
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <MaterialIcons name="article" size={28} color={colors.primary} />
          <View>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Save DOCX on device
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Word-compatible file — open in Microsoft Word
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
