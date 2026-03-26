import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { AchievementDefinition, AchievementTier } from "@/types";
import { ColorScheme } from "@/constants/colors";
import { Lock } from "lucide-react-native";

interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  compact?: boolean;
}

function getTierColor(tier: AchievementTier, colors: ColorScheme): string {
  switch (tier) {
    case "bronze": return colors.tierBronze;
    case "silver": return colors.tierSilver;
    case "gold": return colors.tierGold;
    case "diamond": return colors.tierDiamond;
  }
}

export default function AchievementBadge({ achievement, unlocked, compact = false }: AchievementBadgeProps) {
  const { colors } = useTheme();
  const tierColor = getTierColor(achievement.tier, colors);
  const styles = React.useMemo(() => createStyles(colors, tierColor, unlocked, compact), [colors, tierColor, unlocked, compact]);

  return (
    <View style={styles.container}>
      <View style={styles.emojiContainer}>
        {unlocked ? (
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        ) : (
          <Lock size={compact ? 16 : 20} color={colors.textTertiary} />
        )}
      </View>
      {!compact && (
        <Text style={styles.name} numberOfLines={1}>
          {unlocked ? achievement.name : "???"}
        </Text>
      )}
      {!compact && unlocked && (
        <Text style={styles.description} numberOfLines={2}>
          {achievement.description}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme, tierColor: string, unlocked: boolean, compact: boolean) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      padding: compact ? 6 : 10,
      borderRadius: 12,
      backgroundColor: unlocked ? colors.cardBackground : colors.surface,
      borderWidth: 2,
      borderColor: unlocked ? tierColor : colors.cardBorder,
      opacity: unlocked ? 1 : 0.5,
      gap: compact ? 2 : 4,
      minWidth: compact ? 48 : undefined,
    },
    emojiContainer: {
      width: compact ? 28 : 40,
      height: compact ? 28 : 40,
      borderRadius: compact ? 14 : 20,
      backgroundColor: unlocked ? `${tierColor}20` : colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: {
      fontSize: compact ? 16 : 22,
    },
    name: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    description: {
      fontSize: 10,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 13,
    },
  });
}
