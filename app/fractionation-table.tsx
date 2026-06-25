/**
 * BED / EQD₂ fractionation-equivalence table (F6).
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  Switch,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import {
  buildEquivalenceTable,
  buildCustomSchedule,
  equivalenceTableToCsv,
  CATEGORY_COLORS,
  type FractionationSchedule,
} from "@/lib/fractionation-equivalence";
import { saveReportCsv, saveReportPdf } from "@/lib/report-file-export";

export default function FractionationTableScreen() {
  const router = useRouter();
  const colors = useColors();
  const [alphaBetaTumor, setAlphaBetaTumor] = useState("10");
  const [alphaBetaLate, setAlphaBetaLate] = useState("3");
  const [useLql, setUseLql] = useState(false);
  const [customDose, setCustomDose] = useState("");
  const [customFx, setCustomFx] = useState("");
  const [customSchedules, setCustomSchedules] = useState<FractionationSchedule[]>([]);

  const rows = useMemo(() => {
    const abT = parseFloat(alphaBetaTumor) || 10;
    const abL = parseFloat(alphaBetaLate) || 3;
    return buildEquivalenceTable({
      alphaBetaTumor: abT,
      alphaBetaLate: abL,
      useLqlDamping: useLql,
      customSchedules,
    });
  }, [alphaBetaTumor, alphaBetaLate, useLql, customSchedules]);

  const maxEqd2 = Math.max(...rows.map((r) => r.eqd2Tumor), 1);
  const chartWidth = Dimensions.get("window").width - 48;

  const addCustom = () => {
    const d = parseFloat(customDose);
    const f = parseInt(customFx, 10);
    if (!d || !f || f < 1) {
      Alert.alert("Invalid", "Enter total dose (Gy) and number of fractions.");
      return;
    }
    setCustomSchedules((prev) => [...prev, buildCustomSchedule(d, f)]);
    setCustomDose("");
    setCustomFx("");
  };

  const exportCsv = async () => {
    const csv = equivalenceTableToCsv(rows);
    await saveReportCsv("rbGyanX_fractionation_equivalence.csv", csv);
    Alert.alert("Exported", "CSV saved.");
  };

  const exportPdf = async () => {
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${r.schedule.label}</td><td>${r.eqd2Tumor.toFixed(1)}</td><td>${r.eqd2Late.toFixed(1)}</td><td>${r.bedTumor.toFixed(1)}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<h1>rbGyanX — Fractionation equivalence</h1>
<p>α/β tumor ${alphaBetaTumor} Gy · α/β late ${alphaBetaLate} Gy · LQL ${useLql ? "on" : "off"}</p>
<table border="1" cellpadding="6"><tr><th>Schedule</th><th>EQD2 tumor</th><th>EQD2 late</th><th>BED tumor</th></tr>${tableRows}</table>
</body></html>`;
    await saveReportPdf("rbGyanX_fractionation_equivalence.pdf", html);
    Alert.alert("Exported", "PDF saved.");
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>BED / EQD₂ table</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Preset schedules with live α/β override and optional LQL (Astrahan) damping for hypofractionation.
        </Text>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text style={{ color: colors.foreground, flex: 1 }}>α/β tumor (Gy)</Text>
          <TextInput
            value={alphaBetaTumor}
            onChangeText={setAlphaBetaTumor}
            keyboardType="decimal-pad"
            style={{ width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 6, color: colors.foreground }}
          />
          <Text style={{ color: colors.foreground }}>late</Text>
          <TextInput
            value={alphaBetaLate}
            onChangeText={setAlphaBetaLate}
            keyboardType="decimal-pad"
            style={{ width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 6, color: colors.foreground }}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground }}>LQL damping (d/fx &gt; 6 Gy)</Text>
          <Switch value={useLql} onValueChange={setUseLql} />
        </View>

        <Text style={{ fontWeight: "600", color: colors.foreground }}>EQD₂ comparison (tumor)</Text>
        <Svg width={chartWidth} height={rows.length * 22 + 20}>
          {rows.map((r, i) => {
            const barW = (r.eqd2Tumor / maxEqd2) * (chartWidth - 120);
            const cat = CATEGORY_COLORS[r.schedule.category];
            return (
              <G key={r.schedule.id}>
                <Rect x={110} y={i * 22 + 4} width={barW} height={16} fill={cat} rx={3} />
                <SvgText x={4} y={i * 22 + 16} fontSize={9} fill={colors.foreground}>
                  {r.schedule.label.slice(0, 14)}
                </SvgText>
                <SvgText x={chartWidth - 36} y={i * 22 + 16} fontSize={9} fill={colors.muted}>
                  {r.eqd2Tumor.toFixed(0)}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {rows.map((r) => (
          <View
            key={r.schedule.id}
            style={{
              padding: 10,
              borderLeftWidth: 4,
              borderLeftColor: CATEGORY_COLORS[r.schedule.category],
              backgroundColor: colors.surface,
              borderRadius: 6,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.foreground }}>{r.schedule.label}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              BED {r.bedTumor.toFixed(1)} · EQD₂ {r.eqd2Tumor.toFixed(1)} Gy (tumor) · EQD₂ late {r.eqd2Late.toFixed(1)} Gy
              {r.lqlApplied ? " · LQL" : ""}
            </Text>
          </View>
        ))}

        <Text style={{ fontWeight: "600", color: colors.foreground, marginTop: 8 }}>Custom schedule</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            placeholder="Total Gy"
            placeholderTextColor={colors.muted}
            value={customDose}
            onChangeText={setCustomDose}
            keyboardType="decimal-pad"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, color: colors.foreground }}
          />
          <TextInput
            placeholder="# fx"
            placeholderTextColor={colors.muted}
            value={customFx}
            onChangeText={setCustomFx}
            keyboardType="number-pad"
            style={{ width: 72, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, color: colors.foreground }}
          />
          <Pressable onPress={addCustom} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 6, justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Add</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable onPress={exportCsv} style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ textAlign: "center", color: colors.primary }}>Export CSV</Text>
          </Pressable>
          <Pressable onPress={exportPdf} style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ textAlign: "center", color: colors.primary }}>Export PDF</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
