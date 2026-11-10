import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import Meter from "@/components/ui/Meter";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card } from "@/constants/theme";
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
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.98}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}, ${title}. ${totalXP} XP.`}
    >
      <View style={styles.row}>
        <LinearGradient colors={["#4F46E5", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <Text style={styles.badgeLabel}>LVL</Text>
          <Text style={styles.badgeText}>{level}</Text>
        </LinearGradient>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub}>
            {atMax ? "Max level reached" : `${remaining.toLocaleString()} XP to level ${level + 1}`}
          </Text>
        </View>
        <Text style={styles.xp}>{totalXP.toLocaleString()} XP</Text>
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
      </View>
      <Meter value={progress.fraction} />
    </PressableScale>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: { ...card(colors), padding: 18, gap: 14 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    badge: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    badgeLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 1, color: "rgba(255,255,255,0.75)", marginBottom: -2 },
    badgeText: { fontSize: 18, fontWeight: "800", color: "#fff", fontVariant: ["tabular-nums"] },
    info: { flex: 1, gap: 1 },
    title: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    sub: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    xp: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  });
