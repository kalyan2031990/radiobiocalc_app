/**
 * Browsable parameter library with citations (F4).
 */

import { ScrollView, Text, View, Pressable, TextInput, Linking } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  filterParameterLibrary,
  getLibraryCategories,
  getLibraryOrgans,
  getModelLabel,
  PARAMETER_LIBRARY_VERSION,
  citationUrl,
  type ParameterLibraryEntry,
} from "@/lib/parameter-library";

function EntryCard({
  entry,
  colors,
  onPress,
}: {
  entry: ParameterLibraryEntry;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          padding: 12,
          borderRadius: 10,
          marginBottom: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.foreground }}>{entry.organ}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{entry.endpoint}</Text>
        <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>
          {getModelLabel(entry.model)} · TD50 {entry.parameters.td50?.toFixed(1) ?? entry.parameters.d50?.toFixed(1)} Gy
        </Text>
      </View>
    </Pressable>
  );
}

export default function ParameterLibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [organ, setOrgan] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [selected, setSelected] = useState<ParameterLibraryEntry | null>(null);

  const entries = useMemo(
    () => filterParameterLibrary({ query, organ, category }),
    [query, organ, category],
  );

  const organs = getLibraryOrgans();
  const categories = getLibraryCategories();

  if (selected) {
    const url = citationUrl(selected);
    return (
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Pressable onPress={() => setSelected(null)}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>{selected.organ}</Text>
          <Text style={{ color: colors.muted }}>{selected.endpoint}</Text>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>{getModelLabel(selected.model)}</Text>
          <View style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 8 }}>
            {(["td50", "m", "n", "gamma50", "alphaBeta"] as const).map((k) =>
              selected.parameters[k] != null ? (
                <Text key={k} style={{ color: colors.foreground, fontSize: 13 }}>
                  {k}: {selected.parameters[k]}
                </Text>
              ) : null,
            )}
            {selected.ci95 && (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                Published 95% CI:{" "}
                {Object.entries(selected.ci95)
                  .map(([k, v]) => `${k} [${v.low}–${v.high}]`)
                  .join("; ")}
              </Text>
            )}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Cohort: {selected.cohort} · {selected.fractionation}
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
            {selected.citation.authors} {selected.citation.title}. {selected.citation.journal}. {selected.citation.year}.
          </Text>
          {url && (
            <Pressable onPress={() => Linking.openURL(url)}>
              <Text style={{ color: colors.primary, textDecorationLine: "underline" }}>View source (opens browser)</Text>
            </Pressable>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Parameter library</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>v{PARAMETER_LIBRARY_VERSION} · offline catalogue · primary literature only</Text>

        <TextInput
          placeholder="Search organ, endpoint, model…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 10,
            color: colors.foreground,
            backgroundColor: colors.surface,
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          <Pressable onPress={() => setOrgan(undefined)} style={{ marginRight: 8 }}>
            <Text style={{ color: !organ ? colors.primary : colors.muted }}>All organs</Text>
          </Pressable>
          {organs.slice(0, 8).map((o) => (
            <Pressable key={o} onPress={() => setOrgan(o === organ ? undefined : o)} style={{ marginRight: 12 }}>
              <Text style={{ color: organ === o ? colors.primary : colors.muted, fontSize: 13 }}>{o}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
          {categories.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c === category ? undefined : c)} style={{ marginRight: 12 }}>
              <Text style={{ color: category === c ? colors.primary : colors.muted, fontSize: 12 }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ color: colors.muted, fontSize: 12 }}>{entries.length} entries</Text>
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} colors={colors} onPress={() => setSelected(e)} />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
