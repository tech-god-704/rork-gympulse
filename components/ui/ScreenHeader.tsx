import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Space, Type } from "@/constants/theme";

interface Props {
  title: string;
  /** Small all-caps eyebrow above the title. */
  eyebrow?: string;
  subtitle?: string;
  /** Trailing control, e.g. an add button. */
  action?: React.ReactNode;
}

/** Consistent large-title header. Every tab used to roll its own. */
export default function ScreenHeader({ title, eyebrow, subtitle, action }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.text}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Space.md,
    paddingHorizontal: Layout.gutter,
    paddingTop: Space.md,
    paddingBottom: Space.base,
  },
  text: {
    flex: 1,
  },
  eyebrow: {
    ...Type.overline,
    color: colors.textTertiary,
    marginBottom: 3,
  },
  title: {
    ...Type.title1,
    color: colors.text,
  },
  subtitle: {
    ...Type.subhead,
    color: colors.textTertiary,
    marginTop: 3,
  },
  action: {
    paddingBottom: 2,
  },
});
