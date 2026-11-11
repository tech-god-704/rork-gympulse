import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { haptic } from "@/utils/haptics";

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

/** Segmented control on a sunken track; the selected segment is a raised pill. */
export default function Segmented<T extends string | number>({ options, value, onChange, label, size = "md", style }: Props<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const small = size === "sm";

  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={[styles.segment, small ? styles.segmentSmall : styles.segmentFill, selected && styles.segmentSelected]}
            onPress={() => {
              if (selected) return;
              haptic.select();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    track: { flexDirection: "row", backgroundColor: colors.fill, borderRadius: 14, padding: 3, gap: 2 },
    segment: { height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    segmentFill: { flex: 1, paddingHorizontal: 8 },
    segmentSmall: { minWidth: 52, paddingHorizontal: 12, height: 34 },
    segmentSelected:
      colors.scheme === "dark"
        ? { backgroundColor: "#2C2F37" }
        : { backgroundColor: "#fff", shadowColor: "#101828", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
    label: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    labelSelected: { color: colors.text, fontWeight: "800" },
  });
