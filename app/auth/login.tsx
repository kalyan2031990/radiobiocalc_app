/**
 * Sign in — email and password only.
 */

import { useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { setSessionToken, setUserInfo } from "@/lib/_core/auth";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailLogin = trpc.auth.local.loginWithEmail.useMutation();

  const handleEmailLogin = async () => {
    try {
      const res = await emailLogin.mutateAsync({ email: email.trim(), password });
      if (!res.success) {
        Alert.alert("Sign in failed", res.error ?? "Unknown error");
        return;
      }
      await setSessionToken(res.token);
      await setUserInfo({
        id: 0,
        openId: res.userId,
        name: res.name,
        email: res.email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>Sign in</Text>
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 12,
            borderRadius: 10,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
            Sign-in uses your email and password on the rbGyanX server. This app does not send
            verification or login emails to your inbox. After registering, use the same password
            here. Ensure the API is running (npm run dev:server).
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
            Mobile SMS OTP is not enabled (requires regulated SMS provider). Email/password is
            used for research deployments.
          </Text>
        </View>

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
            color: colors.foreground,
          }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
            color: colors.foreground,
          }}
        />
        <Pressable
          onPress={handleEmailLogin}
          disabled={emailLogin.isPending}
          style={{
            backgroundColor: colors.primary,
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          {emailLogin.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>Sign in</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/register")}>
          <Text style={{ color: colors.primary, textAlign: "center" }}>
            New user? Create an account
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
