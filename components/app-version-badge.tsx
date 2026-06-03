import { Text, type TextProps } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getVersionLine } from "@/lib/app-meta";

type Props = TextProps & { centered?: boolean };

export function AppVersionBadge({ centered, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontSize: 12,
          color: colors.muted,
          textAlign: centered ? "center" : "left",
        },
        style,
      ]}
      {...rest}
    >
      {getVersionLine()}
    </Text>
  );
}
