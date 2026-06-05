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
import { ActivityIndicator, View, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { loadPilotApiOverride } from "@/lib/pilot-api-store";
import { getApiBaseUrl } from "@/constants/oauth";
import { isOfflineBuild } from "@/lib/offline-mode";
import { offlineEngineSelfTest } from "@/lib/offline-engine";
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
  const [trpcClient, setTrpcClient] = useState<ReturnType<
    typeof createTRPCClient
  > | null>(null);

  const rebuild = useCallback(async () => {
    setBootError(null);
    try {
      if (isOfflineBuild()) {
        void loadPilotApiOverride();
        const engine = offlineEngineSelfTest();
        if (!engine.ok) {
          setBootError(engine.detail);
        }
        const base = getApiBaseUrl();
        setApiBaseUrl(base || "offline://device");
        setTrpcClient(createTRPCClient());
      } else {
        await loadPilotApiOverrideWithTimeout();
        setApiBaseUrl(getApiBaseUrl());
        setTrpcClient(createTRPCClient());
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : "API client setup failed";
      console.warn("[ApiClientProvider]", msg, e);
      setBootError(msg);
      try {
        setTrpcClient(createTRPCClient());
      } catch {
        /* keep null — still unblock UI below */
      }
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

  if (!ready || !trpcClient) {
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
          {isOfflineBuild() ? "Starting offline engine…" : "Loading API settings…"}
        </Text>
        {bootError ? (
          <Text
            style={{
              marginTop: 8,
              color: colors.error,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {bootError}
          </Text>
        ) : null}
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
