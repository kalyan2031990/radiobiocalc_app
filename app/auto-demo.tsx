/**
 * Feature tour control screen — replay without uncaught state errors.
 */

import { useState, useCallback } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import {
  cancelFeatureTour,
  isFeatureTourRunning,
  runFeatureTour,
  type TourProgress,
  type TourStepId,
} from "@/lib/feature-tour";

const STEP_LABELS: Record<TourStepId, string> = {
  disclaimer: "Clinical disclaimer",
  load: "Load anonymised demo DVH",
  setup: "Calculation setup",
  ntcp: "NTCP results (parotid)",
  tcp: "TCP results (PTV)",
  "dose-response": "Dose–response",
  therapeutic: "Therapeutic window",
  home: "Return to home",
};

const ALL_STEPS: TourStepId[] = [
  "disclaimer",
  "load",
  "setup",
  "ntcp",
  "tcp",
  "dose-response",
  "therapeutic",
  "home",
];

export default function AutoDemoScreen() {
  const router = useRouter();
  const colors = useColors();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepState, setStepState] = useState<Record<TourStepId, TourProgress["status"]>>({});

  const onProgress = useCallback((p: TourProgress) => {
    setStepState((prev) => ({ ...prev, [p.step]: p.status }));
    if (p.summary) setSummary(p.summary);
    if (p.error) setError(p.error);
  }, []);

  const startTour = useCallback(async () => {
    if (isFeatureTourRunning()) return;
    setRunning(true);
    setError(null);
    setSummary(null);
    setStepState({});
    const result = await runFeatureTour(router, onProgress);
    if (!result.ok && result.error && result.error !== "Cancelled") {
      setError(result.error);
    }
    if (result.summary) setSummary(result.summary);
    setRunning(false);
  }, [router, onProgress]);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View className="gap-4">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="play-circle-filled" size={28} color={colors.primary} />
            <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
              Feature tour
            </Text>
          </View>
          <Text className="text-sm" style={{ color: colors.muted }}>
            Walkthrough using anonymised head-and-neck demo data (no real patient identifiers).
          </Text>

          {summary ? (
            <View
              className="rounded-xl p-4"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-sm" style={{ color: colors.primary }}>
                {summary}
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          ) : null}

          {running ? <ActivityIndicator size="large" color={colors.primary} /> : null}

          <View className="gap-2">
            {ALL_STEPS.map((id) => (
              <View key={id} className="flex-row items-center gap-3">
                <MaterialIcons
                  name={
                    stepState[id] === "done"
                      ? "check-circle"
                      : stepState[id] === "error"
                        ? "error"
                        : stepState[id] === "active"
                          ? "radio-button-checked"
                          : "radio-button-unchecked"
                  }
                  size={20}
                  color={
                    stepState[id] === "error"
                      ? colors.error
                      : stepState[id] === "done" || stepState[id] === "active"
                        ? colors.primary
                        : colors.muted
                  }
                />
                <Text style={{ color: colors.foreground, fontSize: 14 }}>{STEP_LABELS[id]}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={startTour}
            disabled={running || isFeatureTourRunning()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              className="rounded-xl py-3 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {running ? "Tour running…" : "Replay tour"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              cancelFeatureTour();
              router.replace("/(tabs)");
            }}
          >
            <Text style={{ textAlign: "center", color: colors.muted }}>Stop</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
