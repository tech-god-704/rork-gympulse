import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { Radius, tint } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  /** Accent color; the well is a soft tint of it. */
  color?: string;
  size?: number;
  /** Solid fill instead of a tint — for emphasis. */
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A rounded well holding an icon. Used for stat tiles, list rows and headers. */
export default function IconBadge({ children, color, size = 40, solid = false, style }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size <= 28 ? Radius.xs : Radius.sm,
          backgroundColor: solid ? accent : tint(accent, colors.scheme === "dark" ? 0.22 : 0.12),
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
