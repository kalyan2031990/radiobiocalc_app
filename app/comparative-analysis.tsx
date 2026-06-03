import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface TreatmentPlan {
  id: string;
  name: string;
  dosePerFraction: number;
  numberOfFractions: number;
  tcp: number;
  ntcp: number;
  bed: number;
  eqd2: number;
  therapeuticIndex: number;
  confidence: string;
}

export default function ComparativeAnalysis() {
  const router = useRouter();
  const colors = useColors();

  const [plans, setPlans] = useState<TreatmentPlan[]>([
    {
      id: "1",
      name: "Standard Fractionation",
      dosePerFraction: 2.0,
      numberOfFractions: 30,
      tcp: 85.3,
      ntcp: 12.5,
      bed: 72.0,
      eqd2: 60.0,
      therapeuticIndex: 6.82,
      confidence: "high",
    },
    {
      id: "2",
      name: "Hypofractionation",
      dosePerFraction: 3.0,
      numberOfFractions: 20,
      tcp: 87.1,
      ntcp: 18.2,
      bed: 78.0,
      eqd2: 66.0,
      therapeuticIndex: 4.78,
      confidence: "medium",
    },
  ]);

  const [newPlanName, setNewPlanName] = useState("");
  const [newDosePerFraction, setNewDosePerFraction] = useState("");
  const [newNumberOfFractions, setNewNumberOfFractions] = useState("");
  const [showAddPlan, setShowAddPlan] = useState(false);

  const calculatePlan = (dpf: number, nfx: number): Omit<TreatmentPlan, "id" | "name"> => {
    const totalDose = dpf * nfx;
    const alphabeta = 10; // Assume α/β = 10 for tumor

    const bed = totalDose * (1 + dpf / alphabeta);
    const eqd2 = totalDose * ((alphabeta + dpf) / (alphabeta + 2));

    // Simplified TCP calculation
    const D50 = 50;
    const gamma50 = 2;
    const tcp = (1 / (1 + Math.pow(D50 / totalDose, 4 * gamma50))) * 100;

    // Simplified NTCP calculation
    const TD50 = 60;
    const m = 0.3;
    const x = (totalDose - TD50) / (m * TD50 * Math.sqrt(2));
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    const ntcp = (0.5 * (1 + (x >= 0 ? erf : -erf))) * 100;

    const therapeuticIndex = tcp / (ntcp + 0.01);
    const confidence = dpf <= 4 ? "high" : dpf <= 6 ? "medium" : "low";

    return {
      dosePerFraction: dpf,
      numberOfFractions: nfx,
      tcp,
      ntcp,
      bed,
      eqd2,
      therapeuticIndex,
      confidence,
    };
  };

  const addPlan = () => {
    const dpf = parseFloat(newDosePerFraction);
    const nfx = parseFloat(newNumberOfFractions);

    if (isNaN(dpf) || isNaN(nfx) || !newPlanName) {
      return;
    }

    const calculatedPlan = calculatePlan(dpf, nfx);
    const newPlan: TreatmentPlan = {
      id: Date.now().toString(),
      name: newPlanName,
      ...calculatedPlan,
    };

    setPlans([...plans, newPlan]);
    setNewPlanName("");
    setNewDosePerFraction("");
    setNewNumberOfFractions("");
    setShowAddPlan(false);
  };

  const removePlan = (id: string) => {
    setPlans(plans.filter((p) => p.id !== id));
  };

  const rankedPlans = [...plans].sort((a, b) => b.therapeuticIndex - a.therapeuticIndex);
  const bestPlan = rankedPlans[0];

  const getMetricColor = (value: number, metric: "tcp" | "ntcp" | "ti") => {
    if (metric === "tcp") {
      return value >= 85 ? colors.success : value >= 70 ? colors.warning : colors.error;
    }
    if (metric === "ntcp") {
      return value <= 15 ? colors.success : value <= 30 ? colors.warning : colors.error;
    }
    if (metric === "ti") {
      return value >= 5 ? colors.success : value >= 3 ? colors.warning : colors.error;
    }
    return colors.foreground;
  };

  const renderPlanCard = ({ item, index }: { item: TreatmentPlan; index: number }) => {
    const isBest = item.id === bestPlan.id;

    return (
      <View
        className={`border-2 rounded-xl p-4 mb-4 ${
          isBest ? "border-primary bg-primary/5" : "border-border bg-surface"
        }`}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">{item.name}</Text>
            {isBest && (
              <Text className="text-sm font-semibold text-primary mt-1">★ Best Therapeutic Index</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => removePlan(item.id)}
            className="p-2"
          >
            <Text className="text-error font-semibold">Remove</Text>
          </TouchableOpacity>
        </View>

        {/* Fractionation */}
        <View className="flex-row gap-4 mb-3">
          <View>
            <Text className="text-xs text-muted">Dose/Fx</Text>
            <Text className="text-base font-semibold text-foreground">{item.dosePerFraction} Gy</Text>
          </View>
          <View>
            <Text className="text-xs text-muted">Fractions</Text>
            <Text className="text-base font-semibold text-foreground">{item.numberOfFractions}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted">Total</Text>
            <Text className="text-base font-semibold text-foreground">
              {(item.dosePerFraction * item.numberOfFractions).toFixed(1)} Gy
            </Text>
          </View>
        </View>

        {/* TCP/NTCP */}
        <View className="flex-row gap-4 mb-3">
          <View className="flex-1">
            <Text className="text-xs text-muted">TCP</Text>
            <Text
              className="text-2xl font-bold"
              style={{ color: getMetricColor(item.tcp, "tcp") }}
            >
              {item.tcp.toFixed(1)}%
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted">NTCP</Text>
            <Text
              className="text-2xl font-bold"
              style={{ color: getMetricColor(item.ntcp, "ntcp") }}
            >
              {item.ntcp.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Therapeutic Index */}
        <View className="bg-background rounded-lg p-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Therapeutic Index</Text>
            <Text
              className="text-xl font-bold"
              style={{ color: getMetricColor(item.therapeuticIndex, "ti") }}
            >
              {item.therapeuticIndex.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Biological Dose */}
        <View className="flex-row gap-4 mt-3">
          <View className="flex-1">
            <Text className="text-xs text-muted">BED</Text>
            <Text className="text-sm font-semibold text-foreground">{item.bed.toFixed(1)} Gy</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted">EQD2</Text>
            <Text className="text-sm font-semibold text-foreground">{item.eqd2.toFixed(1)} Gy</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted">Confidence</Text>
            <Text className="text-sm font-semibold text-foreground capitalize">{item.confidence}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground">Comparative Plan Analysis</Text>
          <Text className="text-base text-muted mt-2">
            Compare multiple fractionation schemes side-by-side
          </Text>
        </View>

        {/* Summary Statistics */}
        <View className="bg-primary/10 border-2 border-primary rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Comparison Summary</Text>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted">Plans Compared:</Text>
            <Text className="text-sm font-semibold text-foreground">{plans.length}</Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted">Best TCP:</Text>
            <Text className="text-sm font-semibold text-success">
              {Math.max(...plans.map((p) => p.tcp)).toFixed(1)}%
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted">Lowest NTCP:</Text>
            <Text className="text-sm font-semibold text-success">
              {Math.min(...plans.map((p) => p.ntcp)).toFixed(1)}%
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Best Therapeutic Index:</Text>
            <Text className="text-sm font-semibold text-primary">
              {Math.max(...plans.map((p) => p.therapeuticIndex)).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Plan List */}
        <FlatList
          data={rankedPlans}
          renderItem={renderPlanCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />

        {/* Add Plan Button */}
        {!showAddPlan && (
          <TouchableOpacity
            onPress={() => setShowAddPlan(true)}
            className="bg-surface border-2 border-dashed border-border rounded-xl p-6 mb-6"
          >
            <Text className="text-center text-foreground font-semibold text-base">+ Add New Plan</Text>
          </TouchableOpacity>
        )}

        {/* Add Plan Form */}
        {showAddPlan && (
          <View className="bg-surface border border-border rounded-xl p-4 gap-4 mb-6">
            <Text className="text-lg font-semibold text-foreground">Add New Plan</Text>

            <View className="gap-2">
              <Text className="text-base font-medium text-foreground">Plan Name</Text>
              <TextInput
                className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
                placeholder="e.g., SBRT Protocol"
                value={newPlanName}
                onChangeText={setNewPlanName}
              />
            </View>

            <View className="gap-2">
              <Text className="text-base font-medium text-foreground">Dose Per Fraction (Gy)</Text>
              <TextInput
                className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
                placeholder="e.g., 8.0"
                keyboardType="decimal-pad"
                value={newDosePerFraction}
                onChangeText={setNewDosePerFraction}
              />
            </View>

            <View className="gap-2">
              <Text className="text-base font-medium text-foreground">Number of Fractions</Text>
              <TextInput
                className="bg-background border border-border rounded-xl p-4 text-foreground text-base"
                placeholder="e.g., 5"
                keyboardType="number-pad"
                value={newNumberOfFractions}
                onChangeText={setNewNumberOfFractions}
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={addPlan}
                className="flex-1 bg-primary py-4 rounded-xl"
                disabled={!newPlanName || !newDosePerFraction || !newNumberOfFractions}
                style={{
                  opacity: newPlanName && newDosePerFraction && newNumberOfFractions ? 1 : 0.5,
                }}
              >
                <Text className="text-center text-background font-semibold text-base">Add Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAddPlan(false)}
                className="flex-1 bg-surface py-4 rounded-xl border border-border"
              >
                <Text className="text-center text-foreground font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => router.push("/calculation-setup")}
            className="bg-primary py-4 rounded-xl"
          >
            <Text className="text-center text-background font-semibold text-base">
              Proceed with Best Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-surface py-4 rounded-xl border border-border"
          >
            <Text className="text-center text-foreground font-semibold text-base">Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
