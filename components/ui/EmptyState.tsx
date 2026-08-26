import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Radius, Space, Type, tint } from "@/constants/theme";

interface Props {
  icon: React.ReactNode;
  title: string;
  body?: string;
  /** Primary call to action. */
  action?: React.ReactNode;
  /** Secondary action rendered beneath. */
  secondaryAction?: React.ReactNode;
  /** Muted line at the very bottom. */
  footnote?: string;
  color?: string;
  compact?: boolean;
}

/** Consistent, encouraging empty state instead of a bare "nothing here". */
export default function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  footnote,
  color,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = color ?? colors.primary;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View
        style={[
          styles.iconWell,
          { backgroundColor: tint(accent, colors.scheme === "dark" ? 0.18 : 0.1) },
        ]}
      >
        {icon}
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
      {secondaryAction ? <View style={styles.secondary}>{secondaryAction}</View> : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Space.xxl + Space.base,
    paddingHorizontal: Space.xl,
  },
  compact: {
    paddingVertical: Space.xl,
  },
  iconWell: {
    width: 68,
    height: 68,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  title: {
    ...Type.title3,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: Space.sm,
  },
  body: {
    ...Type.body,
    color: colors.textTertiary,
    textAlign: "center",
    maxWidth: 320,
  },
  action: {
    marginTop: Space.xl,
    alignSelf: "stretch",
    alignItems: "center",
  },
  secondary: {
    marginTop: Space.md,
    alignSelf: "stretch",
    alignItems: "center",
  },
  footnote: {
    ...Type.caption,
    color: colors.textTertiary,
    marginTop: Space.lg,
    textAlign: "center",
  },
});
