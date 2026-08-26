import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Space, Type } from "@/constants/theme";

interface Props {
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  /** Leading icon or badge. */
  leading?: React.ReactNode;
  /** Trailing control — a Segmented, a value, a switch. */
  trailing?: React.ReactNode;
  /** Right-facing chevron. Implied when `onPress` is set and no trailing given. */
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
}

/** A settings / menu row. Keeps every list in the app on the same rhythm. */
export default function ListRow({
  label,
  hint,
  leading,
  trailing,
  chevron,
  onPress,
  destructive = false,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showChevron = chevron ?? (Boolean(onPress) && !trailing);

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text style={[styles.label, destructive && { color: colors.error }]} numberOfLines={1}>
          {label}
        </Text>
        {hint ? <Text style={styles.hint} numberOfLines={2}>{hint}</Text> : null}
      </View>
      {trailing}
      {showChevron ? <ChevronRight size={16} color={colors.textTertiary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

export function RowDivider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: Layout.hairline,
        backgroundColor: colors.separator,
        marginLeft: Space.base,
      }}
    />
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    minHeight: Layout.rowHeight,
  },
  leading: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    flex: 1,
  },
  label: {
    ...Type.callout,
    color: colors.text,
  },
  hint: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 2,
  },
});
