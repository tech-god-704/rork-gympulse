import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Space, Type, statNumber } from "@/constants/theme";
import IconBadge from "./IconBadge";

interface Props {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  /** "row" puts the icon beside the number; "stack" centers it above. */
  layout?: "row" | "stack";
  size?: "sm" | "md" | "lg";
  /** Small trailing note next to the value, e.g. a streak multiplier. */
  accessory?: string;
  style?: StyleProp<ViewStyle>;
}

const VALUE_SIZE = { sm: 17, md: 22, lg: 28 } as const;

/** A single number with its label. Used across Today, Progress and Profile. */
export default function StatTile({
  value,
  label,
  icon,
  color,
  layout = "row",
  size = "md",
  accessory,
  style,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = color ?? colors.primary;

  const body = (
    <>
      <Text style={[styles.value, statNumber(VALUE_SIZE[size])]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {accessory ? <Text style={[styles.accessory, { color: accent }]}> {accessory}</Text> : null}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  if (layout === "stack") {
    return (
      <View
        style={[styles.stack, style]}
        accessible
        accessibilityLabel={`${label}: ${value}${accessory ? ` ${accessory}` : ""}`}
      >
        {icon ? (
          <IconBadge color={accent} size={38} style={styles.stackIcon}>
            {icon}
          </IconBadge>
        ) : null}
        {body}
      </View>
    );
  }

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`${label}: ${value}${accessory ? ` ${accessory}` : ""}`}
    >
      {icon ? <IconBadge color={accent} size={42}>{icon}</IconBadge> : null}
      <View style={styles.rowText}>{body}</View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  rowText: {
    flex: 1,
  },
  stack: {
    alignItems: "center",
    flex: 1,
  },
  stackIcon: {
    marginBottom: Space.sm,
  },
  value: {
    color: colors.text,
  },
  accessory: {
    ...Type.caption,
    fontWeight: "800",
  },
  label: {
    ...Type.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
