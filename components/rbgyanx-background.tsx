/**
 * Branded backdrop — rbGyanX mobile theme (tuned for readable foreground).
 */

import { Image, View, StyleSheet, type ViewProps } from "react-native";
import { useThemeContext } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

const backgroundImage = require("@/assets/images/rbgyanx-mobile-background.png");

type Props = ViewProps & {
  children: React.ReactNode;
};

export function RbgyanxBackground({
  children,
  style,
  className,
  ...rest
}: Props & { className?: string }) {
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";

  return (
    <View className={cn("flex-1", className)} style={[styles.root, style]} {...rest}>
      <Image
        source={backgroundImage}
        style={styles.image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View
        style={[
          styles.scrim,
          isDark ? styles.scrimDark : styles.scrimLight,
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.52,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimLight: {
    backgroundColor: "rgba(232, 238, 244, 0.68)",
  },
  scrimDark: {
    backgroundColor: "rgba(26, 35, 50, 0.72)",
  },
  content: {
    flex: 1,
  },
});
