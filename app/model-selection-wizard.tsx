import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type WizardStep = "modality" | "dose" | "fractionation" | "special" | "recommendation";

interface WizardState {
  modality: string;
  dosePerFraction: string;
  totalDose: string;
  numberOfFractions: string;
  treatmentGap: boolean;
  isReirradiation: boolean;
  isPediatric: boolean;
  patientAge: string;
}

export default function ModelSelectionWizard() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState<WizardStep>("modality");
  const [wizardState, setWizardState] = useState<WizardState>({
    modality: "",
    dosePerFraction: "",
    totalDose: "",
    numberOfFractions: "",
    treatmentGap: false,
    isReirradiation: false,
    isPediatric: false,
    patientAge: "",
  });

  const steps: WizardStep[] = ["modality", "dose", "fractionation", "special", "recommendation"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState({ ...wizardState, ...updates });
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const getRecommendation = () => {
    const dpf = parseFloat(wizardState.dosePerFraction);
    
    if (isNaN(dpf)) {
      return {
        model: "Unknown",
        confidence: "low",
        reason: "Invalid dose per fraction",
        cautions: ["Please enter valid dose parameters"],
      };
    }

    // Decision logic based on clinical decision tree
    if (wizardState.modality === "SBRT" || wizardState.modality === "SRS") {
      return {
        model: "LQL or GLQ",
        confidence: "high",
        reason: "SBRT/SRS typically uses high dose per fraction (>6 Gy)",
        cautions: ["Verify dose constraints for critical structures"],
      };
    }

    if (dpf <= 4.0) {
      return {
        model: "Linear-Quadratic (LQ)",
        confidence: "high",
        reason: "Standard fractionation (≤4 Gy per fraction)",
        cautions: wizardState.isPediatric ? ["Use low α/β ratios for pediatric patients"] : [],
      };
    }

    if (dpf > 4.0 && dpf <= 6.0) {
      return {
        model: "Modified LQ",
        confidence: "medium",
        reason: "Moderate hypofractionation (4-6 Gy per fraction)",
        cautions: ["LQ model may underestimate biological effect", "Consider LQL model"],
      };
    }

    if (dpf > 6.0 && dpf <= 8.0) {
      return {
        model: "LQL (Linear-Quadratic-Linear)",
        confidence: "high",
        reason: "Hypofractionation (6-8 Gy per fraction)",
        cautions: ["Ensure dt parameter is appropriate for tissue"],
      };
    }

    return {
      model: "LQL or GLQ",
      confidence: "high",
      reason: "High dose per fraction (>8 Gy)",
      cautions: ["Consider generalized LQ for very high doses", "Verify with clinical data"],
    };
  };

  const renderModalityStep = () => (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-foreground">Select Treatment Modality</Text>
      <Text className="text-base text-muted">Choose the radiation therapy modality for this treatment.</Text>

      {["EBRT", "SBRT", "SRS", "HDR Brachy", "Proton", "Pediatric"].map((modality) => (
        <TouchableOpacity
          key={modality}
          onPress={() => {
            updateState({ modality, isPediatric: modality === "Pediatric" });
            goNext();
          }}
          className={`p-4 rounded-xl border-2 ${
            wizardState.modality === modality ? "border-primary bg-primary/10" : "border-border bg-surface"
          }`}
        >
          <Text className="text-lg font-semibold text-foreground">{modality}</Text>
          <Text className="text-sm text-muted mt-1">
            {modality === "EBRT" && "Conventional external beam radiotherapy"}
            {modality === "SBRT" && "Stereotactic body radiotherapy"}
            {modality === "SRS" && "Stereotactic radiosurgery"}
            {modality === "HDR Brachy" && "High dose rate brachytherapy"}
            {modality === "Proton" && "Proton beam therapy"}
            {modality === "Pediatric" && "Pediatric radiotherapy"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDoseStep = () => (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-foreground">Enter Dose Parameters</Text>
      <Text className="text-base text-muted">Provide the fractionation details for this treatment.</Text>

      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground">Dose Per Fraction (Gy)</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl p-4 text-foreground text-base"
          placeholder="e.g., 2.0"
          keyboardType="decimal-pad"
          value={wizardState.dosePerFraction}
          onChangeText={(text) => updateState({ dosePerFraction: text })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground">Total Dose (Gy)</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl p-4 text-foreground text-base"
          placeholder="e.g., 60.0"
          keyboardType="decimal-pad"
          value={wizardState.totalDose}
          onChangeText={(text) => updateState({ totalDose: text })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground">Number of Fractions</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl p-4 text-foreground text-base"
          placeholder="e.g., 30"
          keyboardType="number-pad"
          value={wizardState.numberOfFractions}
          onChangeText={(text) => updateState({ numberOfFractions: text })}
        />
      </View>

      <TouchableOpacity
        onPress={goNext}
        className="bg-primary py-4 rounded-xl mt-4"
        disabled={!wizardState.dosePerFraction || !wizardState.totalDose || !wizardState.numberOfFractions}
        style={{
          opacity: wizardState.dosePerFraction && wizardState.totalDose && wizardState.numberOfFractions ? 1 : 0.5,
        }}
      >
        <Text className="text-center text-background font-semibold text-base">Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFractionationStep = () => (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-foreground">Fractionation Details</Text>
      <Text className="text-base text-muted">Review the calculated fractionation parameters.</Text>

      <View className="bg-surface border border-border rounded-xl p-4 gap-3">
        <View className="flex-row justify-between">
          <Text className="text-base text-muted">Dose Per Fraction:</Text>
          <Text className="text-base font-semibold text-foreground">{wizardState.dosePerFraction} Gy</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-base text-muted">Total Dose:</Text>
          <Text className="text-base font-semibold text-foreground">{wizardState.totalDose} Gy</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-base text-muted">Number of Fractions:</Text>
          <Text className="text-base font-semibold text-foreground">{wizardState.numberOfFractions}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-base text-muted">Calculated d/fx:</Text>
          <Text className="text-base font-semibold text-foreground">
            {(parseFloat(wizardState.totalDose) / parseFloat(wizardState.numberOfFractions)).toFixed(2)} Gy
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={goNext} className="bg-primary py-4 rounded-xl mt-4">
        <Text className="text-center text-background font-semibold text-base">Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSpecialStep = () => (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-foreground">Special Considerations</Text>
      <Text className="text-base text-muted">Select any special treatment scenarios that apply.</Text>

      <TouchableOpacity
        onPress={() => updateState({ treatmentGap: !wizardState.treatmentGap })}
        className={`p-4 rounded-xl border-2 ${
          wizardState.treatmentGap ? "border-primary bg-primary/10" : "border-border bg-surface"
        }`}
      >
        <Text className="text-lg font-semibold text-foreground">Treatment Gap</Text>
        <Text className="text-sm text-muted mt-1">Unplanned interruption in treatment schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => updateState({ isReirradiation: !wizardState.isReirradiation })}
        className={`p-4 rounded-xl border-2 ${
          wizardState.isReirradiation ? "border-primary bg-primary/10" : "border-border bg-surface"
        }`}
      >
        <Text className="text-lg font-semibold text-foreground">Re-irradiation</Text>
        <Text className="text-sm text-muted mt-1">Patient has received prior radiation to this area</Text>
      </TouchableOpacity>

      {wizardState.isPediatric && (
        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">Patient Age (years)</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl p-4 text-foreground text-base"
            placeholder="e.g., 8"
            keyboardType="number-pad"
            value={wizardState.patientAge}
            onChangeText={(text) => updateState({ patientAge: text })}
          />
        </View>
      )}

      <TouchableOpacity onPress={goNext} className="bg-primary py-4 rounded-xl mt-4">
        <Text className="text-center text-background font-semibold text-base">Get Recommendation</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecommendationStep = () => {
    const recommendation = getRecommendation();

    return (
      <View className="gap-4">
        <Text className="text-2xl font-bold text-foreground">Model Recommendation</Text>
        <Text className="text-base text-muted">Based on your treatment parameters, here is the recommended model.</Text>

        <View className="bg-primary/10 border-2 border-primary rounded-xl p-6 gap-4">
          <View>
            <Text className="text-sm text-muted mb-1">Recommended Model</Text>
            <Text className="text-2xl font-bold text-primary">{recommendation.model}</Text>
          </View>

          <View>
            <Text className="text-sm text-muted mb-1">Confidence Level</Text>
            <Text className="text-lg font-semibold text-foreground capitalize">{recommendation.confidence}</Text>
          </View>

          <View>
            <Text className="text-sm text-muted mb-1">Reason</Text>
            <Text className="text-base text-foreground">{recommendation.reason}</Text>
          </View>

          {recommendation.cautions.length > 0 && (
            <View>
              <Text className="text-sm text-warning mb-2 font-semibold">⚠️ Cautions</Text>
              {recommendation.cautions.map((caution, index) => (
                <Text key={index} className="text-sm text-foreground mb-1">
                  • {caution}
                </Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/calculation-setup")}
          className="bg-primary py-4 rounded-xl"
        >
          <Text className="text-center text-background font-semibold text-base">Proceed to Calculation</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="bg-surface py-4 rounded-xl border border-border">
          <Text className="text-center text-foreground font-semibold text-base">Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center gap-4 mb-6">
          {currentStepIndex > 0 && (
            <TouchableOpacity onPress={goBack} className="p-2">
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">Model Selection Wizard</Text>
            <Text className="text-sm text-muted">
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-surface rounded-full mb-8">
          <View
            className="h-2 bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* Step Content */}
        {currentStep === "modality" && renderModalityStep()}
        {currentStep === "dose" && renderDoseStep()}
        {currentStep === "fractionation" && renderFractionationStep()}
        {currentStep === "special" && renderSpecialStep()}
        {currentStep === "recommendation" && renderRecommendationStep()}
      </ScrollView>
    </ScreenContainer>
  );
}
