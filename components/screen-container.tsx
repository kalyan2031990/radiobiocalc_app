import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { RbgyanxBackground } from "@/components/rbgyanx-background";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /** Show rbGyanX branded watermark background (default true). */
  brandBackground?: boolean;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  brandBackground = true,
  style,
  ...props
}: ScreenContainerProps) {
  const inner = (
    <SafeAreaView
      edges={edges}
      className={cn("flex-1", safeAreaClassName)}
      style={style}
    >
      <View className={cn("flex-1", className)}>{children}</View>
    </SafeAreaView>
  );

  if (brandBackground) {
    return (
      <RbgyanxBackground className={cn("flex-1", containerClassName)} {...props}>
        {inner}
      </RbgyanxBackground>
    );
  }

  return (
    <View
      className={cn("flex-1", "bg-background", containerClassName)}
      {...props}
    >
      {inner}
    </View>
  );
}
