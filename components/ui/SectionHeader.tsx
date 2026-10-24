import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Space, Type } from "@/constants/theme";

interface Props {
  title: string;
  icon?: React.ReactNode;
  /** Muted note on the trailing edge, e.g. "by sets completed". */
  note?: string;
  /** Interactive trailing element; replaces `note` when both are given. */
  action?: React.ReactNode;
  onPress?: () => void;
  expanded?: boolean;
  style?: object;
}

/** Header row for a section inside a card or a list. */
export default function SectionHeader({ title, icon, note, action, onPress, expanded, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <>
      <View style={styles.left}>
        {icon}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {action ?? (note ? <Text style={styles.note}>{note}</Text> : null)}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={expanded === undefined ? undefined : { expanded }}
        accessibilityLabel={title}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    minHeight: 28,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    flex: 1,
  },
  title: {
    ...Type.headline,
    color: colors.text,
    flexShrink: 1,
  },
  note: {
    ...Type.caption,
    color: colors.textTertiary,
    fontWeight: "600",
  },
});
