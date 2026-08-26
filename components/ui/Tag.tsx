import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { Radius, Space, Type, tint } from "@/constants/theme";

interface Props {
  label: string;
  color?: string;
  /** Filled reads louder than the default soft tint. */
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/** Small labelled pill — muscle groups, PR flags, plan badges. */
export default function Tag({ label, color, variant = "soft", size = "md", style }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const small = size === "sm";

  const container: ViewStyle = {
    paddingHorizontal: small ? Space.sm : Space.md - 2,
    paddingVertical: small ? 2 : 4,
    borderRadius: Radius.xs,
    backgroundColor:
      variant === "solid"
        ? accent
        : variant === "outline"
          ? "transparent"
          : tint(accent, colors.scheme === "dark" ? 0.24 : 0.13),
    borderWidth: variant === "outline" ? 1 : 0,
    borderColor: tint(accent, 0.4),
  };

  return (
    <View style={[container, style]}>
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: variant === "solid" ? "#fff" : accent },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...Type.caption,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  labelSmall: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
