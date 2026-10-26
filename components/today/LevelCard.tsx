import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { elevation, gradient } from "@/constants/theme";
import { getLevelDefinition, getXPProgress, LEVEL_DEFINITIONS } from "@/utils/gamification";

interface Props {
  totalXP: number;
  level: number;
  onPress?: () => void;
}

export default function LevelCard({ totalXP, level, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = getXPProgress(totalXP);
  const atMax = level >= LEVEL_DEFINITIONS.length;
  const remaining = Math.max(progress.nextLevelXP - totalXP, 0);
  const title = getLevelDefinition(level).title;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}, ${title}`}
    >
      <View style={styles.row}>
        <LinearGradient colors={["#4F46E5", "#818CF8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <Text style={styles.badgeText}>{level}</Text>
        </LinearGradient>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>Level {level} · {title}</Text>
          <Text style={styles.sub}>
            {atMax ? "Max level reached" : `${remaining.toLocaleString()} XP to level ${level + 1}`}
          </Text>
        </View>
        <Text style={styles.xp}>{totalXP.toLocaleString()} XP</Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={gradient("bar", colors)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.round(progress.fraction * 100)}%` }]}
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      padding: 16,
      gap: 12,
      ...elevation(1, colors),
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    badge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    badgeText: { fontSize: 17, fontWeight: "800", color: "#fff", fontVariant: ["tabular-nums"] },
    info: { flex: 1 },
    title: { fontSize: 15, fontWeight: "800", color: colors.text },
    sub: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 1 },
    xp: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.fillStrong, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
  });
