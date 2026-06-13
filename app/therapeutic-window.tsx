/**
 * Therapeutic Window — composite plan (target TCP + OAR NTCPs).
 * UTCP, P+, CFTC, TWI per Lee / Brahme / Ågren / rbGyanX.
 */

import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { TherapeuticWindowChart } from "@/components/therapeutic-window-chart";
import { TcpModelCaution } from "@/components/tcp-model-caution";
import { useEffect, useState } from "react";
import { loadPlanEvalSession } from "@/lib/plan-eval-session";
import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";
import { capTcpForDisplay, formatTcpPercent } from "@/lib/tcp-display";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export default function TherapeuticWindowScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const planEvalSessionId = params.planEvalSessionId as string | undefined;

  const [evalData, setEvalData] = useState<CompositePlanEvaluation | null>(null);
  const [loading, setLoading] = useState(!!planEvalSessionId);

  useEffect(() => {
    if (!planEvalSessionId) {
      setLoading(false);
      return;
    }
    loadPlanEvalSession(planEvalSessionId).then((data) => {
      setEvalData(data);
      setLoading(false);
    });
  }, [planEvalSessionId]);

  const tw = evalData?.therapeutic;
  const dose = evalData?.totalDose ?? parseFloat((params.totalDose as string) || "70");
  const tcp = tw?.tcp ?? capTcpForDisplay(parseFloat((params.tcp as string) || "0")).display;
  const ntcp =
    tw?.ntcpComposite ?? parseFloat((params.ntcp as string) || "0");
  const idx = evalData?.targetIndices;
  const showTcpCaution =
    tw?.tcpCapped ||
    evalData?.structureResults.some(
      (s) => s.structureType === "target" && (s.tcp ?? 0) > 0.95,
    );

  if (loading) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.muted }}>
          Computing plan therapeutic metrics…
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8 px-4 pt-4">
          <View className="gap-2">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
                <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                  Therapeutic window
                </Text>
              </View>
            </Pressable>
            <Text className="text-sm" style={{ color: colors.muted }}>
              Composite plan at {dose.toFixed(0)} Gy
              {evalData?.primaryTarget ? ` · ${evalData.primaryTarget}` : ""}
              {tw ? ` · TWI ${tw.twiInterpretation}` : ""}
            </Text>
          </View>

          <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
            <TherapeuticWindowChart tcp={tcp} ntcp={ntcp} dose={dose} />
          </View>

          {(tw || showTcpCaution) && (
            <TcpModelCaution showCapFootnote={!!tw?.tcpCapped} />
          )}

          {tw && (
            <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                Plan-level metrics
              </Text>
              <MetricRow
                label="TCP (target)"
                value={formatTcpPercent(tw.tcpRaw ?? tw.tcp)}
                sub={tw.tcpStructure}
              />
              <MetricRow label="UTCP (CFTC)" value={pct(tw.utcp)} sub="TCP × Π(1−NTCP)" />
              <MetricRow label="P+ (Brahme)" value={pct(tw.pPlus)} sub="TCP − NTCP_critical" />
              <MetricRow label="TWI" value={pct(tw.twi)} sub={tw.twiInterpretation} />
              <MetricRow label="Max OAR NTCP" value={pct(tw.ntcpComposite)} />
            </View>
          )}

          {idx && (
            <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: colors.surface }}>
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                Target indices — {idx.techniqueProfile === "sbrt" ? "SRS/SRT/SBRT" : idx.techniqueProfile}
              </Text>
              <Text className="text-xs leading-relaxed" style={{ color: colors.muted }}>
                {idx.indexPackNote}
              </Text>
              <MetricRow label="TCI (V≥Rx)" value={`${idx.tciPercent.toFixed(1)}%`} />
              <MetricRow label="CI RTOG (target DVH)" value={idx.ciRtog.toFixed(3)} />
              <MetricRow label="HI ICRU (D2/D98)" value={idx.hiIcu.toFixed(3)} />
              <MetricRow label="HI modified" value={idx.hiModified.toFixed(3)} />
              {idx.ciPaddick != null && (
                <MetricRow label="CI Paddick" value={idx.ciPaddick.toFixed(3)} />
              )}
              {idx.gradientIndex != null && (
                <MetricRow label="Gradient index (V50/V100)" value={idx.gradientIndex.toFixed(3)} />
              )}
            </View>
          )}

          {evalData?.planExplanation && (
            <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                {evalData.planExplanation.headline}
              </Text>
              <Text className="text-xs leading-relaxed" style={{ color: colors.muted }}>
                {evalData.planExplanation.rbXScope}
              </Text>
              {evalData.planExplanation.bullets.map((b, i) => (
                <View key={`${b.title}-${i}`} className="gap-1">
                  <Text className="text-sm font-medium" style={{ color: colors.foreground }}>
                    {b.title}
                  </Text>
                  <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
                    {b.detail}
                  </Text>
                  {b.citation ? (
                    <Text className="text-xs italic" style={{ color: colors.muted }}>
                      {b.citation}
                    </Text>
                  ) : null}
                </View>
              ))}
              {evalData.planExplanation.limitations.map((line) => (
                <Text key={line} className="text-xs" style={{ color: colors.muted }}>
                  • {line}
                </Text>
              ))}
            </View>
          )}

          {evalData && evalData.structureResults.length > 0 && (
            <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: colors.surface }}>
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                Per-structure
              </Text>
              {evalData.structureResults.map((s) => (
                <Text key={s.structureName} className="text-sm" style={{ color: colors.muted }}>
                  {s.structureName}:{" "}
                  {s.structureType === "target"
                    ? `TCP ${formatTcpPercent(s.tcp ?? 0)}`
                    : `NTCP ${pct(s.ntcp ?? 0)}`}
                  {s.literatureOrgan ? ` (${s.literatureOrgan})` : ""}
                </Text>
              ))}
            </View>
          )}

          {!evalData && (
            <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: colors.surface }}>
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                Interpretation
              </Text>
              <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
                Upload a composite DVH (3-column CSV with structure names) or select multiple
                structure files (PTV + OARs). Then run calculation and open therapeutic window from
                results.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const colors = useColors();
  return (
    <View className="flex-row justify-between items-start">
      <Text className="text-sm" style={{ color: colors.muted }}>
        {label}
      </Text>
      <View className="items-end">
        <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
          {value}
        </Text>
        {sub ? (
          <Text className="text-xs" style={{ color: colors.muted }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
