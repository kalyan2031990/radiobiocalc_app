/**
 * Shrink TPS DVHs for mobile memory / Hermes limits (768+ points per structure).
 */

import { Platform } from "react-native";
import { resampleDVH } from "@/server/data-handler";
import type { ParsedDvhBundle } from "@/lib/dvh-bundle-types";

const MOBILE_MAX_DVH_POINTS = 400;

export function compactDvhBundleForDevice(bundle: ParsedDvhBundle): ParsedDvhBundle {
  if (Platform.OS === "web") return bundle;

  const dvhByStructure: ParsedDvhBundle["dvhByStructure"] = {};
  for (const [name, points] of Object.entries(bundle.dvhByStructure ?? {})) {
    if (!points?.length) continue;
    dvhByStructure[name] =
      points.length > MOBILE_MAX_DVH_POINTS
        ? resampleDVH(points, MOBILE_MAX_DVH_POINTS)
        : points;
  }

  return { ...bundle, dvhByStructure };
}
