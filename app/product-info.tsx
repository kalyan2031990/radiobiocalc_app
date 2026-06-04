/**
 * Product information — version, intended use, roadmap, validation & help status.
 */

import type { ReactNode } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { AppVersionBadge } from "@/components/app-version-badge";
import { RbgyanxLogo } from "@/components/rbgyanx-logo";
import { APP_TAGLINE, INTENDED_USE } from "@/lib/app-meta";
import { MOBILE_FEATURE_ROADMAP, type RoadmapItemStatus } from "@/lib/feature-roadmap";

function statusLabel(s: RoadmapItemStatus): string {
  if (s === "shipped") return "Shipped";
  if (s === "in_progress") return "In progress";
  return "Planned";
}

function statusColor(s: RoadmapItemStatus, colors: ReturnType<typeof useColors>): string {
  if (s === "shipped") return colors.success;
  if (s === "in_progress") return colors.warning;
  return colors.muted;
}

export default function ProductInfoScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View className="gap-6 px-4 pt-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
              <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Product & validation
              </Text>
            </View>
          </Pressable>

          <RbgyanxLogo size="md" />
          <AppVersionBadge centered />
          <Text className="text-sm text-center" style={{ color: colors.muted }}>
            {APP_TAGLINE}
          </Text>

          <Section title="Clinical presets vs TCP/NTCP" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              Optional fields (age, BMI, HPV, smoking, concurrent chemo, etc.) support MDT
              traceability and future multivariable adjustment (py_ntcpx-style). They do not
              change dose–response math today — only DVH and literature LQ parameters do.
              See docs/GAP_AUDIT.md.
            </Text>
          </Section>

          <Section title="Intended use" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              {INTENDED_USE.short}
            </Text>
            <Text className="text-sm leading-relaxed mt-2" style={{ color: colors.foreground }}>
              {INTENDED_USE.desktop}
            </Text>
          </Section>

          <Section title="Documentation" colors={colors}>
            <Text className="text-sm" style={{ color: colors.warning }}>
              {INTENDED_USE.helpDocStatus}
            </Text>
            <Text className="text-sm mt-2 leading-relaxed" style={{ color: colors.muted }}>
              {INTENDED_USE.validationStatus}
            </Text>
            <Text className="text-xs mt-2" style={{ color: colors.muted }}>
              Repository: docs/VALIDATION_AND_RELEASE.md · docs/USER_HELP.md (draft) ·
              docs/BENCHMARK_CASES.md
            </Text>
          </Section>

          <Section title="Feature roadmap (mobile)" colors={colors}>
            <Text className="text-xs mb-2" style={{ color: colors.muted }}>
              Updated with each release; more modules can be added over time.
            </Text>
            {MOBILE_FEATURE_ROADMAP.map((item) => (
              <View key={item.id} className="flex-row gap-2 mb-2">
                <Text style={{ color: statusColor(item.status, colors), fontSize: 11, width: 72 }}>
                  {statusLabel(item.status)}
                </Text>
                <View className="flex-1">
                  <Text className="text-sm" style={{ color: colors.foreground }}>
                    {item.title}
                  </Text>
                  {item.note ? (
                    <Text className="text-xs" style={{ color: colors.muted }}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Section>

          <Section title="Clinical disclaimer" colors={colors}>
            <View
              style={{
                backgroundColor: "#FEF3C7",
                padding: 12,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: "#F59E0B",
              }}
            >
              <Text className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                Plan evaluation assistant for research and education. Outputs require review by
                qualified medical physicists and radiation oncologists. Not FDA/CE cleared as a
                standalone treatment decision device unless your institution qualifies use under
                local policy.
              </Text>
            </View>
          </Section>

          <Section title="Framework" colors={colors}>
            <Text className="text-sm" style={{ color: colors.muted }}>
              React Native (Expo) · TypeScript · tRPC API · aligns with desktop rbGyanX Python
              engine for cross-checks.
            </Text>
          </Section>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: ReactNode;
}) {
  return (
    <View
      className="rounded-xl p-4 gap-2"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <Text className="font-semibold" style={{ color: colors.foreground }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
