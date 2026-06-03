/**
 * Mounted in root layout — runs feature tour without unmount crashes.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DISCLAIMER_KEY, isFirstLaunchPending } from "@/lib/onboarding";
import { runFeatureTour } from "@/lib/feature-tour";

export function FeatureTourHost() {
  const router = useRouter();
  const segments = useSegments();
  const firstRunRef = useRef(false);

  useEffect(() => {
    if (firstRunRef.current) return;

    const tryFirstLaunchTour = async () => {
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
