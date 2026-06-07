/**
 * DVH Chart Component
 * 
 * Displays cumulative dose-volume histogram
 */

import { View, Text, Dimensions } from "react-native";
import Svg, {
  Line,
  Circle,
  Path,
  Text as SvgText,
  G,
  Rect,
} from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import { arrayMax } from "@/lib/numeric-safe";

export interface DVHPoint {
  dose: number; // Gy
  volume: number; // % volume
}

interface DVHChartProps {
  dvhData: DVHPoint[];
  structureName: string;
  structureType: "target" | "oar";
  maxDose?: number;
  meanDose?: number;
}

export function DVHChart({
  dvhData,
  structureName,
  structureType,
  maxDose = 0,
  meanDose = 0,
}: DVHChartProps) {
  const colors = useColors();
  const width = Dimensions.get("window").width - 48;
  const height = 300;
  const padding = 40;

  if (!dvhData || dvhData.length === 0) {
    return (
      <View
        className="rounded-lg p-4 items-center justify-center"
        style={{ backgroundColor: colors.surface, height }}
      >
        <Text
          className="text-sm text-muted"
          style={{ color: colors.muted }}
        >
          No DVH data available
        </Text>
      </View>
    );
  }

  // Find max dose from data
  const dataMaxDose = arrayMax(dvhData.map((p) => p.dose), 80);
  const doseRange = Math.max(dataMaxDose, maxDose || 80);

  // Generate SVG path for DVH curve
  const pathData = dvhData
    .map((point, i) => {
      const x = padding + (point.dose / doseRange) * (width - 2 * padding);
      const y = height - padding - point.volume * (height - 2 * padding) / 100;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Color based on structure type
  const strokeColor =
    structureType === "target" ? colors.success : colors.warning;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={colors.surface}
          rx={8}
        />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => (
          <G key={`grid-h-${i}`}>
            {/* Horizontal grid */}
            <Line
              x1={padding}
              y1={height - padding - val * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - val * (height - 2 * padding)}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            {/* Volume labels */}
            <SvgText
              x={padding - 5}
              y={height - padding - val * (height - 2 * padding) + 4}
              fontSize={10}
              fill={colors.muted}
              textAnchor="end"
            >
              {(val * 100).toFixed(0)}%
            </SvgText>
          </G>
        ))}

        {/* Vertical grid and dose labels */}
        {Array.from({ length: 5 }, (_, i) => i * 0.25).map((val, i) => (
          <G key={`grid-v-${i}`}>
            <Line
              x1={padding + val * (width - 2 * padding)}
              y1={padding}
              x2={padding + val * (width - 2 * padding)}
              y2={height - padding}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding + val * (width - 2 * padding)}
              y={height - padding + 20}
              fontSize={10}
              fill={colors.muted}
              textAnchor="middle"
            >
              {(val * doseRange).toFixed(0)}
            </SvgText>
          </G>
        ))}

        {/* Axes */}
        <Line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke={colors.foreground}
          strokeWidth={2}
        />
        <Line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke={colors.foreground}
          strokeWidth={2}
        />

        {/* DVH curve */}
        <Path
          d={pathData}
          stroke={strokeColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Mean dose marker */}
        {meanDose > 0 && (
          <G>
            <Line
              x1={padding + (meanDose / doseRange) * (width - 2 * padding)}
              y1={padding}
              x2={padding + (meanDose / doseRange) * (width - 2 * padding)}
              y2={height - padding}
              stroke={colors.primary}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            <Circle
              cx={padding + (meanDose / doseRange) * (width - 2 * padding)}
              cy={height - padding}
              r={4}
              fill={colors.primary}
            />
          </G>
        )}

        {/* Axis labels */}
        <SvgText
          x={width / 2}
          y={height - 5}
          fontSize={12}
          fill={colors.foreground}
          fontWeight="bold"
          textAnchor="middle"
        >
          Dose (Gy)
        </SvgText>

        <SvgText
          x={15}
          y={height / 2}
          fontSize={12}
          fill={colors.foreground}
          fontWeight="bold"
          textAnchor="middle"
          transform={`rotate(-90 15 ${height / 2})`}
        >
          Volume (%)
        </SvgText>
      </Svg>

      {/* Legend and Statistics */}
      <View className="mt-4 px-4 gap-3">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-1 rounded"
              style={{ backgroundColor: strokeColor }}
            />
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              {structureName}
            </Text>
            <View
              className="px-2 py-1 rounded ml-auto"
              style={{
                backgroundColor:
                  structureType === "target"
                    ? colors.success + "30"
                    : colors.warning + "30",
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  color:
                    structureType === "target"
                      ? colors.success
                      : colors.warning,
                }}
              >
                {structureType === "target" ? "Target" : "OAR"}
              </Text>
            </View>
          </View>

          {meanDose > 0 && (
            <View className="flex-row items-center gap-2">
              <View
                className="w-4 h-1 rounded"
                style={{ backgroundColor: colors.primary }}
              />
              <Text
                className="text-sm text-muted"
                style={{ color: colors.muted }}
              >
                Mean Dose: {meanDose.toFixed(1)} Gy
              </Text>
            </View>
          )}
        </View>

        {/* Key DVH Points */}
        <View
          className="rounded p-3 gap-2"
          style={{ backgroundColor: colors.background }}
        >
          <Text
            className="text-xs font-semibold text-muted"
            style={{ color: colors.muted }}
          >
            Key DVH Points:
          </Text>
          <View className="flex-row justify-between">
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              Max Dose:
            </Text>
            <Text
              className="text-xs font-mono text-foreground"
              style={{ color: colors.foreground }}
            >
              {maxDose.toFixed(1)} Gy
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              V100 (% vol at max):
            </Text>
            <Text
              className="text-xs font-mono text-foreground"
              style={{ color: colors.foreground }}
            >
              {dvhData[0]?.volume.toFixed(1) || "0"}%
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              V50 (% vol at 50% dose):
            </Text>
            <Text
              className="text-xs font-mono text-foreground"
              style={{ color: colors.foreground }}
            >
              {(dvhData[Math.floor(dvhData.length / 2)]?.volume || 0).toFixed(
                1
              )}
              %
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
