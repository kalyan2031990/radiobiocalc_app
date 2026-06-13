/**
 * On app open (after disclaimer): run self-test; on first launch, start anonymised feature tour.
 */

import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { DISCLAIMER_KEY, SELFTEST_LAST_KEY } from "@/lib/onboarding";
import { runAppSelfTest, type SelfTestResult } from "@/lib/app-selftest";
import { loadPilotApiOverride } from "@/lib/pilot-api-store";
import { isClinicianMobileApk } from "@/lib/clinician-build";

export function AppBootstrap() {
  const colors = useColors();
  const segments = useSegments();
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<SelfTestResult | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;

    const tick = async () => {
      const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
      if (accepted !== "true") return;

      ranRef.current = true;
      await loadPilotApiOverride();
      const selfTest = await runAppSelfTest();
      await AsyncStorage.setItem(SELFTEST_LAST_KEY, JSON.stringify(selfTest));

      if (isClinicianMobileApk()) {
        return;
      }

      setVisible(true);
      setResult(selfTest);
      setTimeout(() => setVisible(false), selfTest.ok ? 1200 : 4000);
    };

    tick();
    const id = setInterval(async () => {
      if (ranRef.current) {
        clearInterval(id);
        return;
      }
      const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
      if (accepted === "true") {
        clearInterval(id);
        await tick();
      }
    }, 400);

    return () => clearInterval(id);
  }, [segments]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: 20,
            maxHeight: "80%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {!result ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <MaterialIcons
                name={result.ok ? "check-circle" : "error"}
                size={28}
                color={result.ok ? colors.primary : colors.error}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {!result ? "Running self-test…" : result.ok ? "Self-test passed" : "Self-test issues"}
            </Text>
          </View>
          {result ? (
            <ScrollView style={{ maxHeight: 280 }}>
              {result.checks.map((c) => (
                <View key={c.id} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons
                    name={c.ok ? "check" : "close"}
                    size={18}
                    color={c.ok ? colors.primary : colors.error}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14 }}>{c.label}</Text>
                    {c.detail ? (
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{c.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Verifying API, anonymised demo DVH, and reference TCP/NTCP ranges…
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
