/**
 * Gyan — searchable literature reference library (Phase 2a).
 */

import { useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

export default function ReferencesScreen() {
  const router = useRouter();
  const colors = useColors();
  const [query, setQuery] = useState("");
  const { data, isLoading } = trpc.radiobiology.getReferenceLibrary.useQuery();

  const filtered = useMemo(() => {
    const list = data?.success ? data.data : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.citation.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          Reference library (Gyan)
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          QUANTEC, LKB, Zaider–Minerbo, and rbGyanX therapeutic-window sources used in mobile
          calculations.
        </Text>
        <TextInput
          placeholder="Search citations…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
            color: colors.foreground,
          }}
        />
        {isLoading ? (
          <Text style={{ color: colors.muted }}>Loading…</Text>
        ) : (
          filtered.map((ref) => (
            <View
              key={ref.id}
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                {ref.source}
                {ref.year ? ` · ${ref.year}` : ""}
              </Text>
              <Text style={{ fontSize: 13, color: colors.foreground, marginTop: 6, lineHeight: 20 }}>
                {ref.citation}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
