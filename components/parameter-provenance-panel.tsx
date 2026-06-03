/**
 * Gyan — literature provenance for model parameters (Phase 2a).
 */

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Props = {
  organ: string;
  model: string;
};

export function ParameterProvenancePanel({ organ, model }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { data, isLoading } = trpc.radiobiology.getLiteratureProvenance.useQuery({
    organ,
    model,
  });

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} />;
  }

  if (!data?.success || !data.data) {
    return (
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        No literature provenance found for {organ} / {model}.
      </Text>
    );
  }

  const p = data.data;

  return (
    <View className="gap-3">
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
        Literature provenance (Gyan)
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {p.modelLabel} · {p.organ}
        {p.classification
          ? ` · ${p.classification.category} (${p.classification.seriality} OAR)`
          : ""}
      </Text>

      {p.organCitation ? (
        <View
          style={{
            padding: 10,
            borderRadius: 8,
            backgroundColor: colors.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.foreground, lineHeight: 18 }}>
            {p.organCitation}
          </Text>
        </View>
      ) : null}

      {p.parameterNotes.map((note) => (
        <View key={note.key} className="flex-row gap-2">
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary, width: 48 }}>
            {note.label}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.foreground }}>
              {typeof p.parameters[note.key] === "number"
                ? p.parameters[note.key].toFixed(4)
                : "—"}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{note.literatureRole}</Text>
          </View>
        </View>
      ))}

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: 4 }}>
        References
      </Text>
      {p.references.map((ref) => (
        <Text key={ref.id} style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
          [{ref.source}] {ref.citation}
        </Text>
      ))}

      <Pressable onPress={() => router.push("/references")}>
        <Text style={{ color: colors.primary, fontSize: 13, textAlign: "center" }}>
          Open full reference library →
        </Text>
      </Pressable>
    </View>
  );
}
