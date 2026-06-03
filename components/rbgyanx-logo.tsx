/**
 * rbGyanX wordmark + app icon — high contrast on branded background.
 */

import { Image, Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

const appIcon = require("@/assets/images/icon.png");
const heroImage = require("@/assets/images/rbgyanx-mobile-hero.png");

type Props = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
};

export function RbgyanxLogo({ size = "md", showTagline = true }: Props) {
  const colors = useColors();
  const iconSize = size === "lg" ? 88 : size === "md" ? 72 : 56;
  const titleSize = size === "lg" ? 36 : size === "md" ? 30 : 24;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <Image
          source={heroImage}
          style={{ width: iconSize * 1.4, height: iconSize * 0.55 }}
          resizeMode="contain"
          accessibilityLabel="rbGyanX logo"
        />
        <Image
          source={appIcon}
          style={[styles.icon, { width: iconSize * 0.45, height: iconSize * 0.45 }]}
          resizeMode="contain"
          accessibilityLabel="rbGyanX app icon"
        />
        <Text
          style={[
            styles.title,
            {
              fontSize: titleSize,
              color: colors.foreground,
            },
          ]}
        >
          <Text style={{ color: "#E67E22" }}>r</Text>
          <Text style={{ color: "#E67E22" }}>b</Text>
          <Text style={{ color: colors.primary }}>G</Text>
          <Text style={{ color: colors.primary }}>y</Text>
          <Text style={{ color: "#27AE60" }}>a</Text>
          <Text style={{ color: "#27AE60" }}>n</Text>
          <Text style={{ color: "#27AE60" }}>X</Text>
        </Text>
        {showTagline ? (
          <Text style={[styles.tagline, { color: colors.muted }]}>genius evolved</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: "100%",
  },
  card: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: 340,
    width: "92%",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    position: "absolute",
    top: 10,
    right: 14,
    opacity: 0.95,
  },
  title: {
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    fontStyle: "italic",
  },
});
