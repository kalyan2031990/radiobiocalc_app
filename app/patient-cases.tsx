/**
 * Patient Cases Screen
 * 
 * View, manage, and retrieve saved patient cases and calculations
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

interface PatientCase {
  id: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  diagnosis?: string;
  totalCalculations: number;
  lastUpdated: string;
}

export default function PatientCasesScreen() {
  const router = useRouter();
  const colors = useColors();
  const [cases, setCases] = useState<PatientCase[]>([
    {
      id: "1",
      patientName: "John Doe",
      patientID: "12345",
      studyDate: "2024-01-02",
      diagnosis: "Head & Neck Cancer",
      totalCalculations: 4,
      lastUpdated: "2024-01-02 10:30 AM",
    },
    {
      id: "2",
      patientName: "Jane Smith",
      patientID: "67890",
      studyDate: "2024-01-01",
      diagnosis: "Prostate Cancer",
      totalCalculations: 3,
      lastUpdated: "2024-01-01 02:15 PM",
    },
    {
      id: "3",
      patientName: "Robert Johnson",
      patientID: "11111",
      studyDate: "2023-12-28",
      diagnosis: "Lung Cancer",
      totalCalculations: 5,
      lastUpdated: "2023-12-28 09:45 AM",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCases, setFilteredCases] = useState<PatientCase[]>(cases);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCases(cases);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCases(
        cases.filter(
          (c) =>
            c.patientName.toLowerCase().includes(query) ||
            c.patientID.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, cases]);

  const handleOpenCase = (caseId: string) => {
    router.push({
      pathname: "/case-details",
      params: { caseId },
    });
  };

  const handleDeleteCase = (caseId: string, patientName: string) => {
    Alert.alert(
      "Delete Case",
      `Are you sure you want to delete the case for ${patientName}? This action cannot be undone.`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            setCases(cases.filter((c) => c.id !== caseId));
            Alert.alert("Success", "Case deleted successfully.");
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleNewCase = () => {
    router.push("/dvh-input");
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
                  Patient Cases
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              View and manage saved patient cases and calculations
            </Text>
          </View>

          {/* Search Bar */}
          <View
            className="rounded-lg flex-row items-center gap-2 px-3"
            style={{ backgroundColor: colors.surface }}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={colors.muted}
            />
            <TextInput
              placeholder="Search by name or ID..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 py-3 text-foreground"
              style={{ color: colors.foreground }}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            )}
          </View>

          {/* New Case Button */}
          <Pressable
            onPress={handleNewCase}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            className="rounded-lg py-3 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">New Case</Text>
          </Pressable>

          {/* Cases List */}
          {filteredCases.length > 0 ? (
            <FlatList
              data={filteredCases}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleOpenCase(item.id)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    className="rounded-lg p-4 mb-3 border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-foreground text-base"
                          style={{ color: colors.foreground }}
                        >
                          {item.patientName}
                        </Text>
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          ID: {item.patientID}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          handleDeleteCase(item.id, item.patientName)
                        }
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={20}
                          color={colors.error}
                        />
                      </Pressable>
                    </View>

                    {item.diagnosis && (
                      <Text
                        className="text-sm text-muted mb-2"
                        style={{ color: colors.muted }}
                      >
                        {item.diagnosis}
                      </Text>
                    )}

                    <View className="flex-row justify-between items-center pt-2 border-t"
                      style={{ borderColor: colors.border }}
                    >
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons
                          name="calculate"
                          size={16}
                          color={colors.primary}
                        />
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          {item.totalCalculations} calculations
                        </Text>
                      </View>
                      <Text
                        className="text-xs text-muted"
                        style={{ color: colors.muted }}
                      >
                        {item.lastUpdated}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <View
              className="rounded-lg p-8 items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <MaterialIcons
                name="folder-open"
                size={48}
                color={colors.muted}
              />
              <Text
                className="text-sm font-semibold text-muted mt-4"
                style={{ color: colors.muted }}
              >
                {searchQuery.length > 0
                  ? "No cases found"
                  : "No cases yet"}
              </Text>
              <Text
                className="text-xs text-muted text-center mt-2"
                style={{ color: colors.muted }}
              >
                {searchQuery.length > 0
                  ? "Try a different search term"
                  : "Create a new case to get started"}
              </Text>
            </View>
          )}

          {/* Statistics */}
          {cases.length > 0 && (
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="font-semibold text-foreground text-sm"
                style={{ color: colors.foreground }}
              >
                Statistics:
              </Text>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Total Cases:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {cases.length}
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
                  {cases.reduce((sum, c) => sum + c.totalCalculations, 0)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
