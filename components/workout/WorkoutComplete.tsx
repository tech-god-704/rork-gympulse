import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, StyleSheet, Animated, Dimensions, ScrollView, Easing, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Trophy, Flame, Award, Clock, Dumbbell, Zap } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import Meter from "@/components/ui/Meter";
import FadeIn from "@/components/ui/FadeIn";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WeightUnit } from "@/types";
import { formatVolume } from "@/utils/units";
import { card, glow, gradient, numeric } from "@/constants/theme";
import { getXPProgress } from "@/utils/gamification";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONFETTI_COUNT = 56;
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

/** Counts from zero up to `target` once `run` turns true. */
function useCountUp(target: number, run: boolean, reduced: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) {
      setValue(0);
      return;
    }
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(anim, { toValue: target, duration: 1100, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [target, run, reduced]);
  return value;
}

/** Full-screen summary shown when a workout is finished. */
export default function WorkoutComplete({
  visible,
  exerciseCount,
  duration,
  streak,
  totalVolume = 0,
  newPRs = 0,
  weightUnit = "lbs",
  xpGained = 0,
  streakMultiplier = 1,
  leveledUp = false,
  newLevel,
  newLevelTitle,
  newAchievementNames = [],
  routineName,
  totalXP,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const xp = useCountUp(xpGained, visible, reduced);

  const confettiAnims = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        w: 7 + Math.random() * 6,
        h: 12 + Math.random() * 8,
        rounded: Math.random() > 0.5,
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    overlayAnim.setValue(0);
    scaleAnim.setValue(0.4);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 70, delay: 120, useNativeDriver: true }),
    ]).start();

    if (reduced) return;
    const animations = confettiAnims.map((anim) => {
      anim.x.setValue(Math.random() * SCREEN_WIDTH);
      anim.y.setValue(-20);
      anim.rotate.setValue(0);
      anim.opacity.setValue(1);
      const fall = 2200 + Math.random() * 2000;
      const delay = Math.random() * 600;
      const a = Animated.parallel([
        Animated.timing(anim.y, { toValue: SCREEN_HEIGHT + 20, duration: fall, delay, useNativeDriver: true }),
        Animated.timing(anim.x, { toValue: Math.random() * SCREEN_WIDTH, duration: fall, delay, useNativeDriver: true }),
        Animated.timing(anim.rotate, { toValue: Math.random() * 10, duration: fall, delay, useNativeDriver: true }),
        Animated.timing(anim.opacity, { toValue: 0, duration: fall * 0.4, delay: delay + fall * 0.6, useNativeDriver: true }),
      ]);
      a.start();
      return a;
    });
    return () => animations.forEach((a) => a.stop());
  }, [visible, overlayAnim, scaleAnim, confettiAnims, reduced]);

  if (!visible) return null;

  const progress = totalXP != null ? getXPProgress(totalXP) : null;
  const stats = [
    { Icon: Clock, v: `${duration}`, u: "min" },
    { Icon: Dumbbell, v: totalVolume > 0 ? formatVolume(totalVolume, weightUnit, false) : "—", u: totalVolume > 0 ? weightUnit : "volume" },
    { Icon: Zap, v: String(exerciseCount), u: exerciseCount === 1 ? "exercise" : "exercises" },
  ];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 112 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
          <HeroBackdrop pulse />
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Check size={40} color="#1D4ED8" strokeWidth={3.4} />
          </Animated.View>
          <Text style={styles.eyebrow}>Workout complete</Text>
          <Text style={styles.title} numberOfLines={2}>{routineName || "Nice work"}</Text>

          <View style={styles.statRow}>
            {stats.map(({ Icon, v, u }) => (
              <View key={u} style={styles.stat}>
                <Icon size={15} color="rgba(255,255,255,0.75)" strokeWidth={2.4} />
                <Text style={styles.statValue}>{v}</Text>
                <Text style={styles.statUnit}>{u}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {xpGained > 0 && (
            <FadeIn delay={200} style={styles.card}>
              <View style={styles.xpTop}>
                <View>
                  <Text style={styles.cardKicker}>{leveledUp ? "Level up" : "XP earned"}</Text>
                  <Text style={styles.xpValue}>
                    +{xp.toLocaleString()}
                    <Text style={styles.xpUnit}> XP</Text>
                  </Text>
                </View>
                {leveledUp && newLevel != null ? (
                  <LinearGradient colors={["#4F46E5", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.levelBadge}>
                    <Text style={styles.levelBadgeLabel}>LVL</Text>
                    <Text style={styles.levelBadgeText}>{newLevel}</Text>
                  </LinearGradient>
                ) : null}
              </View>
              {leveledUp ? (
                <Text style={styles.cardSub}>
                  You reached level {newLevel}
                  {newLevelTitle ? ` · ${newLevelTitle}` : ""}
                </Text>
              ) : progress ? (
                <>
                  <Meter value={progress.fraction} height={10} />
                  <Text style={styles.cardSub}>
                    {Math.max(progress.nextLevelXP - (totalXP ?? 0), 0).toLocaleString()} XP to the next level
                    {streakMultiplier > 1 ? ` · includes ${streakMultiplier}× streak bonus` : ""}
                  </Text>
                </>
              ) : null}
            </FadeIn>
          )}

          <FadeIn delay={280} style={styles.duo}>
            <View style={[styles.card, styles.duoCard]}>
              <View style={[styles.iconWell, { backgroundColor: colors.flameTint }]}>
                <Flame size={20} color={colors.flame} fill={colors.flame} />
              </View>
              <Text style={styles.duoValue}>{streak}</Text>
              <Text style={styles.duoLabel}>day streak</Text>
            </View>
            <View style={[styles.card, styles.duoCard, newPRs > 0 && { borderWidth: 1.5, borderColor: colors.gold }]}>
              <View style={[styles.iconWell, { backgroundColor: colors.goldTint }]}>
                <Trophy size={20} color={colors.gold} />
              </View>
              <Text style={styles.duoValue}>{newPRs}</Text>
              <Text style={styles.duoLabel}>{newPRs === 1 ? "new record" : "new records"}</Text>
            </View>
          </FadeIn>

          {newAchievementNames.length > 0 && (
            <FadeIn delay={360} style={styles.card}>
              <Text style={styles.cardKicker}>{newAchievementNames.length === 1 ? "Achievement unlocked" : "Achievements unlocked"}</Text>
              {newAchievementNames.map((name) => (
                <View key={name} style={styles.achRow}>
                  <View style={[styles.iconWell, styles.iconWellSm, { backgroundColor: colors.goldTint }]}>
                    <Award size={17} color={colors.gold} />
                  </View>
                  <Text style={styles.achName}>{name}</Text>
                </View>
              ))}
            </FadeIn>
          )}
        </View>
      </ScrollView>

      <LinearGradient
        colors={[colors.scheme === "dark" ? "rgba(7,8,11,0)" : "rgba(243,244,247,0)", colors.background, colors.background]}
        locations={[0, 0.35, 1]}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}
        pointerEvents="box-none"
      >
        <PressableScale onPress={onDismiss} haptic="light" style={[styles.doneWrap, glow("#2563EB", colors, 0.3)]} accessibilityRole="button" testID="complete-done">
          <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </LinearGradient>
        </PressableScale>
      </LinearGradient>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: anim.w,
              height: anim.h,
              borderRadius: anim.rounded ? anim.w / 2 : 2,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              opacity: reduced ? 0 : anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { rotate: anim.rotate.interpolate({ inputRange: [0, 10], outputRange: ["0deg", "3600deg"] }) },
              ],
            }}
          />
        ))}
      </View>
    </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.background },
    hero: { paddingHorizontal: 24, paddingBottom: 30, alignItems: "center", gap: 6, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
    checkCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 14 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.78)" },
    title: { fontSize: 36, fontWeight: "800", letterSpacing: -1.4, lineHeight: 41, color: "#fff", textAlign: "center" },
    statRow: { flexDirection: "row", gap: 8, marginTop: 18, alignSelf: "stretch" },
    stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 18, paddingVertical: 14, alignItems: "center", gap: 3 },
    statValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8, color: "#fff", marginTop: 3, ...numeric },
    statUnit: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
    body: { padding: 20, gap: 12 },
    card: { ...card(colors), padding: 18, gap: 12 },
    cardKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: colors.textTertiary },
    cardSub: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    xpTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    xpValue: { fontSize: 44, fontWeight: "800", letterSpacing: -1.8, lineHeight: 50, color: colors.text, ...numeric },
    xpUnit: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, color: colors.primaryText },
    levelBadge: { width: 58, height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    levelBadgeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "rgba(255,255,255,0.75)", marginBottom: -2 },
    levelBadgeText: { fontSize: 24, fontWeight: "800", color: "#fff", ...numeric },
    duo: { flexDirection: "row", gap: 12 },
    duoCard: { flex: 1, gap: 2 },
    iconWell: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    iconWellSm: { width: 34, height: 34, borderRadius: 12, marginBottom: 0 },
    duoValue: { fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 34, color: colors.text, ...numeric },
    duoLabel: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    achRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    achName: { flex: 1, fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 30, paddingHorizontal: 20 },
    doneWrap: { borderRadius: 20 },
    done: { height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    doneText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
