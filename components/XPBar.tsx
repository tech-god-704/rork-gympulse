import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { getXPProgress, getLevelDefinition, LEVEL_DEFINITIONS } from "@/utils/gamification";
import { ColorScheme } from "@/constants/colors";
import { Motion, Radius, Space, Type, numeric, tint } from "@/constants/theme";

interface XPBarProps {
  totalXP: number;
  level: number;
  compact?: boolean;
}

export default function XPBar({ totalXP, level, compact = false }: XPBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);
  const progress = getXPProgress(totalXP);
  const levelDef = getLevelDefinition(level);
  const nextDef = getLevelDefinition(Math.min(level + 1, LEVEL_DEFINITIONS.length));
  const atMax = level >= LEVEL_DEFINITIONS.length;

  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress.fraction,
      duration: Motion.celebration,
      useNativeDriver: false,
    }).start();
  }, [progress.fraction, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const remaining = Math.max(progress.nextLevelXP - totalXP, 0);
  const span = Math.max(progress.nextLevelXP - progress.currentLevelXP, 1);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={
        atMax
          ? `Level ${level}, ${levelDef.title}. Maximum level reached.`
          : `Level ${level}, ${levelDef.title}. ${remaining.toLocaleString()} XP to level ${level + 1}.`
      }
    >
      <View style={styles.header}>
        <View style={styles.levelChip}>
          <Text style={styles.levelEmoji}>{levelDef.emoji}</Text>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{levelDef.title}</Text>
          {!compact && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {atMax ? "Max level reached" : `Next: ${nextDef.title}`}
            </Text>
          )}
        </View>
        <Text style={styles.xp} numberOfLines={1}>
          {atMax
            ? `${totalXP.toLocaleString()} XP`
            : `${progress.progressXP.toLocaleString()}/${span.toLocaleString()}`}
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, { width: fillWidth }]}>
          <LinearGradient
            colors={[colors.primary, colors.indigo, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        </Animated.View>
      </View>

      {!compact && !atMax && (
        <Text style={styles.remaining}>
          {remaining.toLocaleString()} XP to level {level + 1}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme, compact: boolean) {
  const barHeight = compact ? 7 : 9;
  return StyleSheet.create({
    container: {
      gap: compact ? Space.sm : Space.sm + 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: Space.sm + 2,
    },
    levelChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: Space.sm,
      paddingVertical: 3,
      borderRadius: Radius.xs,
      backgroundColor: tint(colors.xpBarFill, colors.scheme === "dark" ? 0.26 : 0.14),
    },
    levelEmoji: {
      fontSize: 12,
    },
    levelNumber: {
      ...Type.caption,
      ...numeric,
      fontWeight: "800",
      color: colors.xpBarFill,
    },
    titleBlock: {
      flex: 1,
    },
    title: {
      ...(compact ? Type.callout : Type.headline),
      color: colors.text,
    },
    subtitle: {
      ...Type.caption,
      fontWeight: "500",
      color: colors.textTertiary,
      marginTop: 1,
    },
    xp: {
      ...Type.caption,
      ...numeric,
      fontWeight: "700",
      color: colors.textTertiary,
    },
    track: {
      height: barHeight,
      backgroundColor: colors.fill,
      borderRadius: barHeight / 2,
      overflow: "hidden",
    },
    fillWrap: {
      height: barHeight,
      borderRadius: barHeight / 2,
      overflow: "hidden",
    },
    fill: {
      flex: 1,
    },
    remaining: {
      ...Type.caption,
      ...numeric,
      fontWeight: "500",
      color: colors.textTertiary,
    },
  });
}
