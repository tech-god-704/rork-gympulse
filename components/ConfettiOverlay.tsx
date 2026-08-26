import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WeightUnit } from "@/types";
import { formatVolume } from "@/utils/units";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONFETTI_COUNT = 60;
const CONFETTI_COLORS = ["#3B82F6", "#6366F1", "#FBBF24", "#34D399", "#F472B6", "#A78BFA", "#FB923C", "#2DD4BF", "#E879F9", "#60A5FA"];
const CELEBRATION_EMOJIS = ["🎉", "💪", "🏆", "⚡", "🔥", "✨", "🥳", "👏"];

interface Props {
  visible: boolean;
  exerciseCount: number;
  duration: number;
  streak: number;
  totalVolume?: number;
  newPRs?: number;
  weightUnit?: WeightUnit;
  xpGained?: number;
  streakMultiplier?: number;
  leveledUp?: boolean;
  newLevel?: number;
  newLevelTitle?: string;
  newAchievementNames?: string[];
  onDismiss: () => void;
}

const LEVEL_UP_COLORS = ["#FFD700", "#FDE047", "#A78BFA", "#818CF8", "#FFD700", "#E879F9", "#FDE047", "#A78BFA", "#FFD700", "#818CF8"];

export default function ConfettiOverlay({ visible, exerciseCount, duration, streak, totalVolume = 0, newPRs = 0, weightUnit = "lbs", xpGained = 0, streakMultiplier = 1, leveledUp = false, newLevel, newLevelTitle, newAchievementNames = [], onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");

  const confettiAnims = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        w: 8 + Math.random() * 6,
        h: 14 + Math.random() * 8,
        rounded: Math.random() > 0.5,
      })),
    []
  );

  useEffect(() => {
    if (visible) {
      setCelebrationEmoji(CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)]);
      overlayAnim.setValue(0);
      scaleAnim.setValue(0.5);

      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]).start();

      const animations: Animated.CompositeAnimation[] = [];
      confettiAnims.forEach((anim) => {
        anim.x.setValue(Math.random() * SCREEN_WIDTH);
        anim.y.setValue(-20);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);

        const fallDuration = 2000 + Math.random() * 2000;
        const delay = Math.random() * 500;

        const a = Animated.parallel([
          Animated.timing(anim.y, {
            toValue: SCREEN_HEIGHT + 20,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.x, {
            toValue: Math.random() * SCREEN_WIDTH,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 10,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: fallDuration,
            delay: delay + fallDuration * 0.6,
            useNativeDriver: true,
          }),
        ]);
        a.start();
        animations.push(a);
      });

      return () => {
        animations.forEach((a) => a.stop());
      };
    }
  }, [visible, overlayAnim, scaleAnim, confettiAnims]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      {confettiAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: leveledUp
                ? LEVEL_UP_COLORS[i % LEVEL_UP_COLORS.length]
                : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: anim.w,
              height: anim.h,
              borderRadius: anim.rounded ? 10 : 2,
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 10],
                    outputRange: ["0deg", "3600deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>{leveledUp ? "\u{2B50}" : celebrationEmoji}</Text>
        <Text style={styles.title}>
          {leveledUp ? `LEVEL UP!` : `Workout\nComplete!`}
        </Text>
        {leveledUp && newLevelTitle ? (
          <Text style={styles.levelUpTitle}>Lv.{newLevel} {newLevelTitle}</Text>
        ) : null}
        <Text style={styles.subtitle}>
          {newPRs > 0 ? `${newPRs} new PR${newPRs > 1 ? "s" : ""}! Keep crushing it!` : "Keep the streak alive!"}
        </Text>

        {xpGained > 0 && (
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xpGained.toLocaleString()} XP</Text>
            {streakMultiplier > 1 && (
              <Text style={styles.xpMultiplier}>{streakMultiplier}x streak bonus</Text>
            )}
          </View>
        )}

        <View style={styles.statsRow}>
          {[
            { v: exerciseCount.toString(), l: "Exercises", c: colors.indigo },
            { v: `${streak}`, l: "Day Streak", c: colors.amber },
            { v: `${duration}m`, l: "Duration", c: colors.emerald },
          ].map((s) => (
            <View key={s.l} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {totalVolume > 0 && (
          <View style={styles.volumeRow}>
            <Text style={styles.volumeValue}>
              {formatVolume(totalVolume, weightUnit)}
            </Text>
            <Text style={styles.volumeLabel}>total volume</Text>
          </View>
        )}

        {newAchievementNames.length > 0 && (
          <View style={styles.achievementRow}>
            <Text style={styles.achievementTitle}>{"\u{1F3C6}"} New Achievement{newAchievementNames.length > 1 ? "s" : ""}!</Text>
            {newAchievementNames.map((name) => (
              <Text key={name} style={styles.achievementName}>{name}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={onDismiss} activeOpacity={0.8}>
          <LinearGradient
            colors={leveledUp ? ["#FFD700", "#F59E0B"] : [colors.primary, colors.indigo]}
            style={styles.doneButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.doneButtonText, leveledUp && { color: "#000" }]}>
              {leveledUp ? "Amazing!" : "Done \u{2713}"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
  },
  card: {
    alignItems: "center",
    padding: 28,
    width: "85%",
  },
  emoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: colors.text,
    textAlign: "center",
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  levelUpTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.amber,
    marginTop: 6,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 16,
    textAlign: "center",
  },
  xpBadge: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.xpBarFill + "30",
  },
  xpBadgeText: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: colors.xpBarFill,
    letterSpacing: -0.5,
  },
  xpMultiplier: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.amber,
    marginTop: 2,
  },
  achievementRow: {
    alignItems: "center",
    marginBottom: 20,
    gap: 4,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.tierGold,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "900" as const,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  volumeRow: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: colors.glassBorder,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  volumeValue: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: colors.indigo,
    letterSpacing: -0.5,
  },
  volumeLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginTop: 2,
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 18,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 6,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
