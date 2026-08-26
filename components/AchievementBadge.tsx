import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Lock } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { AchievementDefinition, AchievementTier } from "@/types";
import { ColorScheme } from "@/constants/colors";
import { Layout, Radius, Space, Type, tint } from "@/constants/theme";

interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  compact?: boolean;
}

function tierColor(tier: AchievementTier, colors: ColorScheme): string {
  switch (tier) {
    case "bronze": return colors.tierBronze;
    case "silver": return colors.tierSilver;
    case "gold": return colors.tierGold;
    case "diamond": return colors.tierDiamond;
  }
}

export default function AchievementBadge({ achievement, unlocked, compact = false }: AchievementBadgeProps) {
  const { colors } = useTheme();
  const accent = tierColor(achievement.tier, colors);
  const styles = useMemo(
    () => createStyles(colors, accent, unlocked, compact),
    [colors, accent, unlocked, compact]
  );

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={
        unlocked
          ? `${achievement.name}, ${achievement.tier} achievement unlocked. ${achievement.description}`
          : `Locked achievement: ${achievement.description}`
      }
    >
      <View style={styles.medallion}>
        {unlocked ? (
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        ) : (
          <Lock size={compact ? 14 : 17} color={colors.textTertiary} />
        )}
      </View>
      {!compact && (
        <Text style={styles.name} numberOfLines={2}>
          {/* Locked names stay hidden, but the goal is always readable so the
              grid reads as a checklist rather than a wall of question marks. */}
          {unlocked ? achievement.name : achievement.description}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme, accent: string, unlocked: boolean, compact: boolean) {
  const size = compact ? 34 : 44;
  return StyleSheet.create({
    container: {
      alignItems: "center",
      paddingVertical: compact ? Space.xs : Space.sm,
      paddingHorizontal: Space.xs,
      borderRadius: Radius.sm,
      backgroundColor: unlocked ? tint(accent, colors.scheme === "dark" ? 0.16 : 0.1) : colors.fill,
      borderWidth: unlocked ? 1 : Layout.hairline,
      borderColor: unlocked ? tint(accent, 0.45) : colors.separator,
      gap: compact ? 2 : Space.xs + 2,
      minHeight: compact ? undefined : 92,
    },
    medallion: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: unlocked ? tint(accent, 0.24) : colors.fillStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: {
      fontSize: compact ? 17 : 21,
    },
    name: {
      ...Type.caption,
      lineHeight: 13,
      fontWeight: unlocked ? "800" : "500",
      color: unlocked ? colors.text : colors.textTertiary,
      textAlign: "center",
    },
  });
}
