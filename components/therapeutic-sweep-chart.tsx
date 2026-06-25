/**
 * Therapeutic-window dose sweep — TCP, NTCP, UTCP vs total dose (F3).
 */

import { View, Text, Dimensions } from "react-native";
import Svg, { Line, Circle, Path, Text as SvgText, G, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { TherapeuticSweepPoint } from "@/lib/dose-sweep";

type Props = {
  points: TherapeuticSweepPoint[];
  optimalDoseGy: number;
  optimalUtcp: number;
  currentDoseGy?: number;
};

export function TherapeuticSweepChart({
  points,
  optimalDoseGy,
  optimalUtcp,
  currentDoseGy,
}: Props) {
  const colors = useColors();
  const width = Dimensions.get("window").width - 48;
  const height = 280;
  const padding = 44;

  if (!points.length) return null;

  const doseMin = points[0].totalDoseGy;
  const doseMax = points[points.length - 1].totalDoseGy;
  const doseRange = Math.max(doseMax - doseMin, 1);

  const toX = (d: number) => padding + ((d - doseMin) / doseRange) * (width - 2 * padding);
  const toY = (p: number) => height - padding - p * (height - 2 * padding);

  function pathFor(key: keyof Pick<TherapeuticSweepPoint, "tcp" | "ntcpComposite" | "utcp">): string {
    return points
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${toX(pt.totalDoseGy)} ${toY(pt[key])}`)
      .join(" ");
  }

  const optX = toX(optimalDoseGy);
  const optY = toY(optimalUtcp);

  return (
    <View>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.surface} rx={8} />
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.foreground} strokeWidth={2} />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.foreground} strokeWidth={2} />
        <Path d={pathFor("tcp")} stroke={colors.success} strokeWidth={2.5} fill="none" />
        <Path d={pathFor("ntcpComposite")} stroke={colors.error} strokeWidth={2.5} fill="none" />
        <Path d={pathFor("utcp")} stroke={colors.primary} strokeWidth={2.5} fill="none" />
        <Circle cx={optX} cy={optY} r={7} fill={colors.primary} stroke={colors.background} strokeWidth={2} />
        <SvgText x={optX} y={optY - 12} fontSize={10} fill={colors.primary} textAnchor="middle">
          UTCP max {optimalDoseGy.toFixed(0)} Gy
        </SvgText>
        {currentDoseGy != null && (
          <Line
            x1={toX(currentDoseGy)}
            y1={padding}
            x2={toX(currentDoseGy)}
            y2={height - padding}
            stroke={colors.muted}
            strokeDasharray="4,4"
            strokeWidth={1.5}
          />
        )}
        <SvgText x={width / 2} y={height - 6} fontSize={11} fill={colors.foreground} textAnchor="middle">
          Total dose (Gy)
        </SvgText>
      </Svg>
      <View className="px-2 gap-1 mt-2">
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Optimal dose (max UTCP): {optimalDoseGy.toFixed(1)} Gy · UTCP {(optimalUtcp * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}
