import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { UnlockedAchievement, AchievementCategory } from "@/types";
import { ACHIEVEMENT_DEFINITIONS } from "@/utils/gamification";
import AchievementBadge from "./AchievementBadge";
import { ColorScheme } from "@/constants/colors";
import { Space, Type, numeric } from "@/constants/theme";
import ProgressBar from "./ui/ProgressBar";

interface AchievementGridProps {
  unlockedAchievements: UnlockedAchievement[];
}

const CATEGORIES: { key: AchievementCategory; label: string }[] = [
  { key: "consistency", label: "Consistency" },
  { key: "strength", label: "Strength" },
  { key: "volume", label: "Volume" },
  { key: "variety", label: "Variety" },
  { key: "endurance", label: "Endurance" },
];

export default function AchievementGrid({ unlockedAchievements }: AchievementGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const unlockedSet = useMemo(
    () => new Set(unlockedAchievements.map((a) => a.id)),
    [unlockedAchievements]
  );

  const total = ACHIEVEMENT_DEFINITIONS.length;
  const earned = unlockedAchievements.length;

  // Collapsed, show the badges closest to being useful: everything unlocked
  // first, then the next few to chase.
  const preview = useMemo(() => {
    const unlocked = ACHIEVEMENT_DEFINITIONS.filter((a) => unlockedSet.has(a.id));
    const locked = ACHIEVEMENT_DEFINITIONS.filter((a) => !unlockedSet.has(a.id));
    return [...unlocked, ...locked].slice(0, 6);
  }, [unlockedSet]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Achievements, ${earned} of ${total} unlocked`}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.count}>
            {earned} of {total} unlocked
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={17} color={colors.textTertiary} />
        ) : (
          <ChevronDown size={17} color={colors.textTertiary} />
        )}
      </TouchableOpacity>

      <ProgressBar value={total > 0 ? earned / total : 0} height={7} color={colors.xpBarFill} />

      {expanded ? (
        CATEGORIES.map(({ key, label }) => {
          const items = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === key);
          const done = items.filter((a) => unlockedSet.has(a.id)).length;
          return (
            <View key={key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <Text style={styles.sectionCount}>{done}/{items.length}</Text>
              </View>
              <View style={styles.grid}>
                {items.map((achievement) => (
                  <View key={achievement.id} style={styles.cell}>
                    <AchievementBadge
                      achievement={achievement}
                      unlocked={unlockedSet.has(achievement.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.grid}>
          {preview.map((achievement) => (
            <View key={achievement.id} style={styles.cell}>
              <AchievementBadge
                achievement={achievement}
                unlocked={unlockedSet.has(achievement.id)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: {
      gap: Space.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Space.sm,
    },
    headerText: {
      flex: 1,
    },
    title: {
      ...Type.headline,
      color: colors.text,
    },
    count: {
      ...Type.caption,
      ...numeric,
      fontWeight: "500",
      color: colors.textTertiary,
      marginTop: 2,
    },
    section: {
      gap: Space.sm,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabel: {
      ...Type.overline,
      fontSize: 11,
      color: colors.textSecondary,
    },
    sectionCount: {
      ...Type.caption,
      ...numeric,
      fontWeight: "700",
      color: colors.textTertiary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Space.sm,
    },
    cell: {
      width: "31%",
      flexGrow: 1,
    },
  });
}
