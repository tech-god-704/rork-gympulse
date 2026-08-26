import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { getXPProgress, getLevelDefinition } from "@/utils/gamification";
import { ColorScheme } from "@/constants/colors";

interface XPBarProps {
  totalXP: number;
  level: number;
  compact?: boolean;
}

export default function XPBar({ totalXP, level, compact = false }: XPBarProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, compact), [colors, compact]);
  const progress = getXPProgress(totalXP);
  const levelDef = getLevelDefinition(level);
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress.fraction,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress.fraction, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelText}>
          {levelDef.emoji} Lv.{level} {levelDef.title}
        </Text>
        {!compact && (
          <Text style={styles.xpText}>
            {totalXP.toLocaleString()} / {progress.nextLevelXP.toLocaleString()} XP
          </Text>
        )}
      </View>
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, { width: fillWidth }]} />
      </View>
      {compact && (
        <Text style={styles.xpTextCompact}>
          {progress.progressXP.toLocaleString()} / {(progress.nextLevelXP - progress.currentLevelXP).toLocaleString()} XP
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme, compact: boolean) {
  return StyleSheet.create({
    container: {
      gap: compact ? 4 : 6,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    levelText: {
      fontSize: compact ? 13 : 15,
      fontWeight: "700",
      color: colors.text,
    },
    xpText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.xpText,
    },
    xpTextCompact: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textTertiary,
    },
    barBackground: {
      height: compact ? 6 : 8,
      backgroundColor: colors.xpBarBackground,
      borderRadius: compact ? 3 : 4,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.xpBarFill,
      borderRadius: compact ? 3 : 4,
    },
  });
}
