/**
 * API URL — pilot (all features) or mobile offline build (PDF/DOCX export only).
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
import { useApiClient } from "@/lib/api-client-context";
import {
  loadPilotApiOverride,
  setPilotApiOverride,
  testPilotApiConnection,
} from "@/lib/pilot-api-store";
import { isOfflineBuild, OFFLINE_EXPORT_HINT } from "@/lib/offline-mode";

export default function PilotApiSetupScreen() {
  const offlineMobile = isOfflineBuild();
  const router = useRouter();
  const colors = useColors();
  const { refreshApiClient } = useApiClient();
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
    await refreshApiClient();
    setActiveUrl(getApiBaseUrl());
    Alert.alert(
      "Saved",
      url.trim()
        ? `API set to ${getApiBaseUrl()}. The app will reload API settings now.`
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
                {offlineMobile ? "Report export server" : "Pilot API server"}
              </Text>
            </View>
          </Pressable>

          <View
            className="rounded-xl p-4 gap-3"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
              {offlineMobile
                ? `${OFFLINE_EXPORT_HINT} Run npm run start:server on a PC. Remote testers: use https ngrok (ngrok http 3000) — no trailing slash. Same Wi‑Fi testers may use http://LAN_IP:3000. Calculations never use this URL.`
                : "API must be running on this PC (npm run start:server). On the phone use your PC's Wi‑Fi IPv4 from ipconfig — often 192.168.0.x. Example: http://192.168.0.101:3000. Same Wi‑Fi only; allow Windows Firewall port 3000. Remote testers: https ngrok URL."}
            </Text>
            <Text className="text-xs" style={{ color: colors.foreground }}>
              Active: {activeUrl || "(not set)"}
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder={offlineMobile ? "https://xxxx.ngrok-free.app" : "http://192.168.0.101:3000"}
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
              {offlineMobile ? "Remote Android / iOS testers" : "Coordinator checklist"}
            </Text>
            <Text className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
              {offlineMobile
                ? "1. Build: npm run build:mobile-apk (Android) or build:mobile-ios (iOS)\n2. PC: npm run start:server + ngrok http 3000\n3. Share install link + ngrok https URL here\n4. DVH/calc work offline; export reports after saving URL"
                : "1. On a PC: cd radiobiocalc_app → npm install → npm run start:server\n2. Allow Windows firewall port 3000 on private network\n3. Share pilot APK + http://YOUR_LAN_IP:3000\n4. Same Wi‑Fi OR ngrok http 3000"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
