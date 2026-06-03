/**
 * Batch Processing Screen
 * 
 * Analyze multiple patients/structures in one workflow
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  ProgressBarAndroid,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

interface BatchJob {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  progress: number;
}

export default function BatchProcessingScreen() {
  const router = useRouter();
  const colors = useColors();

  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([
    {
      id: "1",
      name: "Head & Neck Batch - Jan 2024",
      status: "completed",
      totalItems: 8,
      processedItems: 8,
      failedItems: 0,
      createdAt: "2024-01-02 10:00 AM",
      progress: 100,
    },
    {
      id: "2",
      name: "Prostate Cases - Dec 2023",
      status: "completed",
      totalItems: 12,
      processedItems: 12,
      failedItems: 0,
      createdAt: "2023-12-28 02:00 PM",
      progress: 100,
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateBatch = () => {
    Alert.prompt(
      "Create Batch Job",
      "Enter a name for this batch job:",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Create",
          onPress: (name: string | undefined) => {
            if (name && name.trim()) {
              const newJob: BatchJob = {
                id: String(batchJobs.length + 1),
                name: name.trim(),
                status: "pending",
                totalItems: 0,
                processedItems: 0,
                failedItems: 0,
                createdAt: new Date().toLocaleString(),
                progress: 0,
              };
              setBatchJobs([newJob, ...batchJobs]);
            }
          },
        },
      ]
    );
  };

  const handleProcessBatch = async (jobId: string) => {
    setIsProcessing(true);

    // Simulate batch processing
    const updatedJobs = batchJobs.map((job) => {
      if (job.id === jobId) {
        return {
          ...job,
          status: "processing" as const,
          totalItems: 8,
          processedItems: 0,
          progress: 0,
        };
      }
      return job;
    });
    setBatchJobs(updatedJobs);

    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setBatchJobs((jobs) =>
        jobs.map((job) => {
          if (job.id === jobId) {
            return {
              ...job,
              processedItems: Math.floor((i / 100) * 8),
              progress: i,
            };
          }
          return job;
        })
      );
    }

    // Complete processing
    setBatchJobs((jobs) =>
      jobs.map((job) => {
        if (job.id === jobId) {
          return {
            ...job,
            status: "completed" as const,
            processedItems: 8,
            progress: 100,
          };
        }
        return job;
      })
    );

    setIsProcessing(false);
    Alert.alert("Success", "Batch processing completed successfully.");
  };

  const handleViewResults = (jobId: string) => {
    Alert.alert(
      "Batch Results",
      `Viewing results for batch job ${jobId}`
    );
  };

  const handleExportBatch = (jobId: string, format: string) => {
    Alert.alert(
      "Export",
      `Exporting batch results as ${format.toUpperCase()}...`
    );
  };

  const handleDeleteBatch = (jobId: string) => {
    Alert.alert(
      "Delete Batch",
      "Are you sure you want to delete this batch job?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            setBatchJobs(batchJobs.filter((j) => j.id !== jobId));
          },
          style: "destructive",
        },
      ]
    );
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
                  Batch Processing
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              Analyze multiple patients/structures in one workflow
            </Text>
          </View>

          {/* Create Batch Button */}
          <Pressable
            onPress={handleCreateBatch}
            disabled={isProcessing}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : isProcessing ? 0.5 : 1,
              },
            ]}
            className="rounded-lg py-3 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">Create Batch Job</Text>
          </Pressable>

          {/* Batch Jobs List */}
          {batchJobs.length > 0 ? (
            <FlatList
              data={batchJobs}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View
                  className="rounded-lg p-4 mb-3 border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                >
                  {/* Job Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text
                        className="font-semibold text-foreground text-base"
                        style={{ color: colors.foreground }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        {item.createdAt}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          item.status === "completed"
                            ? colors.success + "30"
                            : item.status === "processing"
                              ? colors.primary + "30"
                              : colors.warning + "30",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold capitalize"
                        style={{
                          color:
                            item.status === "completed"
                              ? colors.success
                              : item.status === "processing"
                                ? colors.primary
                                : colors.warning,
                        }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        Progress:
                      </Text>
                      <Text
                        className="text-xs font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {item.progress}%
                      </Text>
                    </View>
                    <View
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: colors.border }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: colors.primary,
                          width: `${item.progress}%`,
                        }}
                      />
                    </View>
                  </View>

                  {/* Statistics */}
                  <View className="flex-row justify-between mb-3 p-2 rounded"
                    style={{ backgroundColor: colors.background }}
                  >
                    <View className="items-center">
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        Total
                      </Text>
                      <Text
                        className="text-sm font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {item.totalItems}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        Processed
                      </Text>
                      <Text
                        className="text-sm font-semibold text-success"
                        style={{ color: colors.success }}
                      >
                        {item.processedItems}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        Failed
                      </Text>
                      <Text
                        className="text-sm font-semibold text-error"
                        style={{ color: colors.error }}
                      >
                        {item.failedItems}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    {item.status === "pending" && (
                      <Pressable
                        onPress={() => handleProcessBatch(item.id)}
                        disabled={isProcessing}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        className="rounded-lg py-2 items-center"
                      >
                        {isProcessing ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="font-semibold text-white text-sm">
                            Start Processing
                          </Text>
                        )}
                      </Pressable>
                    )}

                    {item.status === "completed" && (
                      <>
                        <Pressable
                          onPress={() => handleViewResults(item.id)}
                          style={({ pressed }) => [
                            {
                              flex: 1,
                              backgroundColor: colors.primary,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                          className="rounded-lg py-2 items-center"
                        >
                          <Text className="font-semibold text-white text-sm">
                            View Results
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleExportBatch(item.id, "csv")}
                          style={({ pressed }) => [
                            {
                              backgroundColor: colors.success,
                              opacity: pressed ? 0.8 : 1,
                              paddingHorizontal: 12,
                            },
                          ]}
                          className="rounded-lg py-2 items-center justify-center"
                        >
                          <MaterialIcons
                            name="download"
                            size={18}
                            color="#ffffff"
                          />
                        </Pressable>

                        <Pressable
                          onPress={() => handleDeleteBatch(item.id)}
                          style={({ pressed }) => [
                            {
                              backgroundColor: colors.error,
                              opacity: pressed ? 0.8 : 1,
                              paddingHorizontal: 12,
                            },
                          ]}
                          className="rounded-lg py-2 items-center justify-center"
                        >
                          <MaterialIcons
                            name="delete"
                            size={18}
                            color="#ffffff"
                          />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              )}
            />
          ) : (
            <View
              className="rounded-lg p-8 items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <MaterialIcons
                name="batch-prediction"
                size={48}
                color={colors.muted}
              />
              <Text
                className="text-sm font-semibold text-muted mt-4"
                style={{ color: colors.muted }}
              >
                No batch jobs yet
              </Text>
              <Text
                className="text-xs text-muted text-center mt-2"
                style={{ color: colors.muted }}
              >
                Create a new batch job to analyze multiple patients/structures
              </Text>
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
              Batch Processing Features:
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              ✓ Analyze multiple patients in one workflow
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              ✓ Process multiple structures per patient
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              ✓ Generate comparative reports
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              ✓ Export results in CSV or JSON format
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              ✓ Track processing progress and statistics
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
