/**
 * Toggle-based visual guide overlay on home screen.
 */
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import {
  GUIDE_STEPS,
  guideVersionLabel,
  isVisualGuideEnabled,
  markGuideVersionSeen,
  setVisualGuideEnabled,
  shouldShowGuideUpdateBanner,
} from "@/lib/user-guide-catalog";

export function VisualGuidePanel() {
  const colors = useColors();
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const refresh = useCallback(async () => {
    setEnabled(await isVisualGuideEnabled());
    setShowUpdate(await shouldShowGuideUpdateBanner());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleGuide = async (on: boolean) => {
    await setVisualGuideEnabled(on);
    setEnabled(on);
    if (on) setExpanded(true);
  };

  const dismissUpdate = async () => {
    await markGuideVersionSeen();
    setShowUpdate(false);
  };

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 10 }}
      >
        <MaterialIcons name="menu-book" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>Visual user guide</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{guideVersionLabel()}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggleGuide}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={24}
          color={colors.muted}
        />
      </Pressable>

      {showUpdate && enabled && (
        <Pressable
          onPress={dismissUpdate}
          style={{
            marginHorizontal: 12,
            marginBottom: 8,
            padding: 10,
            borderRadius: 8,
            backgroundColor: "#DBEAFE",
          }}
        >
          <Text style={{ fontSize: 12, color: "#1E40AF" }}>
            Guide updated for indices, multi-model output, clinical xlsx covariates, and PDF labels.
            Tap to dismiss.
          </Text>
        </Pressable>
      )}

      {enabled && expanded && (
        <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
          {GUIDE_STEPS.map((step) => (
            <View
              key={step.id}
              style={{
                paddingHorizontal: 14,
                paddingBottom: 12,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 10,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {step.icon ? (
                  <MaterialIcons
                    name={step.icon as keyof typeof MaterialIcons.glyphMap}
                    size={18}
                    color={colors.primary}
                  />
                ) : null}
                <Text style={{ fontWeight: "600", fontSize: 13, color: colors.foreground }}>
                  {step.title}
                </Text>
              </View>
              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>{step.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
