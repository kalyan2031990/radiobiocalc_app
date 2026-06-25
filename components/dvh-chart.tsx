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

export type DvhOverlaySeries = {
  label: string;
  dvhData: DVHPoint[];
  structureType: "target" | "oar";
  geud?: number;
  meanDose?: number;
  color?: string;
};

interface DVHChartProps {
  dvhData: DVHPoint[];
  structureName: string;
  structureType: "target" | "oar";
  maxDose?: number;
  meanDose?: number;
  /** gEUD marker on dose axis (triangle + vertical line). */
  geud?: number;
  /** Optional differential DVH (same dose bins). */
  differentialData?: DVHPoint[];
  /** A/B overlay mode — multiple cumulative curves. */
  overlaySeries?: DvhOverlaySeries[];
  showDifferential?: boolean;
}

export function DVHChart({
  dvhData,
  structureName,
  structureType,
  maxDose = 0,
  meanDose = 0,
  geud,
  differentialData,
  overlaySeries,
  showDifferential = false,
}: DVHChartProps) {
  const colors = useColors();
  const width = Dimensions.get("window").width - 48;
  const height = 300;
  const padding = 40;

  const primarySeries: DvhOverlaySeries[] =
    overlaySeries && overlaySeries.length > 0
      ? overlaySeries
      : [
          {
            label: structureName,
            dvhData,
            structureType,
            geud,
            meanDose,
          },
        ];

  const hasData = primarySeries.some((s) => s.dvhData?.length > 0);
  if (!hasData) {
    return (
      <View
        className="rounded-lg p-4 items-center justify-center"
        style={{ backgroundColor: colors.surface, height }}
      >
        <Text className="text-sm text-muted" style={{ color: colors.muted }}>
          No DVH data available
        </Text>
      </View>
    );
  }

  const overlayColors = [colors.success, colors.primary, colors.warning, colors.error];
  let doseRange = maxDose || 80;
  for (const s of primarySeries) {
    const dm = arrayMax(s.dvhData.map((p) => p.dose), 0);
    if (dm > doseRange) doseRange = dm;
    if (s.geud != null && s.geud > doseRange) doseRange = s.geud;
  }

  function pathFor(points: DVHPoint[]): string {
    return points
      .map((point, i) => {
        const x = padding + (point.dose / doseRange) * (width - 2 * padding);
        const y = height - padding - (point.volume * (height - 2 * padding)) / 100;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  function geudMarkerX(g: number): number {
    return padding + (g / doseRange) * (width - 2 * padding);
  }

  const activeData = primarySeries[0]?.dvhData ?? dvhData;
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

        {/* DVH curve(s) */}
        {primarySeries.map((s, idx) => {
          const c =
            s.color ??
            overlayColors[idx % overlayColors.length] ??
            (s.structureType === "target" ? colors.success : colors.warning);
          return (
            <Path
              key={`curve-${s.label}`}
              d={pathFor(s.dvhData)}
              stroke={c}
              strokeWidth={overlaySeries?.length ? 2.5 : 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {showDifferential && differentialData && differentialData.length > 0 && (
          <Path
            d={pathFor(differentialData)}
            stroke={colors.muted}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="6,4"
          />
        )}

        {/* gEUD markers (triangle on dose axis) */}
        {primarySeries.map((s, idx) => {
          if (s.geud == null || s.geud <= 0) return null;
          const x = geudMarkerX(s.geud);
          const c =
            s.color ??
            overlayColors[idx % overlayColors.length] ??
            colors.primary;
          const triY = height - padding + 2;
          return (
            <G key={`geud-${s.label}`}>
              <Line
                x1={x}
                y1={padding}
                x2={x}
                y2={height - padding}
                stroke={c}
                strokeWidth={1.5}
                strokeDasharray="3,3"
                opacity={0.7}
              />
              <Path
                d={`M ${x} ${triY} L ${x - 5} ${triY + 8} L ${x + 5} ${triY + 8} Z`}
                fill={c}
              />
            </G>
          );
        })}

        {/* Mean dose marker (single-plan legacy) */}
        {!overlaySeries?.length && meanDose > 0 && (
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
          {overlaySeries && overlaySeries.length > 0 ? (
            overlaySeries.map((s, idx) => {
              const c =
                s.color ??
                overlayColors[idx % overlayColors.length] ??
                colors.foreground;
              return (
                <View key={s.label} className="flex-row items-center gap-2">
                  <View className="w-4 h-1 rounded" style={{ backgroundColor: c }} />
                  <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                    {s.label}
                    {s.geud != null ? ` · gEUD ${s.geud.toFixed(1)} Gy` : ""}
                  </Text>
                </View>
              );
            })
          ) : (
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
          )}

          {geud != null && geud > 0 && !overlaySeries?.length && (
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3" style={{ backgroundColor: colors.primary }} />
              <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                gEUD: {geud.toFixed(1)} Gy
              </Text>
            </View>
          )}

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
            <Text className="text-xs text-muted" style={{ color: colors.muted }}>
              V100 (% vol at max):
            </Text>
            <Text
              className="text-xs font-mono text-foreground"
              style={{ color: colors.foreground }}
            >
              {activeData[0]?.volume.toFixed(1) || "0"}%
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
              {(activeData[Math.floor(activeData.length / 2)]?.volume || 0).toFixed(
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
