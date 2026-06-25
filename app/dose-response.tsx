/**
 * Dose-response screen — curves, CI bands, operating point (F3).
 */

import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { DoseResponseChart } from "@/components/dose-response-chart";
import { buildCiSensitivityBand, hasPublishedCi } from "@/lib/dose-sweep";
import { provenanceForStructure } from "@/lib/citation-report";

export default function DoseResponseScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();

  const structureType = (params.structureType as "target" | "oar") || "oar";
  const organ = (params.organ as string) || "OAR";
  const model = (params.model as string) || "lkb_loglogit";
  const totalDose = parseFloat((params.totalDose as string) || "70");
  const probability = parseFloat((params.probability as string) || "0");
  const td50 = parseFloat((params.td50 as string) || "28");
  const gamma50 = parseFloat((params.gamma50 as string) || "1");
  const m = parseFloat((params.m as string) || "0.18");
  const geud = parseFloat((params.geud as string) || String(totalDose));
  const isTcp = structureType === "target";

  const modelKey =
    model === "lkb_probit" || model === "poisson"
      ? (model as "lkb_probit" | "poisson")
      : "lkb_loglogit";

  const ciBand =
    !isTcp && hasPublishedCi(organ, model)
      ? buildCiSensitivityBand({
          organ,
          model: modelKey,
          td50,
          gamma50,
          m,
          doseMax: Math.max(totalDose * 1.2, td50 * 2, 80),
        })
      : null;

  const prov = provenanceForStructure(organ, model);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8 px-4 pt-4">
          <View className="gap-2">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
                <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                  Dose–response
                </Text>
              </View>
            </Pressable>
            <Text className="text-sm" style={{ color: colors.muted }}>
              {isTcp ? "TCP" : "NTCP"} · {organ} · {model.replace(/_/g, " ")}
            </Text>
          </View>

          <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
            <DoseResponseChart
              probability={probability}
              dose={geud}
              td50={td50}
              gamma50={gamma50}
              m={m}
              model={modelKey}
              isTCP={isTcp}
              doseMax={Math.max(totalDose * 1.2, td50 * 2, 80)}
              ciBand={ciBand ?? undefined}
            />
          </View>

          {ciBand && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Shaded band: NTCP at published 95% CI limits on TD50/m (QUANTEC) — not extrapolated.
            </Text>
          )}

          {prov && (
            <View className="rounded-lg p-4 gap-1" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                Parameter provenance
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {prov.citation.authors} ({prov.citation.year}). TD50 {prov.parameters.td50?.toFixed(1)} Gy.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
