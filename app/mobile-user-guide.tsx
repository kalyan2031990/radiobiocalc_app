/**
 * Clinician user guide — mobile offline workflow.
 */
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { AppVersionBadge } from "@/components/app-version-badge";
import { TCP_CAPPED_FOOTNOTE, TCP_MODEL_CAUTION } from "@/lib/tcp-display";

const STEPS = [
  {
    title: "1. Copy DVH files to the phone",
    body:
      "Copy rbGyanX composite DVH .txt files (one file per patient: PTV + OARs) to Downloads/rbGyaX_mobile_app_input/ on the phone. You can also use separate PTV and OAR exports — use USB, email → Save, or a cloud app.",
  },
  {
    title: "2. Import combined plan",
    body:
      "Home → Import plan DVH → Refresh Downloads list → tap one composite file (or Import combined plan for multiple files). The app lists .txt files in Download and Download/rbGyaX_mobile_app_input/. If the list is empty, use Pick DVH files. Continue to setup when 2+ structures are shown.",
  },
  {
    title: "3. Patient & plan setup",
    body:
      "Enter Patient ID and plan label. Choose cancer site, technique, total dose and fractions. Select the structure to evaluate (target for TCP, OAR for NTCP).",
  },
  {
    title: "4. Clinical context (optional)",
    body:
      "Upload radiobiocalc_clinical_input.xlsx (optional) on the clinical data step for traceability and MDT documentation. Covariates do not change TCP/NTCP on mobile unless advanced adjustment is enabled on desktop.",
  },
  {
    title: "5. Run calculation & results",
    body:
      "Tap Run calculation. Review TCP or NTCP, dose metrics (BED, EUD, gEUD), plan statistics, and rb X explainability. Export PDF/DOCX from the results screen when needed.",
  },
  {
    title: "Therapeutic window",
    body:
      "When PTV and OAR are imported together, the therapeutic window screen shows composite TCP (Poisson-LQ DVH for head & neck, capped at 95% for display), NTCP, UTCP and TWI. Use NTCP/TWI and dose metrics to compare plans.",
  },
  {
    title: "Play Store beta",
    body:
      "Validated on 17 composite DVH cases (rbGyaX_mobile_app_input). Import from Download/rbGyaX_mobile_app_input/. Report issues via your beta channel; do not use for autonomous treatment authorization.",
  },
];

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

        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          rbGyanX Mobile evaluates one patient and one plan offline. No Wi‑Fi or hospital server is
          required for TCP/NTCP.
        </Text>

        {STEPS.map((s) => (
          <View
            key={s.title}
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
          <Text style={{ fontWeight: "700", fontSize: 13, color: "#92400E" }}>
            TCP model caution
          </Text>
          <Text style={{ fontSize: 12, color: "#92400E", lineHeight: 18 }}>
            {TCP_MODEL_CAUTION}
          </Text>
          <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 17 }}>
            {TCP_CAPPED_FOOTNOTE}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 12,
            padding: 14,
            backgroundColor: "#FEF3C7",
            borderLeftWidth: 4,
            borderLeftColor: "#F59E0B",
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13, color: "#92400E" }}>
            Clinical disclaimer
          </Text>
          <Text style={{ fontSize: 12, color: "#92400E", marginTop: 6, lineHeight: 18 }}>
            Research and educational decision support only. Licensed clinicians remain responsible
            for all treatment decisions.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
