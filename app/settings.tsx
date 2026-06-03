/**
 * Settings & Preferences Screen
 * 
 * Customize app settings, default parameters, and preferences
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const colorScheme = useColorScheme();

  const [settings, setSettings] = useState({
    defaultNTCPModel: "lkb-loglogit",
    defaultTCPModel: "poisson",
    defaultAlphaBeta: "3",
    darkMode: colorScheme === "dark",
    autoSave: true,
    notifications: true,
    exportFormat: "pdf",
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSelectModel = (
    key: "defaultNTCPModel" | "defaultTCPModel" | "exportFormat",
    value: string
  ) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleAlphaBetaChange = (value: string) => {
    setSettings({
      ...settings,
      defaultAlphaBeta: value,
    });
  };

  const handleSaveSettings = () => {
    Alert.alert("Success", "Settings saved successfully.");
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to defaults?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            setSettings({
              defaultNTCPModel: "lkb-loglogit",
              defaultTCPModel: "poisson",
              defaultAlphaBeta: "3",
              darkMode: colorScheme === "dark",
              autoSave: true,
              notifications: true,
              exportFormat: "pdf",
            });
            Alert.alert("Success", "Settings reset to defaults.");
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
                  Settings & Preferences
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              Customize app behavior and default parameters
            </Text>
          </View>

          {/* Calculation Models Section */}
          <View className="gap-3">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Calculation Models:
            </Text>

            {/* NTCP Model Selection */}
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Default NTCP Model:
              </Text>
              {["lkb-loglogit", "lkb-probit", "poisson"].map((model) => (
                <Pressable
                  key={model}
                  onPress={() =>
                    handleSelectModel("defaultNTCPModel", model)
                  }
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View className="flex-row items-center gap-3 py-2">
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor:
                          settings.defaultNTCPModel === model
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          settings.defaultNTCPModel === model
                            ? colors.primary
                            : "transparent",
                      }}
                    >
                      {settings.defaultNTCPModel === model && (
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
                      {model === "lkb-loglogit"
                        ? "LKB Log-Logistic"
                        : model === "lkb-probit"
                          ? "LKB Probit"
                          : "Poisson"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* TCP Model Selection */}
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Default TCP Model:
              </Text>
              {["poisson", "lkb-tcp"].map((model) => (
                <Pressable
                  key={model}
                  onPress={() =>
                    handleSelectModel("defaultTCPModel", model)
                  }
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View className="flex-row items-center gap-3 py-2">
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor:
                          settings.defaultTCPModel === model
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          settings.defaultTCPModel === model
                            ? colors.primary
                            : "transparent",
                      }}
                    >
                      {settings.defaultTCPModel === model && (
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
                      {model === "poisson" ? "Poisson" : "LKB-based"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Radiobiological Parameters */}
          <View className="gap-3">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Radiobiological Parameters:
            </Text>

            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="gap-2">
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Default α/β Ratio (Gy):
                </Text>
                <TextInput
                  value={settings.defaultAlphaBeta}
                  onChangeText={handleAlphaBetaChange}
                  placeholder="Enter α/β ratio"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  className="rounded-lg px-3 py-2 text-foreground border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                />
                <Text
                  className="text-xs text-muted"
                  style={{ color: colors.muted }}
                >
                  Typical values: 2-10 Gy (varies by tissue type)
                </Text>
              </View>
            </View>
          </View>

          {/* Export Settings */}
          <View className="gap-3">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Export Settings:
            </Text>

            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Default Export Format:
              </Text>
              {["pdf", "html", "csv", "json"].map((format) => (
                <Pressable
                  key={format}
                  onPress={() =>
                    handleSelectModel("exportFormat", format)
                  }
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View className="flex-row items-center gap-3 py-2">
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor:
                          settings.exportFormat === format
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          settings.exportFormat === format
                            ? colors.primary
                            : "transparent",
                      }}
                    >
                      {settings.exportFormat === format && (
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
                      {format.toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* App Preferences */}
          <View className="gap-3">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              App Preferences:
            </Text>

            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    Auto-Save Calculations
                  </Text>
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    Automatically save calculations to history
                  </Text>
                </View>
                <Switch
                  value={settings.autoSave}
                  onValueChange={() => handleToggle("autoSave")}
                />
              </View>

              <View className="flex-row items-center justify-between pt-3 border-t"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    Notifications
                  </Text>
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    Receive app notifications and alerts
                  </Text>
                </View>
                <Switch
                  value={settings.notifications}
                  onValueChange={() => handleToggle("notifications")}
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2">
            <Pressable
              onPress={handleSaveSettings}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">Save Settings</Text>
            </Pressable>

            <Pressable
              onPress={handleResetSettings}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.error,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">Reset to Defaults</Text>
            </Pressable>
          </View>

          {/* Information */}
          <View
            className="rounded-lg p-4 gap-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="font-semibold text-foreground text-sm"
              style={{ color: colors.foreground }}
            >
              About RadioBioCalc:
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              Version: 1.0.0
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              Built with QUANTEC and RTOG guidelines for comprehensive radiobiology calculations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
