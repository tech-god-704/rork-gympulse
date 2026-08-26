import React, { useMemo } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Platform,
  ViewStyle,
  StyleProp,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Radius, Space, Type, glow, tint } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** Rendered before the label. */
  icon?: React.ReactNode;
  /** Rendered after the label. */
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Overrides the accent for primary/ghost variants. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Haptic weight on press. Set to "none" for low-stakes actions. */
  haptic?: "light" | "medium" | "none";
}

const HEIGHTS: Record<Size, number> = { sm: 38, md: Layout.touchTarget, lg: 54 };

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  disabled = false,
  loading = false,
  fullWidth = false,
  color,
  style,
  accessibilityLabel,
  haptic = "light",
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = color ?? (variant === "danger" ? colors.error : colors.primary);
  const isDisabled = disabled || loading;

  const containerStyle = useMemo<ViewStyle>(() => {
    const base: ViewStyle = {
      minHeight: HEIGHTS[size],
      paddingHorizontal: size === "sm" ? Space.base : Space.xl,
      borderRadius: size === "sm" ? Radius.sm : Radius.md,
    };
    switch (variant) {
      case "primary":
        return { ...base, backgroundColor: accent, ...glow(accent, colors) };
      case "danger":
        return {
          ...base,
          backgroundColor: colors.errorLight,
          borderWidth: 1.5,
          borderColor: colors.errorBorder,
        };
      case "secondary":
        return {
          ...base,
          backgroundColor: colors.fill,
          borderWidth: Layout.hairline,
          borderColor: colors.separator,
        };
      case "ghost":
        return { ...base, backgroundColor: tint(accent, 0.1) };
    }
  }, [variant, size, accent, colors]);

  const textColor =
    variant === "primary" ? "#fff" : variant === "danger" ? colors.error : variant === "ghost" ? accent : colors.text;

  const handlePress = () => {
    if (isDisabled) return;
    if (Platform.OS !== "web" && haptic !== "none") {
      void Haptics.impactAsync(
        haptic === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        containerStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.82}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              size === "sm" ? styles.labelSmall : styles.label,
              { color: textColor },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...Type.headline,
    color: colors.text,
  },
  labelSmall: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.text,
  },
  icon: {
    justifyContent: "center",
    alignItems: "center",
  },
});
