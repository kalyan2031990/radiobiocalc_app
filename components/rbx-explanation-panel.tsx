/**
 * rb X explainability panel — citation-linked XAI narrative.
 */

import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { PlanExplanation } from "@/lib/rbgyanx-explain";

type Props = {
  explanation: PlanExplanation;
};

export function RbXExplanationPanel({ explanation }: Props) {
  const colors = useColors();

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
        {explanation.headline}
      </Text>
      <View
        style={{
          borderRadius: 8,
          padding: 10,
          backgroundColor: colors.primary + "14",
          borderWidth: 1,
          borderColor: colors.primary + "40",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
          rbGyanX — the X is explainability (XAI)
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 4 }}>
          {explanation.rbXScope}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {explanation.techniqueProfile} · {explanation.indexPackNote}
      </Text>
      {explanation.bullets.map((b, i) => (
        <View key={`${b.title}-${i}`} style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
            {b.title}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 20, color: colors.muted }}>
            {b.detail}
          </Text>
          {b.citation ? (
            <Text style={{ fontSize: 11, fontStyle: "italic", color: colors.muted }}>
              {b.citation}
            </Text>
          ) : null}
        </View>
      ))}
      <View style={{ gap: 4, marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
          Limitations
        </Text>
        {explanation.limitations.map((line) => (
          <Text key={line} style={{ fontSize: 11, color: colors.muted }}>
            • {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
