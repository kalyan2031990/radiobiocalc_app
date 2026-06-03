/**
 * Cloud Sync Settings Screen
 * 
 * Manage cloud synchronization and cross-device data sync
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

export default function CloudSyncSettingsScreen() {
  const router = useRouter();
  const colors = useColors();

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("2024-01-02 10:30 AM");
  const [storageUsed, setStorageUsed] = useState(245); // MB
  const [storageLimit] = useState(5120); // 5GB in MB

  const handleToggleCloudSync = () => {
    if (!cloudSyncEnabled) {
      Alert.alert(
        "Enable Cloud Sync",
        "Enabling cloud sync will upload your patient cases and calculations to the cloud. Your data will be encrypted and securely stored.",
        [
          { text: "Cancel", onPress: () => {}, style: "cancel" },
          {
            text: "Enable",
            onPress: () => setCloudSyncEnabled(true),
          },
        ]
      );
    } else {
      Alert.alert(
        "Disable Cloud Sync",
        "Disabling cloud sync will stop uploading new data to the cloud. Your existing cloud data will be retained.",
        [
          { text: "Cancel", onPress: () => {}, style: "cancel" },
          {
            text: "Disable",
            onPress: () => setCloudSyncEnabled(false),
            style: "destructive",
          },
        ]
      );
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
    setLastSyncTime(new Date().toLocaleString());
    Alert.alert("Success", "Cloud sync completed successfully.");
  };

  const handleClearCloudData = () => {
    Alert.alert(
      "Clear Cloud Data",
      "This will delete all your data from the cloud. Local data will not be affected. This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Clear",
          onPress: () => {
            Alert.alert("Success", "Cloud data cleared successfully.");
          },
          style: "destructive",
        },
      ]
    );
  };

  const storagePercentage = (storageUsed / storageLimit) * 100;

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
                  Cloud Sync Settings
                </Text>
              </View>
            </Pressable>
            <Text
              className="text-sm text-muted"
              style={{ color: colors.muted }}
            >
              Manage cloud synchronization and cross-device data sync
            </Text>
          </View>

          {/* Cloud Sync Status */}
          <View
            className="rounded-lg p-4 gap-3"
            style={{
              backgroundColor:
                cloudSyncEnabled && colors.success
                  ? colors.success + "15"
                  : colors.warning + "15",
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <MaterialIcons
                  name={cloudSyncEnabled ? "cloud-done" : "cloud-off"}
                  size={24}
                  color={
                    cloudSyncEnabled ? colors.success : colors.warning
                  }
                />
                <View className="flex-1">
                  <Text
                    className="font-semibold text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    {cloudSyncEnabled ? "Cloud Sync Active" : "Cloud Sync Inactive"}
                  </Text>
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    Last sync: {lastSyncTime}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cloud Sync Toggle */}
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
                  Enable Cloud Sync
                </Text>
                <Text
                  className="text-xs text-muted"
                  style={{ color: colors.muted }}
                >
                  Sync patient data across all your devices
                </Text>
              </View>
              <Switch
                value={cloudSyncEnabled}
                onValueChange={handleToggleCloudSync}
              />
            </View>
          </View>

          {/* Auto Sync Settings */}
          {cloudSyncEnabled && (
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
                    Auto-Sync
                  </Text>
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    Automatically sync changes to the cloud
                  </Text>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={setAutoSync}
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
                    Sync on WiFi Only
                  </Text>
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    Save mobile data by syncing only on WiFi
                  </Text>
                </View>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                />
              </View>
            </View>
          )}

          {/* Storage Usage */}
          {cloudSyncEnabled && (
            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Cloud Storage:
              </Text>

              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text
                    className="text-xs text-muted"
                    style={{ color: colors.muted }}
                  >
                    {storageUsed} MB of {storageLimit} MB used
                  </Text>
                  <Text
                    className="text-xs font-semibold text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    {storagePercentage.toFixed(1)}%
                  </Text>
                </View>

                <View
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: colors.border }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        storagePercentage > 80
                          ? colors.error
                          : storagePercentage > 50
                            ? colors.warning
                            : colors.success,
                      width: `${Math.min(storagePercentage, 100)}%`,
                    }}
                  />
                </View>

                <Text
                  className="text-xs text-muted"
                  style={{ color: colors.muted }}
                >
                  {storageLimit - storageUsed} MB available
                </Text>
              </View>
            </View>
          )}

          {/* Manual Sync Button */}
          {cloudSyncEnabled && (
            <Pressable
              onPress={handleManualSync}
              disabled={isSyncing}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : isSyncing ? 0.5 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center flex-row justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text className="font-semibold text-white">Syncing...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="sync" size={20} color="#ffffff" />
                  <Text className="font-semibold text-white">Sync Now</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Sync History */}
          {cloudSyncEnabled && (
            <View
              className="rounded-lg p-4 gap-2"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-sm font-semibold text-foreground"
                style={{ color: colors.foreground }}
              >
                Recent Sync Activity:
              </Text>
              <Text
                className="text-xs text-muted"
                style={{ color: colors.muted }}
              >
                ✓ 12 patient cases synced
              </Text>
              <Text
                className="text-xs text-muted"
                style={{ color: colors.muted }}
              >
                ✓ 45 calculations synced
              </Text>
              <Text
                className="text-xs text-muted"
                style={{ color: colors.muted }}
              >
                ✓ 8 reports synced
              </Text>
            </View>
          )}

          {/* Danger Zone */}
          <View className="gap-2">
            <Text
              className="text-xs font-semibold text-error"
              style={{ color: colors.error }}
            >
              Danger Zone:
            </Text>

            <Pressable
              onPress={handleClearCloudData}
              disabled={!cloudSyncEnabled}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.error,
                  opacity: pressed ? 0.8 : !cloudSyncEnabled ? 0.5 : 1,
                },
              ]}
              className="rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-white">Clear Cloud Data</Text>
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
              About Cloud Sync:
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed"
              style={{ color: colors.muted }}
            >
              Your patient data is encrypted and securely stored on our servers. You can access your data from any device by signing in with your account.
            </Text>
            <Text
              className="text-xs text-muted leading-relaxed mt-2"
              style={{ color: colors.muted }}
            >
              Cloud sync requires an active internet connection. Changes made offline will be synced when you reconnect.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
