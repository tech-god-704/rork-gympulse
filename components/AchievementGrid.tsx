import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { UnlockedAchievement } from "@/types";
import { ACHIEVEMENT_DEFINITIONS } from "@/utils/gamification";
import AchievementBadge from "./AchievementBadge";
import { ColorScheme } from "@/constants/colors";

interface AchievementGridProps {
  unlockedAchievements: UnlockedAchievement[];
}

const CATEGORY_LABELS: Record<string, string> = {
  consistency: "Consistency",
  strength: "Strength",
  volume: "Volume",
  variety: "Variety",
  endurance: "Endurance",
};

export default function AchievementGrid({ unlockedAchievements }: AchievementGridProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const unlockedSet = new Set(unlockedAchievements.map((a) => a.id));

  const categories = ["consistency", "strength", "volume", "variety", "endurance"] as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.count}>
          {unlockedAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length}
        </Text>
      </View>

      {categories.map((category) => {
        const achievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
        return (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryLabel}>{CATEGORY_LABELS[category]}</Text>
            <View style={styles.grid}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={styles.gridItem}>
                  <AchievementBadge
                    achievement={achievement}
                    unlocked={unlockedSet.has(achievement.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    count: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.xpText,
    },
    categorySection: {
      gap: 8,
    },
    categoryLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    gridItem: {
      width: "30%",
      flexGrow: 1,
    },
  });
}
