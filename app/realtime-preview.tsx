import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface PreviewResults {
  tcp: number;
  ntcp: number;
  bed: number;
  eqd2: number;
  therapeuticIndex: number;
  confidence: string;
}

export default function RealtimePreview() {
  const router = useRouter();
  const colors = useColors();
  
  const [dosePerFraction, setDosePerFraction] = useState("2.0");
  const [numberOfFractions, setNumberOfFractions] = useState("30");
  const [alphaBeta, setAlphaBeta] = useState("10");
  const [results, setResults] = useState<PreviewResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [baseline, setBaseline] = useState<PreviewResults | null>(null);

  // Debounced calculation function
  const calculateResults = useCallback((dpf: string, nfx: string, ab: string) => {
    const d = parseFloat(dpf);
    const n = parseFloat(nfx);
    const alphabeta = parseFloat(ab);

    if (isNaN(d) || isNaN(n) || isNaN(alphabeta) || d <= 0 || n <= 0 || alphabeta <= 0) {
      setResults(null);
      return;
    }

    setIsCalculating(true);

    // Simulate calculation delay for realism
    setTimeout(() => {
      const totalDose = d * n;
      const bed = totalDose * (1 + d / alphabeta);
      const eqd2 = totalDose * ((alphabeta + d) / (alphabeta + 2));

      // Simplified TCP calculation (Poisson model)
      const D50 = 50; // Example D50 for tumor
      const gamma50 = 2; // Example gamma50
      const tcp = 1 / (1 + Math.pow(D50 / totalDose, 4 * gamma50));

      // Simplified NTCP calculation (LKB model approximation)
      const TD50 = 60; // Example TD50 for OAR
      const m = 0.3; // Example m parameter
      // Approximate erf function
      const x = (totalDose - TD50) / (m * TD50 * Math.sqrt(2));
      const t = 1 / (1 + 0.3275911 * Math.abs(x));
      const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
      const ntcp = 0.5 * (1 + (x >= 0 ? erf : -erf));

      const therapeuticIndex = tcp / (ntcp + 0.01); // Avoid division by zero

      const newResults: PreviewResults = {
        tcp: tcp * 100,
        ntcp: ntcp * 100,
        bed,
        eqd2,
        therapeuticIndex,
        confidence: d <= 4 ? "high" : d <= 6 ? "medium" : "low",
      };

      setResults(newResults);
      setIsCalculating(false);

      // Set baseline on first calculation
      if (!baseline) {
        setBaseline(newResults);
      }
    }, 300);
  }, [baseline]);

  // Debounced effect for real-time updates
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateResults(dosePerFraction, numberOfFractions, alphaBeta);
    }, 500);

    return () => clearTimeout(timer);
  }, [dosePerFraction, numberOfFractions, alphaBeta, calculateResults]);

  const resetBaseline = () => {
    setBaseline(results);
  };

  const getDifference = (current: number, baseline: number) => {
    const diff = current - baseline;
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(2)}`;
  };

  const getDifferenceColor = (current: number, baseline: number, higherIsBetter: boolean) => {
    const diff = current - baseline;
    if (Math.abs(diff) < 0.1) return colors.muted;
    if (higherIsBetter) {
      return diff > 0 ? colors.success : colors.error;
    } else {
      return diff < 0 ? colors.success : colors.error;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground">Real-Time Calculation Preview</Text>
          <Text className="text-base text-muted mt-2">
            Adjust parameters and see instant TCP/NTCP updates
          </Text>
        </View>

        {/* Input Parameters */}
        <View className="bg-surface border border-border rounded-xl p-4 gap-4 mb-6">
          <Text className="text-lg font-semibold text-foreground">Treatment Parameters</Text>

          <View className="gap-2">
            <Text className="text-base font-medium text-foreground">Dose Per Fraction (Gy)</Text>
            <TextInput
              className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
              placeholder="e.g., 2.0"
              keyboardType="decimal-pad"
              value={dosePerFraction}
              onChangeText={setDosePerFraction}
            />
          </View>

          <View className="gap-2">
            <Text className="text-base font-medium text-foreground">Number of Fractions</Text>
            <TextInput
              className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
              placeholder="e.g., 30"
              keyboardType="number-pad"
              value={numberOfFractions}
              onChangeText={setNumberOfFractions}
            />
          </View>

          <View className="gap-2">
            <Text className="text-base font-medium text-foreground">α/β Ratio (Gy)</Text>
            <TextInput
              className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
              placeholder="e.g., 10"
              keyboardType="decimal-pad"
              value={alphaBeta}
              onChangeText={setAlphaBeta}
            />
          </View>

          <View className="flex-row gap-2 mt-2">
            <Text className="text-sm text-muted">Total Dose: </Text>
            <Text className="text-sm font-semibold text-foreground">
              {(parseFloat(dosePerFraction || "0") * parseFloat(numberOfFractions || "0")).toFixed(2)} Gy
            </Text>
          </View>
        </View>

        {/* Results */}
        {isCalculating && (
          <View className="bg-surface border border-border rounded-xl p-6 mb-6">
            <Text className="text-center text-muted">Calculating...</Text>
          </View>
        )}

        {results && !isCalculating && (
          <>
            {/* Main Results */}
            <View className="bg-primary/10 border-2 border-primary rounded-xl p-6 gap-4 mb-6">
              <Text className="text-xl font-bold text-foreground mb-2">Live Results</Text>

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm text-muted">TCP (Tumor Control)</Text>
                  <Text className="text-3xl font-bold text-success">{results.tcp.toFixed(2)}%</Text>
                  {baseline && (
                    <Text
                      className="text-sm font-semibold mt-1"
                      style={{ color: getDifferenceColor(results.tcp, baseline.tcp, true) }}
                    >
                      {getDifference(results.tcp, baseline.tcp)}% from baseline
                    </Text>
                  )}
                </View>

                <View className="items-end">
                  <Text className="text-sm text-muted">NTCP (Toxicity Risk)</Text>
                  <Text className="text-3xl font-bold text-error">{results.ntcp.toFixed(2)}%</Text>
                  {baseline && (
                    <Text
                      className="text-sm font-semibold mt-1"
                      style={{ color: getDifferenceColor(results.ntcp, baseline.ntcp, false) }}
                    >
                      {getDifference(results.ntcp, baseline.ntcp)}% from baseline
                    </Text>
                  )}
                </View>
              </View>

              <View className="h-px bg-border my-2" />

              <View className="flex-row justify-between">
                <View>
                  <Text className="text-sm text-muted">Therapeutic Index</Text>
                  <Text className="text-xl font-bold text-foreground">{results.therapeuticIndex.toFixed(2)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-muted">Confidence</Text>
                  <Text className="text-xl font-bold text-foreground capitalize">{results.confidence}</Text>
                </View>
              </View>
            </View>

            {/* Biological Dose */}
            <View className="bg-surface border border-border rounded-xl p-4 gap-3 mb-6">
              <Text className="text-lg font-semibold text-foreground">Biological Dose</Text>

              <View className="flex-row justify-between">
                <Text className="text-base text-muted">BED (Biologically Effective Dose)</Text>
                <Text className="text-base font-semibold text-foreground">{results.bed.toFixed(2)} Gy</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-base text-muted">EQD2 (2 Gy Equivalent Dose)</Text>
                <Text className="text-base font-semibold text-foreground">{results.eqd2.toFixed(2)} Gy</Text>
              </View>
            </View>

            {/* Therapeutic Window Visualization */}
            <View className="bg-surface border border-border rounded-xl p-4 gap-3 mb-6">
              <Text className="text-lg font-semibold text-foreground">Therapeutic Window</Text>

              <View className="h-8 bg-background rounded-lg overflow-hidden flex-row">
                <View
                  className="bg-success"
                  style={{ width: `${Math.min(results.tcp, 100)}%` }}
                />
                <View
                  className="bg-error"
                  style={{ width: `${Math.min(results.ntcp, 100)}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-sm text-success">■ TCP</Text>
                <Text className="text-sm text-error">■ NTCP</Text>
              </View>

              <Text className="text-xs text-muted mt-2">
                {results.tcp > results.ntcp
                  ? "✓ Favorable therapeutic window (TCP > NTCP)"
                  : "⚠ Unfavorable therapeutic window (NTCP > TCP)"}
              </Text>
            </View>

            {/* Actions */}
            <View className="gap-3">
              {baseline && (
                <TouchableOpacity
                  onPress={resetBaseline}
                  className="bg-surface py-4 rounded-xl border border-border"
                >
                  <Text className="text-center text-foreground font-semibold text-base">
                    Set Current as Baseline
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => router.push("/calculation-setup")}
                className="bg-primary py-4 rounded-xl"
              >
                <Text className="text-center text-background font-semibold text-base">
                  Proceed to Full Calculation
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
