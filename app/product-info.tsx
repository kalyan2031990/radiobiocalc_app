/**
 * Product information — version, intended use, validation & help status.
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
import { isClinicianMobileApk, showDeveloperTools } from "@/lib/clinician-build";

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
                {isClinicianMobileApk() ? "About rbGyanX" : "Product & validation"}
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
              Optional fields (age, chemo, smoking, etc.) support MDT documentation on this device.
              They do not change dose–response math unless advanced covariate adjustment is enabled
              on desktop rbGyanX.
            </Text>
          </Section>

          <Section title="DVH import" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              Copy PTV and OAR plan .txt files to your phone Downloads folder, then use
              Import combined plan in the app.
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

          {!isClinicianMobileApk() && (
            <Section title="Documentation" colors={colors}>
              <Text className="text-sm" style={{ color: colors.warning }}>
                {INTENDED_USE.helpDocStatus}
              </Text>
              {showDeveloperTools() ? (
                <>
                  <Text className="text-sm mt-2 leading-relaxed" style={{ color: colors.muted }}>
                    {INTENDED_USE.validationStatus}
                  </Text>
                  <Text className="text-xs mt-2" style={{ color: colors.muted }}>
                    Repository: docs/VALIDATION_AND_RELEASE.md · docs/validation/
                  </Text>
                </>
              ) : null}
            </Section>
          )}

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

          {!isClinicianMobileApk() && (
            <Section title="Framework" colors={colors}>
              <Text className="text-sm" style={{ color: colors.muted }}>
                React Native (Expo) · TypeScript · aligns with desktop rbGyanX for cross-checks.
              </Text>
            </Section>
          )}
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
