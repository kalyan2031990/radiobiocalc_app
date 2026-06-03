/**
 * Case Details Screen
 * 
 * View all calculations and reports for a specific patient case
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

interface Calculation {
  id: string;
  structureName: string;
  structureType: "target" | "oar";
  tcp?: number;
  ntcp?: number;
  bed: number;
  eqd2: number;
  createdAt: string;
}

interface Report {
  id: string;
  format: string;
  fileName: string;
  createdAt: string;
}

export default function CaseDetailsScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();

  const caseId = params.caseId as string;

  const [calculations] = useState<Calculation[]>([
    {
      id: "1",
      structureName: "PTV",
      structureType: "target",
      tcp: 87.5,
      bed: 84.0,
      eqd2: 70.2,
      createdAt: "2024-01-02 10:30 AM",
    },
    {
      id: "2",
      structureName: "Parotid_L",
      structureType: "oar",
      ntcp: 12.3,
      bed: 34.0,
      eqd2: 28.4,
      createdAt: "2024-01-02 10:30 AM",
    },
    {
      id: "3",
      structureName: "Parotid_R",
      structureType: "oar",
      ntcp: 5.8,
      bed: 14.8,
      eqd2: 12.3,
      createdAt: "2024-01-02 10:30 AM",
    },
    {
      id: "4",
      structureName: "Spinal_Cord",
      structureType: "oar",
      ntcp: 2.1,
      bed: 38.6,
      eqd2: 32.1,
      createdAt: "2024-01-02 10:30 AM",
    },
  ]);

  const [reports] = useState<Report[]>([
    {
      id: "1",
      format: "PDF",
      fileName: "RadioBioCalc_Report_2024-01-02.pdf",
      createdAt: "2024-01-02 10:35 AM",
    },
    {
      id: "2",
      format: "CSV",
      fileName: "RadioBioCalc_Data_2024-01-02.csv",
      createdAt: "2024-01-02 10:36 AM",
    },
  ]);

  const handleViewCalculation = (calcId: string) => {
    Alert.alert("View Calculation", `Viewing calculation ${calcId}`);
  };

  const handleDownloadReport = (reportId: string, fileName: string) => {
    Alert.alert("Download", `Downloading ${fileName}`);
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
                  Case Details
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              John Doe (ID: 12345)
            </Text>
          </View>

          {/* Case Summary */}
          <View
            className="rounded-lg p-4 gap-3"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Case Information:
            </Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Study Date:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  2024-01-02
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Diagnosis:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Head & Neck Cancer
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Total Calculations:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {calculations.length}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Total Reports:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {reports.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Calculations Section */}
          <View className="gap-2">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Calculations ({calculations.length}):
            </Text>

            <FlatList
              data={calculations}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleViewCalculation(item.id)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    className="rounded-lg p-3 mb-2 border"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2 flex-1">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              item.structureType === "target"
                                ? colors.success
                                : colors.warning,
                          }}
                        />
                        <Text
                          className="font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {item.structureName}
                        </Text>
                      </View>
                      <View
                        className="px-2 py-1 rounded"
                        style={{
                          backgroundColor:
                            item.structureType === "target"
                              ? colors.success + "30"
                              : colors.warning + "30",
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              item.structureType === "target"
                                ? colors.success
                                : colors.warning,
                          }}
                        >
                          {item.structureType === "target" ? "Target" : "OAR"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between gap-2">
                      {item.tcp !== undefined && (
                        <View className="flex-1">
                          <Text
                            className="text-xs text-muted"
                            style={{ color: colors.muted }}
                          >
                            TCP
                          </Text>
                          <Text
                            className="text-sm font-semibold text-foreground"
                            style={{ color: colors.foreground }}
                          >
                            {item.tcp.toFixed(1)}%
                          </Text>
                        </View>
                      )}
                      {item.ntcp !== undefined && (
                        <View className="flex-1">
                          <Text
                            className="text-xs text-muted"
                            style={{ color: colors.muted }}
                          >
                            NTCP
                          </Text>
                          <Text
                            className="text-sm font-semibold text-foreground"
                            style={{ color: colors.foreground }}
                          >
                            {item.ntcp.toFixed(1)}%
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          BED
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {item.bed.toFixed(1)} Gy
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          EQD2
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {item.eqd2.toFixed(1)} Gy
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="text-xs text-muted mt-2"
                      style={{ color: colors.muted }}
                    >
                      {item.createdAt}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>

          {/* Reports Section */}
          <View className="gap-2">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Reports ({reports.length}):
            </Text>

            <FlatList
              data={reports}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleDownloadReport(item.id, item.fileName)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    className="rounded-lg p-3 mb-2 border flex-row items-center justify-between"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      <MaterialIcons
                        name={
                          item.format === "PDF"
                            ? "picture-as-pdf"
                            : "table-chart"
                        }
                        size={20}
                        color={colors.primary}
                      />
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {item.format} Report
                        </Text>
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          {item.createdAt}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name="download"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                </Pressable>
              )}
            />
          </View>

          {/* Action Buttons */}
          <View className="gap-2">
            <Pressable
              onPress={() => router.push("/dvh-input")}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">New Calculation</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/report-export")}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.success,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">Export Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
