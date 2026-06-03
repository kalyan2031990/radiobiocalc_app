/**
 * Advanced Patient Cases Screen
 * 
 * Browse, search, filter, and sort patient cases with advanced capabilities
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useMemo } from "react";

interface PatientCase {
  id: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  diagnosis?: string;
  totalCalculations: number;
  lastUpdated: string;
  avgTCP?: number;
  avgNTCP?: number;
  riskLevel: "low" | "medium" | "high";
}

export default function PatientCasesAdvancedScreen() {
  const router = useRouter();
  const colors = useColors();

  const [cases] = useState<PatientCase[]>([
    {
      id: "1",
      patientName: "John Doe",
      patientID: "12345",
      studyDate: "2024-01-02",
      diagnosis: "Head & Neck Cancer",
      totalCalculations: 4,
      lastUpdated: "2024-01-02 10:30 AM",
      avgTCP: 87.5,
      avgNTCP: 12.3,
      riskLevel: "medium",
    },
    {
      id: "2",
      patientName: "Jane Smith",
      patientID: "67890",
      studyDate: "2024-01-01",
      diagnosis: "Prostate Cancer",
      totalCalculations: 3,
      lastUpdated: "2024-01-01 02:15 PM",
      avgTCP: 92.1,
      avgNTCP: 5.8,
      riskLevel: "low",
    },
    {
      id: "3",
      patientName: "Robert Johnson",
      patientID: "11111",
      studyDate: "2023-12-28",
      diagnosis: "Lung Cancer",
      totalCalculations: 5,
      lastUpdated: "2023-12-28 09:45 AM",
      avgTCP: 78.3,
      avgNTCP: 28.5,
      riskLevel: "high",
    },
    {
      id: "4",
      patientName: "Mary Williams",
      patientID: "22222",
      studyDate: "2023-12-25",
      diagnosis: "Breast Cancer",
      totalCalculations: 2,
      lastUpdated: "2023-12-25 03:20 PM",
      avgTCP: 95.2,
      avgNTCP: 3.2,
      riskLevel: "low",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "tcp" | "ntcp">("date");
  const [filterDiagnosis, setFilterDiagnosis] = useState<string | null>(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState<"low" | "medium" | "high" | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Get unique diagnoses for filter
  const diagnoses = useMemo(() => {
    return [...new Set(cases.map((c) => c.diagnosis).filter(Boolean))];
  }, [cases]);

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    let result = [...cases];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.patientName.toLowerCase().includes(query) ||
          c.patientID.toLowerCase().includes(query)
      );
    }

    // Diagnosis filter
    if (filterDiagnosis) {
      result = result.filter((c) => c.diagnosis === filterDiagnosis);
    }

    // Risk level filter
    if (filterRiskLevel) {
      result = result.filter((c) => c.riskLevel === filterRiskLevel);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime();
        case "name":
          return a.patientName.localeCompare(b.patientName);
        case "tcp":
          return (b.avgTCP || 0) - (a.avgTCP || 0);
        case "ntcp":
          return (a.avgNTCP || 0) - (b.avgNTCP || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [cases, searchQuery, filterDiagnosis, filterRiskLevel, sortBy]);

  const handleOpenCase = (caseId: string) => {
    router.push({
      pathname: "/case-details",
      params: { caseId },
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterDiagnosis(null);
    setFilterRiskLevel(null);
    setSortBy("date");
  };

  const activeFilters = [
    searchQuery.trim() ? 1 : 0,
    filterDiagnosis ? 1 : 0,
    filterRiskLevel ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

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
                  Patient Cases
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              {filteredAndSortedCases.length} of {cases.length} cases
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

          {/* Filter and Sort Buttons */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setShowFilterModal(true)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor:
                    activeFilters > 0 ? colors.primary : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-2 items-center flex-row justify-center gap-2"
            >
              <MaterialIcons
                name="filter-list"
                size={18}
                color={activeFilters > 0 ? "#ffffff" : colors.foreground}
              />
              <Text
                className="font-semibold text-sm"
                style={{
                  color:
                    activeFilters > 0 ? "#ffffff" : colors.foreground,
                }}
              >
                Filter {activeFilters > 0 ? `(${activeFilters})` : ""}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowSortModal(true)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-2 items-center flex-row justify-center gap-2"
            >
              <MaterialIcons
                name="sort"
                size={18}
                color={colors.foreground}
              />
              <Text
                className="font-semibold text-sm text-foreground"
                style={{ color: colors.foreground }}
              >
                Sort
              </Text>
            </Pressable>
          </View>

          {/* Cases List */}
          {filteredAndSortedCases.length > 0 ? (
            <FlatList
              data={filteredAndSortedCases}
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
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text
                            className="font-semibold text-foreground text-base"
                            style={{ color: colors.foreground }}
                          >
                            {item.patientName}
                          </Text>
                          <View
                            className="px-2 py-1 rounded"
                            style={{
                              backgroundColor:
                                item.riskLevel === "high"
                                  ? colors.error + "30"
                                  : item.riskLevel === "medium"
                                    ? colors.warning + "30"
                                    : colors.success + "30",
                            }}
                          >
                            <Text
                              className="text-xs font-semibold capitalize"
                              style={{
                                color:
                                  item.riskLevel === "high"
                                    ? colors.error
                                    : item.riskLevel === "medium"
                                      ? colors.warning
                                      : colors.success,
                              }}
                            >
                              {item.riskLevel}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          ID: {item.patientID}
                        </Text>
                      </View>
                    </View>

                    {item.diagnosis && (
                      <Text
                        className="text-sm text-muted mb-2"
                        style={{ color: colors.muted }}
                      >
                        {item.diagnosis}
                      </Text>
                    )}

                    {/* Metrics Row */}
                    <View className="flex-row justify-between gap-2 mb-2 p-2 rounded"
                      style={{ backgroundColor: colors.background }}
                    >
                      {item.avgTCP !== undefined && (
                        <View className="flex-1 items-center">
                          <Text
                            className="text-xs text-muted"
                            style={{ color: colors.muted }}
                          >
                            Avg TCP
                          </Text>
                          <Text
                            className="text-sm font-semibold text-success"
                            style={{ color: colors.success }}
                          >
                            {item.avgTCP.toFixed(1)}%
                          </Text>
                        </View>
                      )}
                      {item.avgNTCP !== undefined && (
                        <View className="flex-1 items-center">
                          <Text
                            className="text-xs text-muted"
                            style={{ color: colors.muted }}
                          >
                            Avg NTCP
                          </Text>
                          <Text
                            className="text-sm font-semibold text-warning"
                            style={{ color: colors.warning }}
                          >
                            {item.avgNTCP.toFixed(1)}%
                          </Text>
                        </View>
                      )}
                      <View className="flex-1 items-center">
                        <Text
                          className="text-xs text-muted"
                          style={{ color: colors.muted }}
                        >
                          Calcs
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          style={{ color: colors.foreground }}
                        >
                          {item.totalCalculations}
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="text-xs text-muted"
                      style={{ color: colors.muted }}
                    >
                      {item.lastUpdated}
                    </Text>
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
                name="search-off"
                size={48}
                color={colors.muted}
              />
              <Text
                className="text-sm font-semibold text-muted mt-4"
                style={{ color: colors.muted }}
              >
                No cases found
              </Text>
              <Text
                className="text-xs text-muted text-center mt-2"
                style={{ color: colors.muted }}
              >
                Try adjusting your filters or search terms
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-2xl p-4 gap-4"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Filters
              </Text>
              <Pressable
                onPress={() => setShowFilterModal(false)}
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
              {/* Diagnosis Filter */}
              <View className="gap-2 mb-4">
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Diagnosis:
                </Text>
                {diagnoses.map((diagnosis) => (
                  <Pressable
                    key={diagnosis}
                    onPress={() =>
                      setFilterDiagnosis(
                        filterDiagnosis === diagnosis ? null : (diagnosis || null)
                      )
                    }
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View className="flex-row items-center gap-3 py-2">
                      <View
                        className="w-5 h-5 rounded border-2 items-center justify-center"
                        style={{
                          borderColor:
                            filterDiagnosis === diagnosis
                              ? colors.primary
                              : colors.border,
                          backgroundColor:
                            filterDiagnosis === diagnosis
                              ? colors.primary
                              : "transparent",
                        }}
                      >
                        {filterDiagnosis === diagnosis && (
                          <MaterialIcons
                            name="check"
                            size={12}
                            color="#ffffff"
                          />
                        )}
                      </View>
                      <Text
                        className="text-sm text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {diagnosis}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Risk Level Filter */}
              <View className="gap-2">
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Risk Level:
                </Text>
                {["low", "medium", "high"].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() =>
                      setFilterRiskLevel(
                        filterRiskLevel === level ? null : (level as any)
                      )
                    }
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View className="flex-row items-center gap-3 py-2">
                      <View
                        className="w-5 h-5 rounded border-2 items-center justify-center"
                        style={{
                          borderColor:
                            filterRiskLevel === level
                              ? colors.primary
                              : colors.border,
                          backgroundColor:
                            filterRiskLevel === level
                              ? colors.primary
                              : "transparent",
                        }}
                      >
                        {filterRiskLevel === level && (
                          <MaterialIcons
                            name="check"
                            size={12}
                            color="#ffffff"
                          />
                        )}
                      </View>
                      <Text
                        className="text-sm text-foreground capitalize"
                        style={{ color: colors.foreground }}
                      >
                        {level}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row gap-2 pt-4 border-t"
              style={{ borderColor: colors.border }}
            >
              <Pressable
                onPress={handleClearFilters}
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
                  Clear
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg py-2 items-center"
              >
                <Text className="font-semibold text-white">Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="rounded-t-2xl p-4 gap-4"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-lg font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Sort By
              </Text>
              <Pressable
                onPress={() => setShowSortModal(false)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.foreground}
                />
              </Pressable>
            </View>

            {[
              { value: "date", label: "Study Date (Newest First)" },
              { value: "name", label: "Patient Name (A-Z)" },
              { value: "tcp", label: "Average TCP (Highest First)" },
              { value: "ntcp", label: "Average NTCP (Lowest First)" },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSortBy(option.value as any);
                  setShowSortModal(false);
                }}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View className="flex-row items-center gap-3 py-3">
                  <View
                    className="w-5 h-5 rounded-full border-2 items-center justify-center"
                    style={{
                      borderColor:
                        sortBy === option.value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        sortBy === option.value
                          ? colors.primary
                          : "transparent",
                    }}
                  >
                    {sortBy === option.value && (
                      <MaterialIcons
                        name="check"
                        size={12}
                        color="#ffffff"
                      />
                    )}
                  </View>
                  <Text
                    className="text-sm text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
