/**
 * Therapeutic Window Chart Component
 * 
 * Displays TCP vs NTCP scatter plot showing therapeutic window
 */

import { View, Text, Dimensions } from "react-native";
import Svg, {
  Line,
  Circle,
  Rect,
  Text as SvgText,
  G,
  Path,
  Polygon,
} from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface TherapeuticWindowChartProps {
  tcp: number;
  ntcp: number;
  dose: number;
}

export function TherapeuticWindowChart({
  tcp,
  ntcp,
  dose,
}: TherapeuticWindowChartProps) {
  const colors = useColors();
  const width = Dimensions.get("window").width - 48;
  const height = 300;
  const padding = 40;

  // Calculate positions (0-1 scale)
  const tcpX = padding + tcp * (width - 2 * padding);
  const ntcpY = height - padding - ntcp * (height - 2 * padding);

  // Define therapeutic window zones
  const optimalZone = {
    tcp: 0.85,
    ntcp: 0.1,
  };

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

        {/* Therapeutic Window Zones */}
        {/* Good zone (High TCP, Low NTCP) */}
        <Rect
          x={padding + 0.7 * (width - 2 * padding)}
          y={padding}
          width={0.3 * (width - 2 * padding)}
          height={0.3 * (height - 2 * padding)}
          fill={colors.success}
          opacity={0.1}
        />

        {/* Moderate zone (High TCP, Moderate NTCP) */}
        <Rect
          x={padding + 0.7 * (width - 2 * padding)}
          y={padding + 0.3 * (height - 2 * padding)}
          width={0.3 * (width - 2 * padding)}
          height={0.3 * (height - 2 * padding)}
          fill={colors.warning}
          opacity={0.1}
        />

        {/* Poor zone (Low TCP, High NTCP) */}
        <Rect
          x={padding}
          y={padding + 0.7 * (height - 2 * padding)}
          width={0.7 * (width - 2 * padding)}
          height={0.3 * (height - 2 * padding)}
          fill={colors.error}
          opacity={0.1}
        />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => (
          <G key={`grid-${i}`}>
            {/* Vertical grid */}
            <Line
              x1={padding + val * (width - 2 * padding)}
              y1={padding}
              x2={padding + val * (width - 2 * padding)}
              y2={height - padding}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            {/* Horizontal grid */}
            <Line
              x1={padding}
              y1={padding + val * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + val * (height - 2 * padding)}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />

            {/* X-axis labels (TCP) */}
            <SvgText
              x={padding + val * (width - 2 * padding)}
              y={height - padding + 20}
              fontSize={10}
              fill={colors.muted}
              textAnchor="middle"
            >
              {(val * 100).toFixed(0)}%
            </SvgText>

            {/* Y-axis labels (NTCP) */}
            <SvgText
              x={padding - 10}
              y={height - padding - val * (height - 2 * padding) + 4}
              fontSize={10}
              fill={colors.muted}
              textAnchor="end"
            >
              {(val * 100).toFixed(0)}%
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

        {/* Optimal point marker */}
        <Circle
          cx={padding + optimalZone.tcp * (width - 2 * padding)}
          cy={height - padding - optimalZone.ntcp * (height - 2 * padding)}
          r={5}
          fill={colors.success}
          opacity={0.5}
        />

        {/* Current point marker */}
        <Circle
          cx={tcpX}
          cy={ntcpY}
          r={8}
          fill={colors.primary}
          stroke={colors.background}
          strokeWidth={2}
        />

        {/* Connection line from current to optimal */}
        <Line
          x1={tcpX}
          y1={ntcpY}
          x2={padding + optimalZone.tcp * (width - 2 * padding)}
          y2={height - padding - optimalZone.ntcp * (height - 2 * padding)}
          stroke={colors.primary}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Axis labels */}
        <SvgText
          x={width / 2}
          y={height - 5}
          fontSize={12}
          fill={colors.foreground}
          fontWeight="bold"
          textAnchor="middle"
        >
          TCP (%)
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
          NTCP (%)
        </SvgText>
      </Svg>

      {/* Legend and Info */}
      <View className="mt-4 px-4 gap-3">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.success }}
            />
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              Optimal Zone (High TCP, Low NTCP)
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.warning }}
            />
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              Acceptable Zone (High TCP, Moderate NTCP)
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.error }}
            />
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              Poor Zone (Low TCP, High NTCP)
            </Text>
          </View>
        </View>

        <View
          className="rounded-lg p-3"
          style={{ backgroundColor: colors.background }}
        >
          <View className="flex-row justify-between mb-2">
            <Text
              className="text-sm font-semibold text-foreground"
              style={{ color: colors.foreground }}
            >
              Current Plan
            </Text>
            <Text
              className="text-sm font-semibold text-primary"
              style={{ color: colors.primary }}
            >
              {dose.toFixed(1)} Gy
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text
              className="text-xs text-muted"
              style={{ color: colors.muted }}
            >
              TCP: {(tcp * 100).toFixed(1)}% | NTCP: {(ntcp * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
