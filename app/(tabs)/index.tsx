/**
 * rbGyanX Mobile — single patient, single plan evaluation.
 * Physical DVH metrics + BED/EUD/gEUD/TCP/NTCP + simple plan statistics.
 */

import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { RbgyanxLogo } from "@/components/rbgyanx-logo";
import { AppVersionBadge } from "@/components/app-version-badge";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";
import { APP_TAGLINE } from "@/lib/app-meta";
import {
  isOfflineBuild,
  isExportServerConfigured,
  OFFLINE_MODE_LABEL,
  OFFLINE_EXPORT_HINT,
} from "@/lib/offline-mode";
import { useApiClient } from "@/lib/api-client-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


interface RecentCalculation {
  id: string;
  organ: string;
  model: string;
  date: string;
  tcp?: number;
  ntcp?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { apiBaseUrl } = useApiClient();
  const [recentCalculations, setRecentCalculations] = useState<
    RecentCalculation[]
  >([]);

  useEffect(() => {
    loadRecentCalculations();
  }, []);

  const loadRecentCalculations = async () => {
    try {
      const stored = await AsyncStorage.getItem("recentCalculations");
      if (stored) {
        const calculations = JSON.parse(stored);
        setRecentCalculations(calculations.slice(0, 3)); // Show last 3
      }
    } catch (error) {
      console.error("Error loading recent calculations:", error);
    }
  };

  const handleLoadDVH = () => {
    router.push("/dvh-input");
  };

  const handleRecentCalculation = (calc: RecentCalculation) => {
    router.push({
      pathname: "/calculation-results",
      params: {
        calculationId: calc.id,
      },
    });
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-8 pb-8">
          <View className="items-center gap-2 pt-4">
            <RbgyanxLogo size="lg" />
            <AppVersionBadge centered />
            <Text
              className="text-base text-center px-6"
              style={{ color: colors.foreground, fontWeight: "600" }}
            >
              {APP_TAGLINE}
            </Text>
            <Pressable onPress={() => router.push("/product-info")}>
              <Text style={{ color: colors.primary, fontSize: 13, textDecorationLine: "underline" }}>
                Product, validation & roadmap
              </Text>
            </Pressable>
            {isOfflineBuild() ? (
              <View className="gap-2 mt-1 w-full px-0">
                <View
                  className="rounded-lg px-4 py-3"
                  style={{ backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#6EE7B7" }}
                >
                  <Text style={{ color: "#065F46", fontWeight: "600", fontSize: 13 }}>
                    {OFFLINE_MODE_LABEL}
                  </Text>
                </View>
                <Pressable onPress={() => router.push("/pilot-api-setup")}>
                  <View
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: "#DBEAFE", borderWidth: 1, borderColor: "#93C5FD" }}
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-2 flex-1">
                        <MaterialIcons name="cloud-upload" size={22} color="#1D4ED8" />
                        <Text style={{ color: "#1E3A8A", fontWeight: "600", fontSize: 13, flex: 1 }}>
                          Export server (optional)
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={22} color="#1D4ED8" />
                    </View>
                    <Text style={{ color: "#1E40AF", fontSize: 11, marginTop: 6 }}>
                      {isExportServerConfigured()
                        ? `Active: ${apiBaseUrl}`
                        : OFFLINE_EXPORT_HINT}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push("/pilot-api-setup")}
                className="mt-1"
              >
                <View
                  className="rounded-lg px-4 py-3 flex-row items-center justify-between"
                  style={{ backgroundColor: "#DBEAFE", borderWidth: 1, borderColor: "#93C5FD" }}
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <MaterialIcons name="dns" size={22} color="#1D4ED8" />
                    <Text style={{ color: "#1E3A8A", fontWeight: "600", fontSize: 13 }}>
                      Pilot: set API server URL
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#1D4ED8" />
                </View>
              </Pressable>
            )}
          </View>

          <View className="gap-4 px-4">
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View
                className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="account-circle" size={22} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>Sign in / Register</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </View>
            </Pressable>

