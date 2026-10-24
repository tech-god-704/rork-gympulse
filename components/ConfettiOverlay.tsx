import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WeightUnit } from "@/types";
import { formatVolume } from "@/utils/units";
import { Layout, Radius, Space, Type, glow, numeric, statNumber, surface } from "@/constants/theme";

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

        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.85}
          style={styles.doneTouch}
          accessibilityRole="button"
          accessibilityLabel={leveledUp ? "Amazing, continue" : "Done, close summary"}
        >
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
    backgroundColor: colors.scheme === "dark" ? "rgba(0,0,0,0.86)" : "rgba(244,244,247,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: Space.xl,
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
  },
  card: {
    ...surface(colors, 3, Radius.xl),
    alignItems: "center",
    padding: Space.xl,
    width: "100%",
    maxWidth: 380,
  },
  emoji: {
    fontSize: 60,
    marginBottom: Space.sm,
  },
  title: {
    ...Type.hero,
    color: colors.text,
    textAlign: "center",
  },
  levelUpTitle: {
    ...Type.headline,
    color: colors.amber,
    textAlign: "center",
    marginTop: Space.xs,
  },
  subtitle: {
    ...Type.body,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: Space.sm,
    marginBottom: Space.lg,
  },
  xpBadge: {
    alignItems: "center",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.pill,
    backgroundColor: colors.xpBarFill,
    marginBottom: Space.lg,
  },
  xpBadgeText: {
    ...statNumber(18),
    color: "#fff",
  },
  xpMultiplier: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    paddingVertical: Space.base,
    borderTopWidth: Layout.hairline,
    borderBottomWidth: Layout.hairline,
    borderColor: colors.separator,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...statNumber(22),
  },
  statLabel: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
    marginTop: 3,
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Space.xs + 2,
    marginTop: Space.base,
  },
  volumeValue: {
    ...statNumber(17),
    color: colors.text,
  },
  volumeLabel: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  achievementRow: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: Space.base,
    paddingVertical: Space.md,
    paddingHorizontal: Space.base,
    borderRadius: Radius.md,
    backgroundColor: colors.fill,
    gap: 3,
  },
  achievementTitle: {
    ...Type.caption,
    fontWeight: "800",
    color: colors.amberDark,
  },
  achievementName: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  doneTouch: {
    alignSelf: "stretch",
    marginTop: Space.xl,
  },
  doneButton: {
    paddingVertical: Space.base,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    ...glow(colors.indigo, colors, 0.3),
  },
  doneButtonText: {
    ...Type.title3,
    fontWeight: "800",
    color: "#fff",
  },
});
