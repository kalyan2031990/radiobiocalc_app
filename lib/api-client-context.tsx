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

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  }));
  const [trpcClient, setTrpcClient] = useState<ReturnType<typeof createTRPCClient> | null>(
    null,
  );

  const rebuild = useCallback(async () => {
    await loadPilotApiOverride();
    const base = getApiBaseUrl();
    setApiBaseUrl(
      isOfflineBuild()
        ? base || "offline://device"
        : base,
    );
    setTrpcClient(createTRPCClient());
    setReady(true);
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.muted }}>
          {isOfflineBuild() ? "Starting offline engine…" : "Loading API settings…"}
        </Text>
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
