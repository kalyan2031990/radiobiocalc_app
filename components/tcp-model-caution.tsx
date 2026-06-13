/**
 * Clinician caution — literature TCP model limits (mobile beta).
 */
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { TCP_CAPPED_FOOTNOTE, TCP_MODEL_CAUTION } from "@/lib/tcp-display";

type Props = {
  showCapFootnote?: boolean;
  compact?: boolean;
};

export function TcpModelCaution({ showCapFootnote = false, compact = false }: Props) {
  const colors = useColors();

  return (
    <View
      className="rounded-lg p-3 gap-2 flex-row"
      style={{
        backgroundColor: colors.warning + "18",
        borderWidth: 1,
        borderColor: colors.warning + "44",
      }}
    >
      <MaterialIcons name="info-outline" size={20} color={colors.warning} style={{ marginTop: 2 }} />
      <View className="flex-1 gap-1">
        <Text
          className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}
          style={{ color: colors.foreground }}
        >
          {TCP_MODEL_CAUTION}
        </Text>
        {showCapFootnote ? (
          <Text className="text-xs leading-relaxed" style={{ color: colors.muted }}>
            {TCP_CAPPED_FOOTNOTE}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
