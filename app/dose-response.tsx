/**
 * Dose-Response — model curve from literature parameters used in calculation.
 */

import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { DoseResponseChart } from "@/components/dose-response-chart";

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
  const geud = parseFloat((params.geud as string) || String(totalDose));
  const isTcp = structureType === "target";

  const modelKey =
    model === "lkb_probit" || model === "poisson"
      ? (model as "lkb_probit" | "poisson")
      : "lkb_loglogit";

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
            <Text className="text-xs" style={{ color: colors.muted }}>
              Curve uses literature TD50/D50 and γ from your calculation; marker at plan gEUD/mean dose.
            </Text>
          </View>

          <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
            <DoseResponseChart
              probability={probability}
              dose={geud}
              td50={td50}
              gamma50={gamma50}
              model={modelKey}
              isTCP={isTcp}
              doseMax={Math.max(totalDose * 1.2, td50 * 2, 80)}
            />
          </View>

          <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: colors.surface }}>
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Plan point
            </Text>
            <Text style={{ color: colors.muted }}>
              Dose metric: {geud.toFixed(1)} Gy · {isTcp ? "TCP" : "NTCP"}: {(probability * 100).toFixed(1)}%
            </Text>
            <Text style={{ color: colors.muted }}>
              TD50/D50: {td50.toFixed(1)} Gy · γ50/γ: {gamma50.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
