import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { MaterialIcons } from "@expo/vector-icons";

export default function BenchmarkComparisonScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const organ = (params.organ as string) || "Parotid";
  const structureType = (params.structureType as "target" | "oar") || "oar";
  const tcp = params.tcp ? parseFloat(params.tcp as string) : undefined;
  const ntcp = params.ntcp ? parseFloat(params.ntcp as string) : undefined;

  const [selectedMetric, setSelectedMetric] = useState<"tcp" | "ntcp">(
    structureType === "target" ? "tcp" : "ntcp",
  );

  const query = trpc.radiobiology.compareToQuantecBenchmark.useQuery({
    organ,
    structureType,
    tcp,
    ntcp,
  });

  if (query.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!query.data?.success || !query.data.data) {
    return (
      <ScreenContainer className="p-6">
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.error, marginTop: 12 }}>
          {query.data?.error ?? "Benchmark unavailable for this organ"}
        </Text>
      </ScreenContainer>
    );
  }

  const { benchmark, comparison: comparisonData } = query.data.data;

  const getSignificanceColor = (significance: string): string => {
    switch (significance) {
      case "excellent":
        return "#22C55E";
      case "good":
        return "#3B82F6";
      case "acceptable":
        return "#F59E0B";
      case "suboptimal":
        return "#EF4444";
      case "poor":
        return "#7F1D1D";
      default:
        return colors.muted;
    }
  };

  const getComplianceIcon = (status: string): string => {
    switch (status) {
      case "compliant":
        return "✓";
      case "warning":
        return "⚠";
      case "non_compliant":
        return "✕";
      default:
        return "?";
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Benchmark Comparison
            </Text>
            <Text className="text-base text-muted">
              {benchmark.organName} • {benchmark.source} {benchmark.year}
            </Text>
          </View>

          {/* Compliance Status Card */}
          <View
            className="bg-surface rounded-2xl p-6 border border-border"
            style={{
              borderLeftWidth: 6,
              borderLeftColor: getSignificanceColor(
                comparisonData.clinicalSignificance
              ),
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-foreground">
                Clinical Significance
              </Text>
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{
                  backgroundColor: getSignificanceColor(
                    comparisonData.clinicalSignificance
                  ),
                }}
              >
                <Text className="text-xl font-bold text-white">
                  {getComplianceIcon(comparisonData.complianceStatus)}
                </Text>
              </View>
            </View>
            <Text
              className="text-2xl font-bold capitalize"
              style={{
                color: getSignificanceColor(
                  comparisonData.clinicalSignificance
                ),
              }}
            >
              {comparisonData.clinicalSignificance}
            </Text>
            <Text className="text-sm text-muted mt-2 capitalize">
              Status: {comparisonData.complianceStatus}
            </Text>
          </View>

          {/* Metric Selector */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setSelectedMetric("tcp")}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor:
                    selectedMetric === "tcp"
                      ? colors.primary
                      : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color:
                    selectedMetric === "tcp" ? "white" : colors.foreground,
                }}
              >
                TCP Comparison
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedMetric("ntcp")}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor:
                    selectedMetric === "ntcp"
                      ? colors.primary
                      : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color:
                    selectedMetric === "ntcp" ? "white" : colors.foreground,
                }}
              >
                NTCP Comparison
              </Text>
            </Pressable>
          </View>

          {/* TCP Comparison */}
          {selectedMetric === "tcp" && (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">
                Tumor Control Probability (TCP)
              </Text>

              {/* Bar Chart */}
              <View className="gap-3">
                {/* User TCP */}
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      Your Plan
                    </Text>
                    <Text className="text-sm font-bold text-primary">
                      {(comparisonData.userTcp * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    className="h-8 bg-primary rounded-lg overflow-hidden"
                    style={{ width: `${comparisonData.userTcp * 100}%` }}
                  />
                </View>

                {/* Benchmark TCP */}
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      QUANTEC Benchmark
                    </Text>
                    <Text className="text-sm font-bold text-muted">
                      {(comparisonData.benchmarkTcp * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    className="h-8 bg-muted rounded-lg overflow-hidden opacity-50"
                    style={{ width: `${comparisonData.benchmarkTcp * 100}%` }}
                  />
                </View>
              </View>

              {/* Deviation */}
              <View className="bg-background rounded-lg p-4 mt-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted">Deviation</Text>
                  <Text
                    className="text-lg font-bold"
                    style={{
                      color:
                        comparisonData.tcpDeviation > 0
                          ? "#22C55E"
                          : "#EF4444",
                    }}
                  >
                    {comparisonData.tcpDeviation > 0 ? "+" : ""}
                    {comparisonData.tcpDeviation.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* NTCP Comparison */}
          {selectedMetric === "ntcp" && (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">
                Normal Tissue Complication Probability (NTCP)
              </Text>

              {/* Bar Chart */}
              <View className="gap-3">
                {/* User NTCP */}
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      Your Plan
                    </Text>
                    <Text className="text-sm font-bold text-warning">
                      {(comparisonData.userNtcp * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    className="h-8 bg-warning rounded-lg overflow-hidden"
                    style={{ width: `${comparisonData.userNtcp * 100}%` }}
                  />
                </View>

                {/* Benchmark NTCP */}
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      QUANTEC Limit
                    </Text>
                    <Text className="text-sm font-bold text-muted">
                      {(comparisonData.benchmarkNtcp * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    className="h-8 bg-muted rounded-lg overflow-hidden opacity-50"
                    style={{ width: `${comparisonData.benchmarkNtcp * 100}%` }}
                  />
                </View>
              </View>

              {/* Deviation */}
              <View className="bg-background rounded-lg p-4 mt-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted">Deviation</Text>
                  <Text
                    className="text-lg font-bold"
                    style={{
                      color:
                        comparisonData.ntcpDeviation < 0
                          ? "#22C55E"
                          : "#EF4444",
                    }}
                  >
                    {comparisonData.ntcpDeviation > 0 ? "+" : ""}
                    {comparisonData.ntcpDeviation.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recommendation Card */}
          <View className="bg-blue-50 dark:bg-blue-900 rounded-2xl p-6 border border-blue-200 dark:border-blue-700 gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl">💡</Text>
              <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Recommendation
              </Text>
            </View>
            <Text className="text-base text-blue-800 dark:text-blue-200 leading-relaxed">
              {comparisonData.recommendation}
            </Text>
          </View>

          {/* Metrics Summary */}
          <View className="grid grid-cols-2 gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted mb-2">TCP Target</Text>
              <Text className="text-xl font-bold text-foreground">
                {(comparisonData.benchmarkTcp * 100).toFixed(1)}%
              </Text>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted mb-2">NTCP Limit</Text>
              <Text className="text-xl font-bold text-foreground">
                {(comparisonData.benchmarkNtcp * 100).toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Source Information */}
          <View className="bg-background rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted mb-2">Benchmark Source</Text>
            <Text className="text-sm font-medium text-foreground">
              QUANTEC Consortium (2010)
            </Text>
            <Text className="text-xs text-muted mt-1">
              Organ: {comparisonData.organName} • Model:{" "}
              {comparisonData.modelType}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
