import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Welcome to rbGyanX",
    description:
      "rbGyanX (genius evolved) is a comprehensive radiobiology and dosimetry calculation platform. This tutorial will guide you through the key features.",
    icon: "👋",
    action: null,
  },
  {
    id: 2,
    title: "Input Methods",
    description:
      "Import a TPS DVH export (.csv or .txt). In setup you can optionally adjust literature model parameters and enter clinical context from preset dropdowns.",
    icon: "📥",
    action: null,
  },
  {
    id: 3,
    title: "Model Selection Wizard",
    description:
      "The Model Selection Wizard guides you through choosing the optimal radiobiological model based on your treatment parameters (dose per fraction, modality, etc.).",
    icon: "🧭",
    action: () => router.push("../model-selection-wizard"),
  },
  {
    id: 4,
    title: "Real-Time Preview",
    description:
      "Adjust fractionation parameters and see TCP/NTCP values update in real-time. Perfect for treatment plan optimization and 'what-if' analysis.",
    icon: "⚡",
    action: () => router.push("../realtime-preview"),
  },
  {
    id: 5,
    title: "Comparative Analysis",
    description:
      "Compare multiple fractionation schemes side-by-side. View TCP/NTCP differences, therapeutic index rankings, and confidence intervals.",
    icon: "📊",
    action: () => router.push("../comparative-analysis"),
  },
  {
    id: 6,
    title: "Benchmark Comparison",
    description:
      "Compare your calculations against QUANTEC and RTOG benchmark constraints. Instant quality assurance and protocol compliance checking.",
    icon: "🎯",
    action: () => router.push("../benchmark-comparison"),
  },
  {
    id: 7,
    title: "Export & Reports",
    description:
      "Export results as PDF or Word documents with publication-ready 1200 DPI SVG graphics. All calculations include literature references and model parameters.",
    icon: "📄",
    action: null,
  },
  {
    id: 8,
    title: "Ready to Start!",
    description:
      "You're all set! Start by loading DVH data or using manual entry for a quick calculation. Access this tutorial anytime from the settings.",
    icon: "🚀",
    action: null,
  },
];

export default function TutorialScreen() {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("tutorial_completed", "true");
    router.back();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem("tutorial_completed", "true");
    router.back();
  };

  const handleTryFeature = () => {
    const action = TUTORIAL_STEPS[currentStep].action;
    if (action) {
      action();
    }
  };

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text
              className="text-xl font-bold text-foreground"
              style={{ color: colors.foreground }}
            >
              Tutorial
            </Text>
            <Pressable onPress={handleSkip} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Text className="text-base text-primary" style={{ color: colors.primary }}>
                Skip
              </Text>
            </Pressable>
          </View>

          {/* Progress Bar */}
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </Text>
              <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View className="h-2 rounded-full" style={{ backgroundColor: colors.border }}>
              <View
                className="h-2 rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  width: `${progress}%`,
                }}
              />
            </View>
          </View>

          {/* Step Content */}
          <View className="flex-1 items-center justify-center gap-6">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + "20" }}
            >
              <Text style={{ fontSize: 48 }}>{step.icon}</Text>
            </View>

            <View className="gap-3">
              <Text
                className="text-2xl font-bold text-center text-foreground"
                style={{ color: colors.foreground }}
              >
                {step.title}
              </Text>
              <Text
                className="text-base text-center text-muted leading-relaxed"
                style={{ color: colors.muted }}
              >
                {step.description}
              </Text>
            </View>

            {step.action && (
              <Pressable
                onPress={handleTryFeature}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View
                  className="px-6 py-3 rounded-full flex-row items-center gap-2"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text className="text-base font-semibold text-foreground" style={{ color: colors.foreground }}>
                    Try This Feature
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.foreground} />
                </View>
              </Pressable>
            )}
          </View>

          {/* Navigation Buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleBack}
              disabled={currentStep === 0}
              style={({ pressed }) => [
                {
                  opacity: currentStep === 0 ? 0.3 : pressed ? 0.7 : 1,
                  flex: 1,
                },
              ]}
            >
              <View
                className="py-4 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-base font-semibold text-foreground" style={{ color: colors.foreground }}>
                  Back
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  flex: 1,
                },
              ]}
            >
              <View
                className="py-4 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Step Indicators */}
          <View className="flex-row justify-center gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: index === currentStep ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
