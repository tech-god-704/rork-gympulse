import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, ScrollView } from "react-native";
import { Check, Trophy } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WeightUnit } from "@/types";
import { formatVolume } from "@/utils/units";
import { elevation, gradient, numeric } from "@/constants/theme";
import { getXPProgress } from "@/utils/gamification";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONFETTI_COUNT = 60;
const CONFETTI_COLORS = ["#3B82F6", "#6366F1", "#FBBF24", "#34D399", "#F472B6", "#A78BFA", "#FB923C", "#2DD4BF", "#E879F9", "#60A5FA"];

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
  routineName?: string;
  /** Lifetime XP after this workout, for the level progress bar. */
  totalXP?: number;
  onDismiss: () => void;
}

const LEVEL_UP_COLORS = ["#FFD700", "#FDE047", "#A78BFA", "#818CF8", "#FFD700", "#E879F9", "#FDE047", "#A78BFA", "#FFD700", "#818CF8"];

export default function ConfettiOverlay({ visible, exerciseCount, duration, streak, totalVolume = 0, newPRs = 0, weightUnit = "lbs", xpGained = 0, streakMultiplier = 1, leveledUp = false, newLevel, newLevelTitle, newAchievementNames = [], routineName, totalXP, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

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

  const progress = totalXP != null ? getXPProgress(totalXP) : null;
  const stats = [
    { v: `${duration} min`, l: "Duration" },
    { v: totalVolume > 0 ? formatVolume(totalVolume, weightUnit) : "—", l: "Volume" },
    { v: String(exerciseCount), l: exerciseCount === 1 ? "Exercise" : "Exercises" },
    { v: `${streak} ${streak === 1 ? "day" : "days"}`, l: "Streak" },
  ];

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.checkCircle}>
              <Check size={38} color={colors.success} strokeWidth={3.2} />
            </View>
          </Animated.View>
          <Text style={styles.title}>Workout complete</Text>
          <Text style={styles.subtitle}>
            {routineName ? `${routineName} · ` : ""}{duration} min{newPRs > 0 ? ` · ${newPRs} new PR${newPRs > 1 ? "s" : ""}` : ""}
          </Text>
          {xpGained > 0 && (
            <View style={styles.xpRow}>
              <Text style={styles.xpValue}>+{xpGained.toLocaleString()}</Text>
              <Text style={styles.xpUnit}>XP</Text>
            </View>
          )}
          {streakMultiplier > 1 && (
            <View style={styles.bonusChip}>
              <Text style={styles.bonusText}>Includes {streakMultiplier}× streak bonus</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {leveledUp ? (
            <View style={styles.card}>
              <View style={styles.levelRow}>
                <LinearGradient colors={["#4F46E5", "#818CF8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{newLevel}</Text>
                </LinearGradient>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelEyebrow}>LEVEL UP</Text>
                  <Text style={styles.levelTitle}>You reached Level {newLevel}</Text>
                  {newLevelTitle ? <Text style={styles.levelSub}>{newLevelTitle}</Text> : null}
                </View>
              </View>
            </View>
          ) : progress ? (
            <View style={styles.card}>
              <Text style={styles.levelSub}>
                {Math.max(progress.nextLevelXP - (totalXP ?? 0), 0).toLocaleString()} XP to the next level
              </Text>
              <View style={styles.track}>
                <LinearGradient
                  colors={gradient("bar", colors)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.fill, { width: `${Math.round(progress.fraction * 100)}%` }]}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
            {stats.map((st) => (
              <View key={st.l} style={styles.statCard}>
                <Text style={styles.statValue}>{st.v}</Text>
                <Text style={styles.statLabel}>{st.l}</Text>
              </View>
            ))}
          </View>

          {(newPRs > 0 || newAchievementNames.length > 0) && (
            <LinearGradient colors={["#B45309", "#F2C94C", "#FDE68A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goldBorder}>
              <View style={styles.goldInner}>
                {newPRs > 0 && (
                  <View style={[styles.goldRow, newAchievementNames.length > 0 && styles.goldDivider]}>
                    <LinearGradient colors={["#B45309", "#F2C94C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.prTag}>
                      <Text style={styles.prTagText}>PR</Text>
                    </LinearGradient>
                    <Text style={styles.goldTitle}>
                      {newPRs} new personal record{newPRs > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {newAchievementNames.map((name, i) => (
                  <View key={name} style={[styles.goldRow, i < newAchievementNames.length - 1 && styles.goldDivider]}>
                    <View style={styles.trophy}>
                      <Trophy size={20} color={colors.gold} />
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.goldEyebrow}>ACHIEVEMENT UNLOCKED</Text>
                      <Text style={styles.goldTitle}>{name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </LinearGradient>
          )}

          <TouchableOpacity onPress={onDismiss} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Done, close summary">
            <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {confettiAnims.map((anim, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.confettiPiece,
            {
              backgroundColor: leveledUp ? LEVEL_UP_COLORS[i % LEVEL_UP_COLORS.length] : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: anim.w,
              height: anim.h,
              borderRadius: anim.rounded ? 10 : 2,
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { rotate: anim.rotate.interpolate({ inputRange: [0, 10], outputRange: ["0deg", "3600deg"] }) },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 50 },
    scroll: { paddingTop: 56, paddingBottom: 40 },
    hero: { marginHorizontal: 12, borderRadius: 30, paddingVertical: 26, paddingHorizontal: 20, alignItems: "center", gap: 8, overflow: "hidden" },
    checkWrap: { marginBottom: 6 },
    checkCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
    title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, lineHeight: 38, color: "#fff", textAlign: "center" },
    subtitle: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.86)", textAlign: "center" },
    xpRow: { flexDirection: "row", alignItems: "baseline", gap: 6, paddingTop: 8 },
    xpValue: { fontSize: 46, fontWeight: "800", letterSpacing: -1.6, color: "#fff", ...numeric },
    xpUnit: { fontSize: 18, fontWeight: "800", color: "#fff" },
    bonusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" },
    bonusText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.86)" },
    body: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      padding: 16,
      gap: 10,
      ...elevation(1, colors),
    },
    levelRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    levelBadge: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    levelBadgeText: { fontSize: 26, fontWeight: "800", color: "#fff", ...numeric },
    levelInfo: { flex: 1, gap: 2 },
    levelEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: "#6366F1" },
    levelTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    levelSub: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, ...numeric },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.fillStrong, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: {
      width: "48.5%",
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      paddingVertical: 14,
      paddingHorizontal: 16,
      ...elevation(1, colors),
    },
    statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text, ...numeric },
    statLabel: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    goldBorder: { borderRadius: 22, padding: 2 },
    goldInner: { backgroundColor: colors.cardBackground, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
    goldRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 },
    goldDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    prTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
    prTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: "#fff" },
    trophy: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldTint, borderWidth: 2, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
    goldEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.gold },
    goldTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    doneButton: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: 4 },
    doneText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    confettiPiece: { position: "absolute", top: 0, left: 0 },
  });
