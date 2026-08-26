import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Zap, Check, ChevronLeft, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Motion, Radius, Space, Type, glow, numeric, tint } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile } from "@/types";
import { Button } from "@/components/ui";

const TOTAL_STEPS = 4;

interface Choice<T> {
  key: T;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useGym();

  const GOALS: Choice<FitnessGoal>[] = [
    { key: "build_muscle", label: "Build muscle", emoji: "💪", desc: "Hypertrophy focused", color: colors.primary },
    { key: "lose_weight", label: "Lose weight", emoji: "🔥", desc: "Cut and lean out", color: colors.rose },
    { key: "stay_active", label: "Stay active", emoji: "🏃", desc: "General fitness", color: colors.emerald },
    { key: "get_stronger", label: "Get stronger", emoji: "⚡", desc: "Strength and power", color: colors.amber },
  ];

  const LEVELS: Choice<ExperienceLevel>[] = [
    { key: "beginner", label: "Beginner", emoji: "🌱", desc: "Just getting started", color: colors.emerald },
    { key: "intermediate", label: "Intermediate", emoji: "⚡", desc: "1–3 years training", color: colors.amber },
    { key: "advanced", label: "Advanced", emoji: "🏆", desc: "3+ years structured", color: colors.rose },
  ];

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState(4);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (nextStep: number, direction: 1 | -1) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: Motion.instant, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -40 * direction, duration: Motion.instant, useNativeDriver: true }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(40 * direction);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: Motion.fast, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: Motion.fast, useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleBack = useCallback(() => {
    if (step === 0) return;
    Keyboard.dismiss();
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateTransition(step - 1, -1);
  }, [step, animateTransition]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    if (step < TOTAL_STEPS - 1) {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition(step + 1, 1);
      return;
    }
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profileData: UserProfile = {
      name: name.trim() || "Athlete",
      fitnessGoal: goal ?? "stay_active",
      experienceLevel: level ?? "beginner",
      trainingDaysPerWeek: trainingDays,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };
    completeOnboarding(profileData);
    router.replace("/(tabs)/(home)");
  }, [step, name, goal, level, trainingDays, animateTransition, completeOnboarding, router]);

  const canProceed =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && goal !== null) ||
    (step === 2 && level !== null) ||
    step === 3;

  const ctaLabel = step === 0 ? "Get started" : step === TOTAL_STEPS - 1 ? "Start training" : "Continue";

  /** Shared card for the goal and experience steps. */
  function renderChoice<T extends string>(
    choice: Choice<T>,
    selected: boolean,
    onSelect: (key: T) => void,
    testID: string
  ) {
    return (
      <TouchableOpacity
        key={choice.key}
        style={[
          styles.choice,
          selected && {
            borderColor: choice.color,
            borderWidth: 2,
            backgroundColor: tint(choice.color, colors.scheme === "dark" ? 0.16 : 0.09),
          },
        ]}
        onPress={() => {
          onSelect(choice.key);
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${choice.label}. ${choice.desc}`}
      >
        <View
          style={[
            styles.choiceEmoji,
            { backgroundColor: tint(choice.color, selected ? 0.2 : 0.1) },
          ]}
        >
          <Text style={styles.choiceEmojiText}>{choice.emoji}</Text>
        </View>
        <View style={styles.choiceInfo}>
          <Text style={styles.choiceLabel}>{choice.label}</Text>
          <Text style={styles.choiceDesc}>{choice.desc}</Text>
        </View>
        <View
          style={[
            styles.choiceCheck,
            selected ? { backgroundColor: choice.color } : styles.choiceCheckEmpty,
          ]}
        >
          {selected && <Check size={13} color="#fff" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Space.md, paddingBottom: Math.max(insets.bottom, Space.base) },
      ]}
    >
      {/* ── Progress ── */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, step === 0 && styles.backButtonHidden]}
          activeOpacity={0.7}
          disabled={step === 0}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i <= step && { backgroundColor: colors.primary },
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepCount}>
          {step + 1}/{TOTAL_STEPS}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
          >
            {/* ── Step 0: welcome + name ── */}
            {step === 0 && (
              <View style={styles.welcome}>
                <LinearGradient
                  colors={[colors.primary, colors.indigo, colors.violet]}
                  style={[styles.logo, glow(colors.indigo, colors, 0.4)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Zap size={42} color="#fff" fill="#fff" />
                </LinearGradient>

                <Text style={styles.appName}>
                  Gym<Text style={{ color: colors.primary }}>Pulse</Text>
                </Text>
                <Text style={styles.tagline}>Track it. Check it. Crush it.</Text>

                <View style={styles.pillars}>
                  {[
                    { emoji: "📊", label: "Track every set" },
                    { emoji: "🏆", label: "Chase real PRs" },
                    { emoji: "🔥", label: "Build the streak" },
                  ].map((f) => (
                    <View key={f.label} style={styles.pillar}>
                      <Text style={styles.pillarEmoji}>{f.emoji}</Text>
                      <Text style={styles.pillarLabel}>{f.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>WHAT SHOULD WE CALL YOU?</Text>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={40}
                  returnKeyType="next"
                  onSubmitEditing={() => canProceed && handleNext()}
                  autoFocus
                  testID="name-input"
                  accessibilityLabel="Your first name"
                />
              </View>
            )}

            {/* ── Step 1: goal ── */}
            {step === 1 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>What&apos;s the mission?</Text>
                <Text style={styles.stepSubtitle}>
                  We&apos;ll shape your plan and stats around it.
                </Text>
                <View style={styles.choiceList} accessibilityRole="radiogroup">
                  {GOALS.map((g) => renderChoice(g, goal === g.key, setGoal, `goal-${g.key}`))}
                </View>
              </View>
            )}

            {/* ── Step 2: experience ── */}
            {step === 2 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>How much lifting have you done?</Text>
                <Text style={styles.stepSubtitle}>No judgment — just calibration.</Text>
                <View style={styles.choiceList} accessibilityRole="radiogroup">
                  {LEVELS.map((l) => renderChoice(l, level === l.key, setLevel, `level-${l.key}`))}
                </View>
              </View>
            )}

            {/* ── Step 3: frequency + recap ── */}
            {step === 3 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>How many days a week?</Text>
                <Text style={styles.stepSubtitle}>Pick a rhythm you can keep. Change it any time.</Text>

                <View style={styles.daysGrid} accessibilityRole="radiogroup">
                  {[2, 3, 4, 5, 6, 7].map((d) => {
                    const active = trainingDays === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => {
                          setTrainingDays(d);
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                        }}
                        style={[styles.dayButton, active && styles.dayButtonActive]}
                        testID={`days-${d}`}
                        activeOpacity={0.8}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${d} days per week`}
                      >
                        <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{d}</Text>
                        <Text style={[styles.dayUnit, active && styles.dayUnitActive]}>
                          {d === 1 ? "day" : "days"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Recap so the last tap confirms rather than surprises. */}
                <View style={styles.recap}>
                  <Text style={styles.recapTitle}>YOUR SETUP</Text>
                  <RecapRow label="Name" value={name.trim() || "Athlete"} colors={colors} />
                  <RecapRow
                    label="Goal"
                    value={GOALS.find((g) => g.key === goal)?.label ?? "Stay active"}
                    colors={colors}
                  />
                  <RecapRow
                    label="Experience"
                    value={LEVELS.find((l) => l.key === level)?.label ?? "Beginner"}
                    colors={colors}
                  />
                  <RecapRow label="Training" value={`${trainingDays} days / week`} colors={colors} />
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Button
        label={ctaLabel}
        onPress={handleNext}
        disabled={!canProceed}
        size="lg"
        fullWidth
        haptic="none"
        trailingIcon={<ArrowRight size={18} color="#fff" />}
        style={styles.cta}
        accessibilityLabel={ctaLabel}
      />
    </View>
  );
}

function RecapRow({ label, value, colors }: { label: string; value: string; colors: ColorScheme }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: Space.xl,
  },
  flex: {
    flex: 1,
  },
  // ── Progress ──
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    marginBottom: Space.xl,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonHidden: {
    opacity: 0,
  },
  progressTrack: {
    flex: 1,
    flexDirection: "row",
    gap: Space.xs + 2,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.fillStrong,
  },
  stepCount: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
    minWidth: 26,
    textAlign: "right",
  },
  scrollContent: {
    paddingBottom: Space.xl,
  },
  // ── Welcome ──
  welcome: {
    alignItems: "center",
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: Radius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  appName: {
    ...Type.hero,
    color: colors.text,
  },
  tagline: {
    ...Type.body,
    color: colors.textTertiary,
    marginTop: Space.xs,
    textAlign: "center",
  },
  pillars: {
    flexDirection: "row",
    gap: Space.sm,
    marginTop: Space.xl,
    marginBottom: Space.xxl,
    alignSelf: "stretch",
  },
  pillar: {
    flex: 1,
    alignItems: "center",
    gap: Space.xs + 2,
    paddingVertical: Space.md,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
  },
  pillarEmoji: {
    fontSize: 20,
  },
  pillarLabel: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },
  fieldLabel: {
    ...Type.overline,
    fontSize: 11,
    color: colors.textTertiary,
    alignSelf: "flex-start",
    marginBottom: Space.sm,
  },
  nameInput: {
    ...Type.title3,
    alignSelf: "stretch",
    color: colors.text,
    backgroundColor: colors.fill,
    borderWidth: 1.5,
    borderColor: colors.separator,
    borderRadius: Radius.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    minHeight: 56,
  },
  // ── Steps ──
  step: {
    gap: Space.sm,
  },
  stepTitle: {
    ...Type.title1,
    color: colors.text,
  },
  stepSubtitle: {
    ...Type.body,
    color: colors.textTertiary,
    marginBottom: Space.lg,
  },
  choiceList: {
    gap: Space.md,
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.base,
    padding: Space.base,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: colors.separator,
    backgroundColor: colors.surfaceBase,
    minHeight: 76,
  },
  choiceEmoji: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceEmojiText: {
    fontSize: 24,
  },
  choiceInfo: {
    flex: 1,
  },
  choiceLabel: {
    ...Type.headline,
    color: colors.text,
  },
  choiceDesc: {
    ...Type.subhead,
    color: colors.textTertiary,
    marginTop: 2,
  },
  choiceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceCheckEmpty: {
    borderWidth: 2,
    borderColor: colors.separator,
  },
  // ── Days ──
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
    marginBottom: Space.xl,
  },
  dayButton: {
    flexGrow: 1,
    flexBasis: "28%",
    paddingVertical: Space.base,
    borderRadius: Radius.md,
    backgroundColor: colors.fill,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  dayButtonActive: {
    backgroundColor: tint(colors.primary, colors.scheme === "dark" ? 0.2 : 0.12),
    borderColor: colors.primary,
  },
  dayNumber: {
    ...Type.title1,
    ...numeric,
    color: colors.textSecondary,
  },
  dayNumberActive: {
    color: colors.primary,
  },
  dayUnit: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
    marginTop: 1,
  },
  dayUnitActive: {
    color: colors.primary,
  },
  // ── Recap ──
  recap: {
    borderRadius: Radius.md,
    backgroundColor: colors.fill,
    padding: Space.base,
    gap: Space.sm,
  },
  recapTitle: {
    ...Type.overline,
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: Space.xxs,
  },
  recapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  recapLabel: {
    ...Type.subhead,
    color: colors.textTertiary,
  },
  recapValue: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  cta: {
    marginTop: Space.md,
    minHeight: Layout.touchTarget + 10,
  },
});
