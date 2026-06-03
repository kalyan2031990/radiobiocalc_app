/**
 * DVH visualization from loaded plan session (Phase 2b).
 */

import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { DVHChart, type DVHPoint } from "@/components/dvh-chart";
import { trpc } from "@/lib/trpc";
import { loadDvhSession } from "@/lib/dvh-session";
import { structureKeys, type ParsedDvhBundle } from "@/lib/plan-evaluation";
import { inferEvaluationRole } from "@/lib/structure-role";

type StructureRow = {
  name: string;
  type: "target" | "oar";
  maxDose: number;
  meanDose: number;
  minDose: number;
  points: DVHPoint[];
};

function statsFromDvh(points: DVHPoint[]) {
  if (!points.length) return { maxDose: 0, meanDose: 0, minDose: 0 };
  const doses = points.map((p) => p.dose);
  const maxDose = Math.max(...doses);
  const minDose = Math.min(...doses);
  let sum = 0;
  let w = 0;
  for (let i = 1; i < points.length; i++) {
    const v1 = points[i - 1].volume;
    const v2 = points[i].volume;
    const d1 = points[i - 1].dose;
    const d2 = points[i].dose;
    const slice = Math.abs(v1 - v2);
    sum += ((d1 + d2) / 2) * slice;
    w += slice;
  }
  return { maxDose, minDose, meanDose: w > 0 ? sum / w : doses[0] };
}

function bundleToStructures(bundle: ParsedDvhBundle, fileHint: string): StructureRow[] {
  return structureKeys(bundle).map((name) => {
    const pts = (bundle.dvhByStructure[name] ?? []).map((p) => ({
      dose: p.dose,
      volume: p.volume,
    }));
    const st = statsFromDvh(pts);
    return {
      name,
      type: inferEvaluationRole(name, fileHint),
      maxDose: st.maxDose,
      meanDose: st.meanDose,
      minDose: st.minDose,
      points: pts,
    };
  });
}

export default function DVHVisualizationScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const dvhSessionId = params.dvhSessionId as string | undefined;
  const serverDvhSessionId = params.serverDvhSessionId as string | undefined;
  const fileName = (params.fileName as string) || "";

  const [bundle, setBundle] = useState<ParsedDvhBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const serverQuery = trpc.radiobiology.getDvhSession.useQuery(
    { sessionId: serverDvhSessionId! },
    { enabled: !!serverDvhSessionId && !bundle },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (dvhSessionId) {
        const b = await loadDvhSession(dvhSessionId);
        if (!cancelled) setBundle(b);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dvhSessionId]);

  useEffect(() => {
    if (serverQuery.data?.success && serverQuery.data.data) {
      setBundle(serverQuery.data.data as ParsedDvhBundle);
      setLoading(false);
    }
  }, [serverQuery.data]);

  const structures = useMemo(
    () => (bundle ? bundleToStructures(bundle, fileName) : []),
    [bundle, fileName],
  );

  const [selected, setSelected] = useState<StructureRow | null>(null);

  useEffect(() => {
    if (structures.length && !selected) setSelected(structures[0]);
  }, [structures, selected]);

  if (loading || serverQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!structures.length) {
    return (
      <ScreenContainer className="p-6">
        <Text style={{ color: colors.muted }}>No DVH data — import a plan first.</Text>
      </ScreenContainer>
    );
  }

  const active = selected ?? structures[0];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          DVH curves
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          From your loaded plan ({structures.length} structure{structures.length > 1 ? "s" : ""})
        </Text>

        {structures.map((s) => (
          <Pressable key={s.name} onPress={() => setSelected(s)}>
            <View
              style={{
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: selected?.name === s.name ? colors.primary : colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>{s.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {s.type} · mean {s.meanDose.toFixed(1)} Gy · max {s.maxDose.toFixed(1)} Gy
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 280, backgroundColor: colors.surface, borderRadius: 12 }}>
          <DVHChart data={active.points} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
