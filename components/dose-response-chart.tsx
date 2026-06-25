/**
 * Dose-Response Chart — LKB log-logistic / probit / Poisson using calculation parameters.
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

interface DoseResponseChartProps {
  probability: number;
  dose: number;
  td50: number;
  gamma50: number;
  m?: number;
  model: "lkb_loglogit" | "lkb_probit" | "poisson";
  isTCP: boolean;
  doseMax?: number;
  ciBand?: Array<{ dose: number; low: number; high: number }>;
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function probAtDose(
  d: number,
  td50: number,
  gamma50: number,
  model: DoseResponseChartProps["model"],
): number {
  if (d <= 0) return 0;
  if (model === "lkb_loglogit") {
    const ratio = d / Math.max(td50, 0.1);
    return 1 / (1 + Math.pow(ratio, -4 * Math.max(gamma50, 0.01)));
  }
  if (model === "lkb_probit") {
    const m = 0.18;
    const t = (d - td50) / (m * Math.max(td50, 0.1));
    return 0.5 * (1 + erf(t / Math.sqrt(2)));
  }
  const lambda = Math.exp(-Math.exp(-(d - td50) / Math.max(5 / gamma50, 0.5)));
  return 1 - lambda;
}

export function DoseResponseChart({
  probability,
  dose,
  td50,
  gamma50,
  m = 0.18,
  model,
  isTCP,
  doseMax = 80,
  ciBand,
}: DoseResponseChartProps) {
  const colors = useColors();
  const width = Dimensions.get("window").width - 48;
  const height = 300;
  const padding = 40;
  const range = Math.max(doseMax, td50 * 1.5, 40);

  const curvePoints: { x: number; y: number }[] = [];
  for (let d = 0; d <= range; d += range / 40) {
    const prob = Math.min(1, Math.max(0, probAtDose(d, td50, gamma50, model)));
    const x = padding + (d / range) * (width - 2 * padding);
    const y = height - padding - prob * (height - 2 * padding);
    curvePoints.push({ x, y });
  }

  const pathData = curvePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const currentX = padding + (Math.min(dose, range) / range) * (width - 2 * padding);
  const currentY = height - padding - probability * (height - 2 * padding);

  const tickDoses = [0, range * 0.25, range * 0.5, range * 0.75, range].map((v) =>
    Math.round(v),
  );

  return (
    <View>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.surface} rx={8} />
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => (
          <G key={`grid-h-${i}`}>
            <Line
              x1={padding}
              y1={height - padding - val * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - val * (height - 2 * padding)}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
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
        {tickDoses.map((d, i) => (
          <G key={`grid-v-${i}`}>
            <SvgText
              x={padding + (d / range) * (width - 2 * padding)}
              y={height - padding + 20}
              fontSize={10}
              fill={colors.muted}
              textAnchor="middle"
            >
              {d}
            </SvgText>
          </G>
        ))}
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.foreground} strokeWidth={2} />
        <Line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke={colors.foreground}
          strokeWidth={2}
        />
        <Path
          d={pathData}
          stroke={isTCP ? colors.success : colors.error}
          strokeWidth={3}
          fill="none"
        />
        {ciBand && ciBand.length > 1 && (
          <Path
            d={
              ciBand
                .map((p, i) => {
                  const x = padding + (p.dose / range) * (width - 2 * padding);
                  const y = height - padding - p.high * (height - 2 * padding);
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") +
              " " +
              [...ciBand]
                .reverse()
                .map((p) => {
                  const x = padding + (p.dose / range) * (width - 2 * padding);
                  const y = height - padding - p.low * (height - 2 * padding);
                  return `L ${x} ${y}`;
                })
                .join(" ") +
              " Z"
            }
            fill={colors.error + "30"}
            stroke="none"
          />
        )}
        <Circle
          cx={currentX}
          cy={currentY}
          r={6}
          fill={isTCP ? colors.success : colors.error}
          stroke={colors.background}
          strokeWidth={2}
        />
        <SvgText x={width / 2} y={height - 5} fontSize={12} fill={colors.foreground} textAnchor="middle">
          Dose (Gy)
        </SvgText>
        <SvgText
          x={12}
          y={height / 2}
          fontSize={12}
          fill={colors.foreground}
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
        >
          {isTCP ? "TCP" : "NTCP"}
        </SvgText>
      </Svg>
      <View className="mt-4 px-4 gap-1">
        <Text style={{ color: colors.foreground }}>
          {isTCP ? "TCP" : "NTCP"} ({model}) · TD50 {td50.toFixed(1)} Gy
        </Text>
        <Text style={{ color: colors.muted }}>
          Plan: {dose.toFixed(1)} Gy → {(probability * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}