            <Pressable
              onPress={handleLoadDVH}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                className="rounded-2xl p-6 gap-3"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.primary + "20" }}
                  >
                    <MaterialIcons
                      name="insert-chart"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-lg font-semibold text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      Import plan DVH
                    </Text>
                    <Text
                      className="text-sm text-muted"
                      style={{ color: colors.muted }}
                    >
                      Same DVH export as QUANTEC checks in Excel (.csv / .txt)
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.muted}
                  />
                </View>
              </View>
            </Pressable>

            <View
              className="rounded-xl p-4 gap-1"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.foreground }}>
                Optional in setup
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                Literature model parameters (editable presets) and site/organ clinical context dropdowns — advisory only, not fed into formulas unless you override parameters for calculation.
              </Text>
            </View>
          </View>

          {/* Recent Calculations Section */}
          {recentCalculations.length > 0 && (
            <View className="gap-3 px-4">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Recent Calculations
              </Text>

              {recentCalculations.map((calc) => (
                <Pressable
                  key={calc.id}
                  onPress={() => handleRecentCalculation(calc)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    className="rounded-xl p-4 flex-row items-center justify-between border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-1">
                      <Text
                        className="font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {calc.organ}
                      </Text>
                      <Text
                        className="text-sm text-muted"
                        style={{ color: colors.muted }}
                      >
                        {calc.model} • {new Date(calc.date).toLocaleDateString()}
                      </Text>
                      {calc.tcp !== undefined && (
                        <Text
                          className="text-xs text-primary mt-1"
                          style={{ color: colors.primary }}
                        >
                          TCP: {(calc.tcp * 100).toFixed(1)}%
                        </Text>
                      )}
                      {calc.ntcp !== undefined && (
                        <Text
                          className="text-xs text-error mt-1"
                          style={{ color: colors.error }}
                        >
                          NTCP: {(calc.ntcp * 100).toFixed(1)}%
                        </Text>
                      )}
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View className="gap-2 px-4">
            <Pressable onPress={() => router.push("/auto-demo")}>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>
                Replay anonymised feature tour
              </Text>
            </Pressable>
            <Text className="text-sm text-muted" style={{ color: colors.muted }}>
              BED · EUD · gEUD · TCP/NTCP · rb X explainability
            </Text>
            <Text className="text-xs text-muted" style={{ color: colors.muted }}>
              Full cohort / DICOM pipeline with XAI: use desktop rbGyanX
            </Text>
          </View>

          {/* Info Section with Developer Information */}
          <View className="gap-3 px-4">
            <View
              className="rounded-xl p-5 gap-3"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row gap-2">
                <MaterialIcons
                  name="info"
                  size={20}
                  color={colors.primary}
                  style={{ marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text
                    className="font-semibold text-foreground text-base"
                    style={{ color: colors.foreground }}
                  >
                    About rbGyanX
                  </Text>
                  <Text
                    className="text-sm text-muted mt-2 leading-relaxed"
                    style={{ color: colors.muted }}
                  >
                    Mobile rbGyanX evaluates one patient and one plan: physical DVH metrics plus BED, EUD, gEUD, TCP, and NTCP with QUANTEC-style literature parameters (editable). Simple descriptive statistics support plan QA. Full cohort / DICOM pipeline with XAI: use desktop rbGyanX. User help guide: in preparation.
                  </Text>
                </View>
              </View>

              {/* Development credits */}
              <View className="pt-3 border-t" style={{ borderColor: colors.border }}>
                <Text className="text-xs font-semibold text-foreground mb-2" style={{ color: colors.foreground }}>
                  Development Credits
                </Text>
                <Text className="text-xs text-muted leading-relaxed mb-2" style={{ color: colors.muted }}>
                  K. Mondal — original developer, based on the published Python NTCP pipeline (py_ntcpx).
                  Medical Physicist, North Bengal Medical College, Darjeeling, India.
                </Text>
                <Text className="text-xs text-muted leading-relaxed mb-2" style={{ color: colors.muted }}>
                  Co-developed and enhanced by: Cursor, Claude, and Manus AI (mobile rbGyanX, desktop
                  CDSS, and automated QA).
                </Text>
                <Pressable onPress={() => router.push("/product-info")} className="mb-2">
                  <Text className="text-xs" style={{ color: colors.primary }}>
                    Version & feature roadmap →
                  </Text>
                </Pressable>
                <Text className="text-xs text-muted italic mt-2" style={{ color: colors.muted }}>
                  Copyright © rbGyanX Academic Team
                </Text>
              </View>

              {/* Clinical Disclaimer Footer */}
              <View className="pt-3 border-t" style={{ borderColor: colors.border }}>
                <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
                  <Text className="text-xs font-bold mb-1" style={{ color: '#92400E' }}>
                    ⚠️ Clinical Decision Support Framework
                  </Text>
                  <Text className="text-xs" style={{ color: '#92400E', lineHeight: 18 }}>
                    This app provides advisory support only. No autonomous decisions. Clinical decisions are the sole responsibility of licensed clinicians. All recommendations must be carefully reviewed by qualified experts before implementation.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
