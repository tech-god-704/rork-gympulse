import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { Radius, Space, surface, type ElevationLevel } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  /** 0 flat, 1 resting card (default), 2 raised, 3 floating. */
  level?: ElevationLevel;
  radius?: number;
  /** Inner padding. Pass 0 when the card manages its own sections. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Renders a colored rail down the leading edge. */
  accentColor?: string;
  /**
   * Clip children to the rounded corners. Off by default: on iOS `overflow:
   * hidden` sets `masksToBounds`, which also clips the view's own shadow, so
   * every card would silently lose its elevation. Turn it on only for cards
   * whose children paint all the way to the edge.
   */
  clip?: boolean;
}

/** The app's standard surface. Every card in the app should be one of these. */
export default function Card({
  children,
  level = 1,
  radius = Radius.md,
  padding = Space.base,
  style,
  onPress,
  accessibilityLabel,
  accentColor,
  clip = false,
}: Props) {
  const { colors } = useTheme();

  const base = useMemo<ViewStyle>(
    () => ({
      ...surface(colors, level, radius),
      padding,
      ...(clip ? { overflow: "hidden" as const } : null),
      ...(accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : null),
    }),
    [colors, level, radius, padding, accentColor, clip]
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[base, style]}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
});
