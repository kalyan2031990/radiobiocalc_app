/**
 * Mounted in root layout — runs feature tour without unmount crashes.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DISCLAIMER_KEY, isFirstLaunchPending } from "@/lib/onboarding";
import { isOfflineBuild } from "@/lib/offline-mode";
import { runFeatureTour } from "@/lib/feature-tour";

export function FeatureTourHost() {
  const router = useRouter();
  const segments = useSegments();
  const firstRunRef = useRef(false);

  useEffect(() => {
    if (firstRunRef.current) return;

    const tryFirstLaunchTour = async () => {
      // Heavy server engine on first launch can crash Android/Hermes — skip on offline mobile.
      if (isOfflineBuild() && Platform.OS !== "web") return;

      const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
      if (accepted !== "true") return;
      const onTabs = segments[0] === "(tabs)" || segments.length === 0;
      if (!onTabs) return;
      const pending = await isFirstLaunchPending();
      if (!pending) return;

      firstRunRef.current = true;
      await runFeatureTour(router);
    };

    tryFirstLaunchTour();
  }, [router, segments]);

  return null;
}
