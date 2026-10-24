import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, ViewStyle, StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Radius, Space, Type } from "@/constants/theme";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Announced as the group's purpose, e.g. "Weight unit". */
  label?: string;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/**
 * iOS-style segmented control on a sunken track.
 * The settings screen previously repeated this markup four times, each with a
 * gradient pill and slightly different padding.
 */
export default function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  style,
}: Props<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const small = size === "sm";

  return (
    <View
      style={[styles.track, small && styles.trackSmall, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.segment,
              small && styles.segmentSmall,
              selected && styles.segmentSelected,
            ]}
            onPress={() => {
              if (selected) return;
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              onChange(option.value);
            }}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.label, small && styles.labelSmall, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.fill,
    borderRadius: Radius.sm,
    padding: 2,
    gap: 2,
  },
  trackSmall: {
    borderRadius: Radius.xs,
  },
  segment: {
    paddingHorizontal: Space.md,
    paddingVertical: 7,
    borderRadius: Radius.xs + 2,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSmall: {
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
    minWidth: 36,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: Layout.hairline,
    borderColor: colors.separator,
  },
  label: {
    ...Type.footnote,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  labelSmall: {
    fontSize: 11,
  },
  labelSelected: {
    color: colors.text,
    fontWeight: "700",
  },
});
