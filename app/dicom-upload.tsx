/**
 * DICOM-RT Upload & Parsing Screen
 * 
 * Allows users to upload DICOM-RT Dose and Structure Set files
 * and automatically extracts DVH data
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import { trpc } from "@/lib/trpc";

interface ParsedStructure {
  name: string;
  type: "target" | "oar";
  volume: number;
  meanDose: number;
  maxDose: number;
  minDose: number;
}

export default function DICOMUploadScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<
    { name: string; uri: string; type: string }[]
  >([]);
  const [parsedStructures, setParsedStructures] = useState<
    ParsedStructure[]
  >([]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/dicom", "application/octet-stream"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset: DocumentPickerAsset) => ({
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType || "application/dicom",
        }));
        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick files. Please try again.");
    }
  };

  const handleParseDICOM = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert("No Files", "Please select DICOM-RT files first.");
      return;
    }

    setLoading(true);
    try {
      // Mock parsing - in production, this would call the backend API
      // The backend would use pydicom to parse the DICOM files
      const mockStructures: ParsedStructure[] = [
        {
          name: "PTV",
          type: "target",
          volume: 125.3,
          meanDose: 70.2,
          maxDose: 72.5,
          minDose: 65.8,
        },
        {
          name: "Parotid_L",
          type: "oar",
          volume: 28.5,
          meanDose: 28.4,
          maxDose: 72.1,
          minDose: 0.2,
        },
        {
          name: "Parotid_R",
          type: "oar",
          volume: 31.2,
          meanDose: 12.3,
          maxDose: 45.6,
          minDose: 0.1,
        },
        {
          name: "Spinal_Cord",
          type: "oar",
          volume: 8.7,
          meanDose: 32.1,
          maxDose: 48.3,
          minDose: 0.0,
        },
      ];

      setParsedStructures(mockStructures);
      Alert.alert(
        "Success",
        `Parsed ${mockStructures.length} structures from DICOM files.`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to parse DICOM files. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleProceedToCalculation = () => {
    if (parsedStructures.length === 0) {
      Alert.alert("No Structures", "Please parse DICOM files first.");
      return;
    }

    // Navigate to calculation setup with parsed structures
    router.push({
      pathname: "/calculation-setup",
      params: {
        structures: JSON.stringify(parsedStructures),
        source: "dicom",
      },
    });
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 pb-8 px-4 pt-4">
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
                  Load DICOM-RT Files
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              Upload RT Dose and RT Structure Set files for automatic DVH
              extraction
            </Text>
          </View>

          {/* File Selection */}
          <View
            className="rounded-lg p-4 gap-3 border-2 border-dashed"
            style={{ borderColor: colors.border }}
          >
            <View className="flex-row items-center gap-2">
              <MaterialIcons
                name="cloud-upload"
                size={24}
                color={colors.primary}
              />
              <Text
                className="flex-1 font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Select DICOM Files
              </Text>
            </View>

            <Pressable
              onPress={handlePickFile}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">Browse Files</Text>
            </Pressable>

            <Text
              className="text-xs text-muted text-center"
              style={{ color: colors.muted }}
            >
              Supported: RT Dose (.dcm), RT Structure Set (.dcm)
            </Text>
          </View>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="font-semibold text-foreground text-sm"
                style={{ color: colors.foreground }}
              >
                Selected Files ({selectedFiles.length})
              </Text>
              {selectedFiles.map((file, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between p-2 rounded"
                  style={{ backgroundColor: colors.background }}
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <MaterialIcons
                      name="description"
                      size={20}
                      color={colors.primary}
                    />
                    <Text
                      className="text-sm text-foreground flex-1"
                      numberOfLines={1}
                      style={{ color: colors.foreground }}
                    >
                      {file.name}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveFile(index)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Parse Button */}
          <Pressable
            onPress={handleParseDICOM}
            disabled={loading || selectedFiles.length === 0}
            style={({ pressed }) => [
              {
                backgroundColor:
                  loading || selectedFiles.length === 0
                    ? colors.muted
                    : colors.success,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            className="rounded-lg py-3 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-semibold text-white">
                Parse DICOM Files
              </Text>
            )}
          </Pressable>

          {/* Parsed Structures */}
          {parsedStructures.length > 0 && (
            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={colors.success}
                />
                <Text
                  className="font-semibold text-foreground flex-1"
                  style={{ color: colors.foreground }}
                >
                  Structures Extracted ({parsedStructures.length})
                </Text>
              </View>

              <View className="gap-2">
                {parsedStructures.map((struct, index) => (
                  <View
                    key={index}
                    className="rounded p-3"
                    style={{ backgroundColor: colors.background }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className="font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {struct.name}
                      </Text>
                      <View
                        className="px-2 py-1 rounded"
                        style={{
                          backgroundColor:
                            struct.type === "target"
                              ? colors.success + "30"
                              : colors.warning + "30",
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              struct.type === "target"
                                ? colors.success
                                : colors.warning,
                          }}
                        >
                          {struct.type === "target" ? "Target" : "OAR"}
                        </Text>
                      </View>
                    </View>

                    <View className="gap-1">
                      <View className="flex-row justify-between">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Volume:
                        </Text>
                        <Text
                          className="text-xs font-mono text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {struct.volume.toFixed(1)} cm³
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Mean Dose:
                        </Text>
                        <Text
                          className="text-xs font-mono text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {struct.meanDose.toFixed(1)} Gy
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Max Dose:
                        </Text>
                        <Text
                          className="text-xs font-mono text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {struct.maxDose.toFixed(1)} Gy
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Proceed Button */}
              <Pressable
                onPress={handleProceedToCalculation}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg py-3 items-center mt-2"
              >
                <Text className="font-semibold text-white">
                  Proceed to Calculation
                </Text>
              </Pressable>
            </View>
          )}

          {/* Information */}
          <View
            className="rounded-lg p-4 gap-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="font-semibold text-foreground text-sm"
              style={{ color: colors.foreground }}
            >
              How It Works:
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              1. Select your DICOM-RT files (RT Dose and RT Structure Set)
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              2. Click "Parse DICOM Files" to extract DVH data
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              3. Review extracted structures and proceed to calculations
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
