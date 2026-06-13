import { Text, type TextProps } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getUserVersionLine, getVersionLine } from "@/lib/app-meta";
import { isClinicianMobileApk } from "@/lib/clinician-build";

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
      {isClinicianMobileApk() ? getUserVersionLine() : getVersionLine()}
    </Text>
  );
}
