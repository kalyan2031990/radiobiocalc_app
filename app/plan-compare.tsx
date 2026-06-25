/**
 * Side-by-side plan A/B comparison (F1).
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { readDocumentContent } from "@/lib/read-document-content";
import { offlineParseDvh } from "@/lib/offline-engine";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";
import { compareTwoBundles, type PlanCompareResult } from "@/lib/plan-compare";
import { buildComparisonReport } from "@/lib/comparison-report";
import { saveReportPdf, saveReportDocx } from "@/lib/report-file-export";
import { DVHChart } from "@/components/dvh-chart";

async function pickCompositeDvh(label: string): Promise<{ bundle: ParsedDvhBundle; name: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["text/plain", "text/csv", "text/comma-separated-values", "*/*"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const content = await readDocumentContent(asset);
  const bundle = offlineParseDvh(content, asset.name);
  return { bundle, name: asset.name || label };
}

function betterColor(better: "A" | "B" | "neutral", colors: ReturnType<typeof useColors>): string {
  if (better === "neutral") return colors.muted;
  return better === "B" ? colors.success : colors.primary;
}

export default function PlanCompareScreen() {
  const router = useRouter();
  const colors = useColors();
  const [bundleA, setBundleA] = useState<ParsedDvhBundle | null>(null);
  const [bundleB, setBundleB] = useState<ParsedDvhBundle | null>(null);
  const [nameA, setNameA] = useState("Plan A");
  const [nameB, setNameB] = useState("Plan B");
  const [result, setResult] = useState<PlanCompareResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [overlayStructure, setOverlayStructure] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const runCompare = () => {
    if (!bundleA || !bundleB) {
      Alert.alert("Load both plans", "Import composite DVH for plan A and plan B.");
      return;
    }
    setBusy(true);
    try {
      const rxA = bundleA.patientInfo?.prescribedDoseGy ?? 70;
      const fxA = bundleA.patientInfo?.prescribedFractions ?? 35;
      const rxB = bundleB.patientInfo?.prescribedDoseGy ?? 70;
      const fxB = bundleB.patientInfo?.prescribedFractions ?? 35;
      const cmp = compareTwoBundles(
        bundleA,
        bundleB,
        { totalDose: rxA, numFractions: fxA, prescriptionGy: rxA, fileHint: nameA },
        { totalDose: rxB, numFractions: fxB, prescriptionGy: rxB, fileHint: nameB },
        nameA,
        nameB,
      );
      setResult(cmp);
      const firstStruct = cmp.structureRows[0]?.structureName ?? null;
      setOverlayStructure(firstStruct);
    } catch (e) {
      Alert.alert("Compare failed", e instanceof Error ? e.message : "Engine error");
    } finally {
      setBusy(false);
    }
  };

  const exportReport = async (fmt: "pdf" | "docx") => {
    if (!result) return;
    setExporting(true);
    try {
      const rep = buildComparisonReport(result);
      if (fmt === "pdf") {
        await saveReportPdf(`${rep.filenameBase}.pdf`, rep.html);
      } else {
        await saveReportDocx(`${rep.filenameBase}.docx`, rep.docxBase64);
      }
      Alert.alert("Exported", `Comparison ${fmt.toUpperCase()} saved.`);
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  const overlayRow = result?.structureRows.find((r) => r.structureName === overlayStructure);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        <Pressable onPress={() => router.back()}>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              Plan A / B compare
            </Text>
          </View>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Load two composite DVHs offline. Δ = B − A. Higher TCP/TWI or lower OAR NTCP is better.
        </Text>

        <View className="flex-row gap-3">
          <Pressable
            style={{ flex: 1 }}
            onPress={async () => {
              const p = await pickCompositeDvh("Plan A");
              if (p) {
                setBundleA(p.bundle);
                setNameA(p.name);
                setResult(null);
              }
            }}
          >
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontWeight: "600", color: colors.foreground }}>Plan A</Text>
              <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{nameA}</Text>
            </View>
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={async () => {
              const p = await pickCompositeDvh("Plan B");
              if (p) {
                setBundleB(p.bundle);
                setNameB(p.name);
                setResult(null);
              }
            }}
          >
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontWeight: "600", color: colors.foreground }}>Plan B</Text>
              <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{nameB}</Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={runCompare}
          disabled={busy}
          style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: "center" }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>Compare plans</Text>
          )}
        </Pressable>

        {result && (
          <>
            <Text style={{ fontWeight: "700", color: colors.foreground, marginTop: 8 }}>Composite Δ</Text>
            {result.compositeRows.map((r) => (
              <View
                key={r.key}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, flex: 1 }}>{r.label}</Text>
                <Text style={{ color: colors.muted, width: 56, textAlign: "right" }}>
                  {(r.planA * (r.key === "d95" || r.key === "tci" ? 1 : 100)).toFixed(1)}
                </Text>
                <Text style={{ color: colors.muted, width: 56, textAlign: "right" }}>
                  {(r.planB * (r.key === "d95" || r.key === "tci" ? 1 : 100)).toFixed(1)}
                </Text>
                <Text style={{ color: betterColor(r.better, colors), width: 48, textAlign: "right", fontWeight: "600" }}>
                  {r.better === "neutral" ? "—" : r.better}
                </Text>
              </View>
            ))}

            <Text style={{ fontWeight: "700", color: colors.foreground, marginTop: 12 }}>Per structure</Text>
            {result.structureRows.map((row) => (
              <Pressable key={row.structureName} onPress={() => setOverlayStructure(row.structureName)}>
                <View
                  style={{
                    padding: 10,
                    marginBottom: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: overlayStructure === row.structureName ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ fontWeight: "600", color: colors.foreground }}>{row.structureName}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    gEUD Δ {row.delta.geud.toFixed(1)} Gy
                    {row.delta.ntcp != null ? ` · NTCP Δ ${(row.delta.ntcp * 100).toFixed(1)} pp` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}

            {overlayRow && bundleA && bundleB && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
                  DVH overlay — {overlayRow.structureName}
                </Text>
                <DVHChart
                  dvhData={[]}
                  structureName={overlayRow.structureName}
                  structureType={overlayRow.structureType}
                  overlaySeries={[
                    {
                      label: nameA,
                      dvhData: (bundleA.dvhByStructure[overlayRow.structureName] ?? []).map((p) => ({
                        dose: p.dose,
                        volume: p.volume,
                      })),
                      structureType: overlayRow.structureType,
                      geud: overlayRow.planA.geud,
                    },
                    {
                      label: nameB,
                      dvhData: (bundleB.dvhByStructure[overlayRow.structureName] ?? []).map((p) => ({
                        dose: p.dose,
                        volume: p.volume,
                      })),
                      structureType: overlayRow.structureType,
                      geud: overlayRow.planB.geud,
                    },
                  ]}
                />
              </View>
            )}

            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => exportReport("pdf")}
                disabled={exporting}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ textAlign: "center", color: colors.primary, fontWeight: "600" }}>Export PDF</Text>
              </Pressable>
              <Pressable
                onPress={() => exportReport("docx")}
                disabled={exporting}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ textAlign: "center", color: colors.primary, fontWeight: "600" }}>Export DOCX</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
