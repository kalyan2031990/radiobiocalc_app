/**
 * Register — email and password.
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

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = trpc.auth.local.registerWithEmail.useMutation();

  const handleRegister = async () => {
    try {
      const res = await register.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (!res.success) {
        Alert.alert("Registration failed", res.error ?? "Unknown error");
        return;
      }
      await setSessionToken(res.token);
      await setUserInfo({
        id: 0,
        openId: res.userId,
        name: name.trim(),
        email: email.trim(),
        loginMethod: "email",
        lastSignedIn: new Date(),
      });
      Alert.alert("Account created", "You are signed in.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Registration failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
          Create account
        </Text>

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
            No confirmation email is sent. Your account is created on the rbGyanX API server
            immediately. Remember your password, then sign in on the next screen.
          </Text>
        </View>

        <TextInput
          placeholder="Full name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
            color: colors.foreground,
          }}
        />
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
          placeholder="Password (min 8 characters)"
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
          onPress={handleRegister}
          disabled={register.isPending}
          style={{
            backgroundColor: colors.primary,
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          {register.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>Register</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace("/auth/login")}>
          <Text style={{ color: colors.primary, textAlign: "center" }}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
