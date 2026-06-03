import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";

type FeedbackCategory = "bug" | "calculation" | "feature" | "validation" | "other";

interface FeedbackOption {
  id: FeedbackCategory;
  title: string;
  description: string;
  icon: string;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    id: "bug",
    title: "Report a Bug",
    description: "App crashes, errors, or unexpected behavior",
    icon: "🐛",
  },
  {
    id: "calculation",
    title: "Calculation Discrepancy",
    description: "TCP/NTCP values differ from expected results",
    icon: "🔢",
  },
  {
    id: "feature",
    title: "Feature Request",
    description: "Suggest new features or improvements",
    icon: "💡",
  },
  {
    id: "validation",
    title: "Clinical Validation",
    description: "Share real patient validation results",
    icon: "✅",
  },
  {
    id: "other",
    title: "Other Feedback",
    description: "General comments or questions",
    icon: "💬",
  },
];

export default function FeedbackScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert("Category Required", "Please select a feedback category.");
      return;
    }

    if (!feedbackText.trim()) {
      Alert.alert("Feedback Required", "Please enter your feedback.");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real implementation, this would send to a backend API
      // For now, we'll simulate a submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const feedbackData = {
        category: selectedCategory,
        feedback: feedbackText,
        email: email || "anonymous",
        timestamp: new Date().toISOString(),
        appVersion: "2.0.0",
      };

      console.log("Feedback submitted:", feedbackData);

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted successfully. The rbGyanX team will review it and may contact you for follow-up.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );

      // Reset form
      setSelectedCategory(null);
      setFeedbackText("");
      setEmail("");
    } catch (error) {
      Alert.alert("Submission Failed", "Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text
              className="text-2xl font-bold text-foreground"
              style={{ color: colors.foreground }}
            >
              Feedback
            </Text>
            <Text
              className="text-base text-muted"
              style={{ color: colors.muted }}
            >
              Help us improve rbGyanX by sharing your feedback, reporting issues, or contributing clinical validation data.
            </Text>
          </View>

          {/* Category Selection */}
          <View className="gap-3">
            <Text
              className="text-lg font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Select Category
            </Text>

            {FEEDBACK_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setSelectedCategory(option.id)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  className="rounded-xl p-4 flex-row items-center gap-3"
                  style={{
                    backgroundColor: selectedCategory === option.id ? colors.primary + "20" : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedCategory === option.id ? colors.primary : colors.border,
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <Text style={{ fontSize: 24 }}>{option.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-semibold text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      {option.title}
                    </Text>
                    <Text
                      className="text-sm text-muted"
                      style={{ color: colors.muted }}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {selectedCategory === option.id && (
                    <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Feedback Text */}
          {selectedCategory && (
            <View className="gap-3">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Your Feedback
              </Text>
              <TextInput
                className="rounded-xl p-4 text-base"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                  minHeight: 150,
                  textAlignVertical: "top",
                }}
                placeholder="Please provide detailed information..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={6}
                value={feedbackText}
                onChangeText={setFeedbackText}
              />

              {selectedCategory === "calculation" && (
                <View
                  className="rounded-xl p-4 gap-2"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                >
                  <View className="flex-row gap-2">
                    <MaterialIcons name="info" size={20} color={colors.primary} />
                    <Text className="flex-1 text-sm text-muted" style={{ color: colors.muted }}>
                      Please include: organ, dose per fraction, number of fractions, expected vs. actual TCP/NTCP, and model used.
                    </Text>
                  </View>
                </View>
              )}

              {selectedCategory === "validation" && (
                <View
                  className="rounded-xl p-4 gap-2"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                >
                  <View className="flex-row gap-2">
                    <MaterialIcons name="info" size={20} color={colors.primary} />
                    <Text className="flex-1 text-sm text-muted" style={{ color: colors.muted }}>
                      Please include: number of patients, tumor site, treatment modality, calculated vs. observed outcomes, and follow-up duration.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Email (Optional) */}
          {selectedCategory && (
            <View className="gap-3">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Email (Optional)
              </Text>
              <TextInput
                className="rounded-xl p-4 text-base"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                Provide your email if you'd like us to follow up on your feedback.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          {selectedCategory && (
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                {
                  opacity: isSubmitting ? 0.5 : pressed ? 0.7 : 1,
                  transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                className="py-4 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Contact Information */}
          <View
            className="rounded-xl p-4 gap-2"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-sm font-semibold text-foreground" style={{ color: colors.foreground }}>
              Contact the rbGyanX Team
            </Text>
            <Text className="text-xs text-muted" style={{ color: colors.muted }}>
              For urgent issues or direct collaboration inquiries, contact:
            </Text>
            <Text className="text-xs text-muted" style={{ color: colors.muted }}>
              K. Mondal (Medical Physicist)
            </Text>
            <Text className="text-xs text-muted" style={{ color: colors.muted }}>
              North Bengal Medical College, Darjeeling, India
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
