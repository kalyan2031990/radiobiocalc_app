/**
 * Clinician user guide — synced with lib/user-guide-catalog.ts (GUIDE_CONTENT_VERSION).
 */
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { AppVersionBadge } from "@/components/app-version-badge";
import { TCP_CAPPED_FOOTNOTE, TCP_MODEL_CAUTION } from "@/lib/tcp-display";
import { GUIDE_STEPS, guideVersionLabel } from "@/lib/user-guide-catalog";
import { VisualGuidePanel } from "@/components/visual-guide-panel";

export default function MobileUserGuideScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}>
        <Pressable onPress={() => router.back()}>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>
              User guide
            </Text>
          </View>
        </Pressable>

        <AppVersionBadge centered />
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
          {guideVersionLabel()}
        </Text>

        <VisualGuidePanel />

        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          rbGyanX Mobile evaluates one patient and one plan offline. Physical metrics follow
          QUANTEC/RTOG by technique; composite reports show all TCP/NTCP models and exploratory
          clinical covariates when xlsx is linked.
        </Text>

        {GUIDE_STEPS.map((s) => (
          <View
            key={s.id}
            style={{
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.foreground }}>{s.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{s.body}</Text>
          </View>
        ))}

        <View
          style={{
            borderRadius: 12,
            padding: 14,
            backgroundColor: "#FEF3C7",
            borderLeftWidth: 4,
            borderLeftColor: "#F59E0B",
            gap: 6,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13, color: "#92400E" }}>TCP model caution</Text>
          <Text style={{ fontSize: 12, color: "#92400E", lineHeight: 18 }}>{TCP_MODEL_CAUTION}</Text>
          <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 17 }}>{TCP_CAPPED_FOOTNOTE}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
