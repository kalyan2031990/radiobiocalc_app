/**
 * Pilot testers: set the rbGyanX API server URL (one APK, many networks).
 */

import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  loadPilotApiOverride,
  setPilotApiOverride,
  testPilotApiConnection,
} from "@/lib/pilot-api-store";

export default function PilotApiSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [activeUrl, setActiveUrl] = useState("");

  useEffect(() => {
    loadPilotApiOverride().then((stored) => {
      if (stored) setUrl(stored);
      setActiveUrl(getApiBaseUrl());
    });
  }, []);

  const runTest = async () => {
    setTesting(true);
    const result = await testPilotApiConnection(url);
    setTesting(false);
    Alert.alert(result.ok ? "Connected" : "Connection failed", result.message);
  };

  const save = async () => {
    await setPilotApiOverride(url.trim() || null);
    setActiveUrl(getApiBaseUrl());
    Alert.alert(
      "Saved",
      url.trim()
        ? `API set to ${getApiBaseUrl()}. Fully close and reopen the app if calculations still fail.`
        : "Cleared custom URL — using default from install.",
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View className="gap-5 px-4 pt-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
              <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Pilot API server
              </Text>
            </View>
          </Pressable>

          <View
            className="rounded-xl p-4 gap-3"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              This pilot APK needs your team&apos;s rbGyanX API running (port 3000). Ask the coordinator
              for the URL — often your PC LAN address on Wi‑Fi, e.g. http://192.168.1.10:3000, or a
              tunnel (ngrok) URL if testers are remote.
            </Text>
            <Text className="text-xs" style={{ color: colors.foreground }}>
              Active: {activeUrl || "(not set)"}
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.1.10:3000"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                color: colors.foreground,
                backgroundColor: colors.background,
              }}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={runTest}
                disabled={testing}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    opacity: pressed || testing ? 0.7 : 1,
                    backgroundColor: colors.primary,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  },
                ]}
              >
                {testing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Test connection</Text>
                )}
              </Pressable>
              <Pressable
                onPress={save}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: colors.success,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
              </Pressable>
            </View>
          </View>

          <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: "#FEF3C7" }}>
            <Text className="text-xs font-semibold" style={{ color: "#92400E" }}>
              Coordinator checklist
            </Text>
            <Text className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
              1. On a PC: cd radiobiocalc_app → pnpm install → set .env EXPO_PUBLIC_API_BASE_URL is not
              needed on server; run: pnpm run build && pnpm start{"\n"}
              2. Allow Windows firewall port 3000 on private network{"\n"}
              3. Share this APK + the http://YOUR_LAN_IP:3000 URL with testers{"\n"}
              4. Testers must be on same Wi‑Fi OR use ngrok http 3000
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
