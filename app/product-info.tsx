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

          <Section title="Credits & acknowledgments" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              <Text style={{ fontWeight: "600", color: colors.foreground }}>Primary developer: </Text>
              K. Mondal (Medical Physicist), North Bengal Medical College, Darjeeling, India
            </Text>
            <Text className="text-sm leading-relaxed mt-2" style={{ color: colors.muted }}>
              <Text style={{ fontWeight: "600", color: colors.foreground }}>Foundation: </Text>
              Original NTCP Analysis Pipeline (K. Mondal)
            </Text>
            <Text className="text-sm leading-relaxed mt-2" style={{ color: colors.muted }}>
              <Text style={{ fontWeight: "600", color: colors.foreground }}>Enhancement: </Text>
              Claude AI (Anthropic) · Manus AI development platform · automated unit tests &amp; QA
            </Text>
            <Text className="text-xs italic mt-3" style={{ color: colors.muted }}>
              Copyright © rbGyanX Academic Team
            </Text>
          </Section>

          <Section title="Clinical presets vs TCP/NTCP" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              Upload radiobiocalc_clinical_input.xlsx on DVH import or plan setup. Toggle
              “Apply covariates to calculation” for exploratory NTCP adjustment (log-odds priors).
              TCP covariates are inactive when model TCP is at ceiling (≥99.5%).
            </Text>
          </Section>

          <Section title="DVH & clinical import" colors={colors}>
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              Copy composite DVH .txt to Downloads/rbGyaX_mobile_app_input/. Optionally upload
              radiobiocalc_clinical_input.xlsx from the import or setup screen.
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
