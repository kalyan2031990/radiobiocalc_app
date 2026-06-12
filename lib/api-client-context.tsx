/**
 * Recreate tRPC client after Pilot API URL is loaded or changed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Pressable, View, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { loadPilotApiOverride } from "@/lib/pilot-api-store";
import { getApiBaseUrl } from "@/constants/oauth";
import { isOfflineBuild, usesLocalEngine } from "@/lib/offline-mode";
import { mobileBootSelfTest } from "@/lib/mobile-boot-selftest";
import { useColors } from "@/hooks/use-colors";

type ApiClientContextValue = {
  refreshApiClient: () => Promise<void>;
  apiBaseUrl: string;
};

const ApiClientContext = createContext<ApiClientContextValue | null>(null);

export function useApiClient() {
  const ctx = useContext(ApiClientContext);
  if (!ctx) throw new Error("useApiClient outside ApiClientProvider");
  return ctx;
}

async function loadPilotApiOverrideWithTimeout(ms = 3000): Promise<void> {
  await Promise.race([
    loadPilotApiOverride(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
  ]);
}

function initTrpcClient(): ReturnType<typeof createTRPCClient> | null {
  try {
    return createTRPCClient();
  } catch (e) {
    console.warn("[ApiClientProvider] createTRPCClient failed", e);
    return null;
  }
}

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  const [trpcClient, setTrpcClient] = useState(initTrpcClient);

  const rebuild = useCallback(async () => {
    setBootError(null);
    setTrpcClient((current) => current ?? initTrpcClient());
    try {
      await loadPilotApiOverrideWithTimeout();
      if (usesLocalEngine()) {
        const engine = mobileBootSelfTest();
        if (!engine.ok) {
          setBootError(engine.detail);
        }
      }
      const base = getApiBaseUrl();
      setApiBaseUrl(
        base || (usesLocalEngine() ? "offline://device" : ""),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API client setup failed";
      console.warn("[ApiClientProvider]", msg, e);
      setBootError(msg);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void rebuild();
  }, [rebuild]);

  const value = useMemo(
    () => ({
      refreshApiClient: rebuild,
      apiBaseUrl,
    }),
    [rebuild, apiBaseUrl],
  );

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.muted, textAlign: "center" }}>
          {usesLocalEngine() ? "Starting offline engine…" : "Loading API settings…"}
        </Text>
      </View>
    );
  }

  if (!trpcClient) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          padding: 24,
        }}
      >
        <Text style={{ color: colors.error, textAlign: "center", marginBottom: 12 }}>
          {bootError ?? "Could not start the app API client."}
        </Text>
        <Pressable
          onPress={() => void rebuild()}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: colors.background, fontWeight: "600" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ApiClientContext.Provider value={value}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </ApiClientContext.Provider>
  );
}
