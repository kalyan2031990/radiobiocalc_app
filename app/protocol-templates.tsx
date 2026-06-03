/**
 * Protocol Templates Screen
 * 
 * Browse and select pre-configured clinical protocol templates
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  tumorSite: string;
  protocol: string;
  fractionation: {
    totalDose: number;
    fractionSize: number;
    numberOfFractions: number;
  };
  organs: Array<{
    name: string;
    type: "target" | "oar";
  }>;
  references: string[];
}

const TEMPLATES: ProtocolTemplate[] = [
  {
    id: "template-001",
    name: "Head & Neck - QUANTEC Standard",
    description: "Standard head and neck cancer treatment protocol",
    tumorSite: "Head & Neck",
    protocol: "QUANTEC",
    fractionation: {
      totalDose: 70,
      fractionSize: 2,
      numberOfFractions: 35,
    },
    organs: [
      { name: "PTV", type: "target" },
      { name: "Parotid Gland", type: "oar" },
      { name: "Spinal Cord", type: "oar" },
      { name: "Larynx", type: "oar" },
    ],
    references: [
      "Deasy et al. IJROBP 2010 - QUANTEC Head & Neck",
    ],
  },
  {
    id: "template-002",
    name: "Prostate - QUANTEC Standard",
    description: "Standard prostate cancer treatment protocol",
    tumorSite: "Prostate",
    protocol: "QUANTEC",
    fractionation: {
      totalDose: 78,
      fractionSize: 2,
      numberOfFractions: 39,
    },
    organs: [
      { name: "PTV", type: "target" },
      { name: "Rectum", type: "oar" },
      { name: "Bladder", type: "oar" },
      { name: "Femoral Head", type: "oar" },
    ],
    references: [
      "Michalski et al. IJROBP 2019 - QUANTEC Prostate",
    ],
  },
  {
    id: "template-003",
    name: "Lung - QUANTEC Standard",
    description: "Standard lung cancer treatment protocol",
    tumorSite: "Lung",
    protocol: "QUANTEC",
    fractionation: {
      totalDose: 60,
      fractionSize: 2,
      numberOfFractions: 30,
    },
    organs: [
      { name: "PTV", type: "target" },
      { name: "Lung", type: "oar" },
      { name: "Heart", type: "oar" },
      { name: "Esophagus", type: "oar" },
    ],
    references: [
      "Marks et al. IJROBP 2010 - QUANTEC Lung",
    ],
  },
  {
    id: "template-004",
    name: "Breast - QUANTEC Standard",
    description: "Standard breast cancer treatment protocol",
    tumorSite: "Breast",
    protocol: "QUANTEC",
    fractionation: {
      totalDose: 50,
      fractionSize: 2,
      numberOfFractions: 25,
    },
    organs: [
      { name: "PTV", type: "target" },
      { name: "Heart", type: "oar" },
      { name: "Lung", type: "oar" },
    ],
    references: [
      "Gagliardi et al. IJROBP 2010 - QUANTEC Breast",
    ],
  },
  {
    id: "template-005",
    name: "Rectum - QUANTEC Standard",
    description: "Standard rectal cancer treatment protocol",
    tumorSite: "Rectum",
    protocol: "QUANTEC",
    fractionation: {
      totalDose: 50.4,
      fractionSize: 1.8,
      numberOfFractions: 28,
    },
    organs: [
      { name: "PTV", type: "target" },
      { name: "Rectum", type: "oar" },
      { name: "Bladder", type: "oar" },
    ],
    references: [
      "Michalski et al. IJROBP 2019 - QUANTEC Rectum",
    ],
  },
];

export default function ProtocolTemplatesScreen() {
  const router = useRouter();
  const colors = useColors();

  const [selectedTemplate, setSelectedTemplate] = useState<ProtocolTemplate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleSelectTemplate = (template: ProtocolTemplate) => {
    setSelectedTemplate(template);
    setShowDetailsModal(true);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      // Navigate to calculation setup with template pre-filled
      router.push({
        pathname: "/calculation-setup",
        params: { templateId: selectedTemplate.id },
      });
    }
  };

  const tumorSites = [...new Set(TEMPLATES.map((t) => t.tumorSite))];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4 pb-8 px-4 pt-4">
          {/* Header */}
          <View className="gap-2">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.foreground}
                />
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Clinical Protocol Templates
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              Pre-configured templates based on QUANTEC and RTOG guidelines
            </Text>
          </View>

          {/* Tumor Sites */}
          {tumorSites.map((site) => (
            <View key={site} className="gap-2">
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                {site}
              </Text>

              {TEMPLATES.filter((t) => t.tumorSite === site).map((template) => (
                <Pressable
                  key={template.id}
                  onPress={() => handleSelectTemplate(template)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {template.name}
                        </Text>
                        <Text
                          className="text-xs text-muted mt-1"
                          style={{ color: colors.muted }}
                        >
                          {template.description}
                        </Text>
                      </View>
                      <View
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: colors.primary + "20" }}
                      >
                        <Text
                          className="text-xs font-semibold text-primary"
                          style={{ color: colors.primary }}
                        >
                          {template.protocol}
                        </Text>
                      </View>
                    </View>

                    {/* Fractionation Info */}
                    <View
                      className="flex-row gap-3 p-2 rounded mb-2"
                      style={{ backgroundColor: colors.background }}
                    >
                      <View className="flex-1 items-center">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Total Dose
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {template.fractionation.totalDose} Gy
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Fractions
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {template.fractionation.numberOfFractions}
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Frac Size
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {template.fractionation.fractionSize} Gy
                        </Text>
                      </View>
                    </View>

                    {/* Organs */}
                    <View className="gap-1">
                      <Text
                        className="text-xs font-semibold text-muted"
                        style={{ color: colors.muted }}
                      >
                        Structures ({template.organs.length}):
                      </Text>
                      <View className="flex-row flex-wrap gap-1">
                        {template.organs.map((organ, idx) => (
                          <View
                            key={idx}
                            className="px-2 py-1 rounded"
                            style={{
                              backgroundColor:
                                organ.type === "target"
                                  ? colors.success + "20"
                                  : colors.warning + "20",
                            }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{
                                color:
                                  organ.type === "target"
                                    ? colors.success
                                    : colors.warning,
                              }}
                            >
                              {organ.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Template Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-2xl p-4 gap-4 max-h-4/5"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Template Details
              </Text>
              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.foreground}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTemplate && (
                <View className="gap-4">
                  <View>
                    <Text
                      className="text-sm font-semibold text-foreground mb-1"
                      style={{ color: colors.foreground }}
                    >
                      {selectedTemplate.name}
                    </Text>
                    <Text
                      className="text-sm text-muted"
                      style={{ color: colors.muted }}
                    >
                      {selectedTemplate.description}
                    </Text>
                  </View>

                  <View
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Text
                      className="text-xs font-semibold text-muted mb-2"
                      style={{ color: colors.muted }}
                    >
                      Fractionation Schedule:
                    </Text>
                    <Text
                      className="text-sm text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      {selectedTemplate.fractionation.totalDose} Gy in{" "}
                      {selectedTemplate.fractionation.numberOfFractions} fractions
                      of {selectedTemplate.fractionation.fractionSize} Gy
                    </Text>
                  </View>

                  <View>
                    <Text
                      className="text-sm font-semibold text-foreground mb-2"
                      style={{ color: colors.foreground }}
                    >
                      Structures:
                    </Text>
                    {selectedTemplate.organs.map((organ, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center gap-2 py-2"
                      >
                        <MaterialIcons
                          name={
                            organ.type === "target"
                              ? "check-circle"
                              : "warning"
                          }
                          size={16}
                          color={
                            organ.type === "target"
                              ? colors.success
                              : colors.warning
                          }
                        />
                        <Text
                          className="text-sm text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {organ.name}
                        </Text>
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          ({organ.type})
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View>
                    <Text
                      className="text-sm font-semibold text-foreground mb-2"
                      style={{ color: colors.foreground }}
                    >
                      References:
                    </Text>
                    {selectedTemplate.references.map((ref, idx) => (
                      <Text
                        key={idx}
                        className="text-xs text-muted mb-1"
                        style={{ color: colors.muted }}
                      >
                        • {ref}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View className="flex-row gap-2 pt-4 border-t"
              style={{ borderColor: colors.border }}
            >
              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg py-2 items-center"
              >
                <Text
                  className="font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleUseTemplate}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg py-2 items-center"
              >
                <Text className="font-semibold text-white">Use Template</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
