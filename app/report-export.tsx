/**
 * Export analysis report — PDF and DOCX saved on device / browser download on desktop.
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
import { createElement, useCallback, useEffect, useState } from "react";
import * as Print from "expo-print";
import { isDesktopClient, isOfflineBuild, OFFLINE_EXPORT_HINT } from "@/lib/offline-mode";
import {
  buildAnalysisReport,
  type AnalysisReportOutput,
} from "@/server/analysis-report";
import {
  notifyReportSaved,
  persistReportFile,
  printHtmlReportWeb,
  saveBytesReport,
  saveTextReport,
  shareSavedReport,
} from "@/lib/report-file-export";
import { buildClinicalReportSections } from "@/lib/clinical-report-sections";
import { parseClinicalContext } from "@/lib/clinical-fields-schema";
import { buildCompositeReportExtras } from "@/lib/export-report-builder";
import { attachReportCharts } from "@/lib/enrich-report-charts";
import type { AnalysisReportInput } from "@/server/analysis-report";

/** Native apps + offline/desktop browser build reports on-device. */
function useOnDeviceReportBuilder(): boolean {
  if (Platform.OS === "android" || Platform.OS === "ios") return true;
  return isOfflineBuild() || isDesktopClient();
}

export default function ReportExportScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const onDevice = useOnDeviceReportBuilder();
  const [lastReport, setLastReport] = useState<AnalysisReportOutput | null>(null);
  const [includeClinicalInReport, setIncludeClinicalInReport] = useState(
    (params.includeClinicalInReport as string) !== "0",
  );
  const [busy, setBusy] = useState(false);

  const buildPayload = useCallback(async (): Promise<AnalysisReportInput> => {
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

    const parseOpt = (v: string | undefined) => {
      if (!v) return undefined;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const totalDose = parseFloat((params.totalDose as string) || "70");
    const numFractions = parseInt((params.numFractions as string) || "35", 10);
    const technique = (params.technique as string) || "IMRT";

    const compositeExtras = await buildCompositeReportExtras(
      (params.dvhSessionId as string) || undefined,
      { totalDose, numFractions, cancerSite, technique },
    );

    return attachReportCharts({
      patientId: (params.patientId as string) || "—",
      planLabel: (params.planLabel as string) || "Plan",
      organ,
      structureName: (params.structureName as string) || "Structure",
      structureType,
      model: (params.model as string) || "lkb_loglogit",
      cancerSite,
      technique,
      totalDose,
      numFractions,
      tcp: parseOpt(params.tcp as string),
      ntcp: parseOpt(params.ntcp as string),
      baseTcp: parseOpt(params.baseTcp as string),
      baseNtcp: parseOpt(params.baseNtcp as string),
      covariatesApplied: params.applyClinicalCovariates === "1",
      clinicalDataNote: (params.clinicalDataNote as string) || undefined,
      bed: parseFloat((params.bed as string) || "0"),
      eqd2: parseFloat((params.eqd2 as string) || "0"),
      meanDose: parseFloat((params.meanDose as string) || "0"),
      maxDose: parseFloat((params.maxDose as string) || "0"),
      gEUD: parseFloat((params.gEUD as string) || "0"),
      doseMetricRows,
      includeClinicalInReport,
      clinicalSections,
      ...(compositeExtras ?? {}),
    });
  }, [params, includeClinicalInReport]);

  const generateReport = useCallback(async (): Promise<AnalysisReportOutput> => {
    const payload = await buildPayload();
    return buildAnalysisReport(payload);
  }, [buildPayload]);

  const ensureReport = useCallback(async (): Promise<AnalysisReportOutput | null> => {
    if (lastReport) return lastReport;
    setBusy(true);
    try {
      const data = await generateReport();
      setLastReport(data);
      return data;
    } catch (e) {
      Alert.alert("Report", e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setBusy(false);
    }
  }, [generateReport, lastReport]);

  const handleGenerate = async () => {
    setLastReport(null);
    setBusy(true);
    try {
      const data = await generateReport();
      setLastReport(data);
    } catch (e) {
      Alert.alert("Report", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generate once when screen opens
  }, []);

  const handlePdf = async () => {
    setBusy(true);
    try {
      const data = await ensureReport();
      if (!data?.html) return;

      if (Platform.OS === "web") {
        const printed = printHtmlReportWeb(data.html);
        if (!printed) {
          const saved = await saveTextReport(`${data.filenameBase}.html`, data.html);
          notifyReportSaved(saved, "HTML report");
          Alert.alert(
            "Print blocked",
            "Your browser blocked the print dialog. An HTML report was downloaded — open it and use Ctrl+P → Save as PDF.",
          );
          return;
        }
        Alert.alert(
          "Save as PDF",
          "In the print dialog, choose “Save as PDF” or “Microsoft Print to PDF” as the destination.",
        );
        return;
      }

      const { uri: tempUri } = await Print.printToFileAsync({ html: data.html });
      const saved = await persistReportFile(tempUri, `${data.filenameBase}.pdf`);
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
      const data = await ensureReport();
      if (!data) return;

      if (data.docxBase64) {
        const saved = await saveBytesReport(`${data.filenameBase}.docx`, data.docxBase64);
        notifyReportSaved(saved, "DOCX");
        return;
      }

      const saved = await saveTextReport(`${data.filenameBase}.docx.txt`, data.docxText);
      Alert.alert(
        "DOCX saved as text",
        `${saved.filename}\n\nOpen in Word or rename to .docx if needed.`,
        [
          { text: "OK" },
          {
            text: "Share",
            onPress: () => void shareSavedReport(saved, "text/plain"),
          },
        ],
      );
    } catch (e) {
      Alert.alert("DOCX", e instanceof Error ? e.message : "Could not save DOCX");
    } finally {
      setBusy(false);
    }
  };

  const pending = busy;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          Export report
        </Text>
        <Text style={{ color: colors.muted }}>
          {Platform.OS === "web"
            ? "Preview below, then download DOCX or print/save as PDF in your browser."
            : "TCP/NTCP, QUANTEC-oriented metrics, and literature references — saved on this device."}
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
              {Platform.OS === "web"
                ? "Desktop mode: reports are built on this PC (no server). DOCX downloads directly; PDF uses Print → Save as PDF."
                : OFFLINE_EXPORT_HINT}
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
            onValueChange={(v) => {
              setIncludeClinicalInReport(v);
              setLastReport(null);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Pressable
          onPress={() => void handleGenerate()}
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
              {lastReport ? "Regenerate report preview" : "Generate report preview"}
            </Text>
          )}
        </Pressable>

        {lastReport ? (
          <View
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            <Text
              style={{
                padding: 10,
                fontWeight: "600",
                color: colors.foreground,
                backgroundColor: colors.surface,
              }}
            >
              Preview — {lastReport.filenameBase}
            </Text>
            {Platform.OS === "web"
              ? createElement("iframe", {
                  srcDoc: lastReport.html,
                  style: {
                    width: "100%",
                    height: 480,
                    border: "none",
                    backgroundColor: "#fff",
                  },
                  title: "Report preview",
                })
              : (
                <ScrollView style={{ maxHeight: 320, padding: 12 }}>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "monospace" }}>
                    {lastReport.docxText.slice(0, 2500)}
                    {lastReport.docxText.length > 2500 ? "\n\n…" : ""}
                  </Text>
                </ScrollView>
              )}
          </View>
        ) : null}

        <Pressable
          onPress={() => void handlePdf()}
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
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {Platform.OS === "web" ? "Print / Save as PDF" : "Save PDF on device"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
              {Platform.OS === "web"
                ? "Opens print dialog → choose Save as PDF"
                : "Creates PDF in app reports folder"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => void handleDocx()}
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
              {Platform.OS === "web" ? "Download DOCX" : "Save DOCX on device"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Word-compatible .docx file
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
