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
import Svg, { Path } from "react-native-svg";
import { Activity, BarChart2, BarChart3, Check, ChevronLeft, Dumbbell, Flame, Signal, Zap, type LucideIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Motion, glow, gradient } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile, DEFAULT_TRAINING_DAYS } from "@/types";
import { WORKOUT_SPLITS, type WorkoutSplitId } from "@/mocks/exercises";

const TOTAL_STEPS = 4;

interface Choice<T> {
  key: T;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

const GOALS: Choice<FitnessGoal>[] = [
  { key: "build_muscle", label: "Build Muscle", desc: "Add size with hypertrophy-focused volume", Icon: Dumbbell },
  { key: "lose_weight", label: "Lose Weight", desc: "Burn more with denser, higher-rep sessions", Icon: Flame },
  { key: "stay_active", label: "Stay Active", desc: "Consistent, balanced training for health", Icon: Activity },
  { key: "get_stronger", label: "Get Stronger", desc: "Heavy compounds and steady progressive loading", Icon: Zap },
];

const LEVELS: Choice<ExperienceLevel>[] = [
  { key: "beginner", label: "Beginner", desc: "Less than 6 months of steady training", Icon: Signal },
  { key: "intermediate", label: "Intermediate", desc: "6 months to 2 years under the bar", Icon: BarChart2 },
  { key: "advanced", label: "Advanced", desc: "2+ years, confident with heavy compounds", Icon: BarChart3 },
];

/** The split we point people at for a given weekly frequency. */
function recommendedSplit(days: number): WorkoutSplitId {
  if (days <= 3) return "start_strong";
  if (days === 4) return "build_muscle";
  if (days === 5) return "bro_split";
  return "ppl_program";
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useGym();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState(DEFAULT_TRAINING_DAYS);

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
    [fadeAnim, slideAnim],
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
    (step === 0 && name.trim().length > 0) || (step === 1 && goal !== null) || (step === 2 && level !== null) || step === 3;
  const ctaLabel = step === TOTAL_STEPS - 1 ? "Get started" : "Continue";
  const rec = WORKOUT_SPLITS.find((s) => s.id === recommendedSplit(trainingDays));

  function renderChoice<T extends string>(choice: Choice<T>, selected: boolean, onSelect: (key: T) => void, testID: string) {
    const { Icon } = choice;
    return (
      <TouchableOpacity
        key={choice.key}
        style={[styles.choice, selected && { borderColor: colors.primary, backgroundColor: colors.primaryTint }]}
        onPress={() => {
          onSelect(choice.key);
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.85}
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${choice.label}. ${choice.desc}`}
      >
        <View style={[styles.choiceIcon, { backgroundColor: selected ? colors.primary : colors.fill }]}>
          <Icon size={22} color={selected ? "#fff" : colors.textSecondary} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.choiceLabel}>{choice.label}</Text>
          <Text style={styles.choiceDesc}>{choice.desc}</Text>
        </View>
        <View style={[styles.radio, selected ? { borderColor: colors.primary, backgroundColor: colors.primary } : { borderColor: colors.fillStrong }]}>
          {selected && <Check size={13} color="#fff" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 2, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.back, step === 0 && styles.hidden]}
          disabled={step === 0}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.fillStrong }]} />
          ))}
        </View>
        <Text style={styles.stepCount}>
          {step + 1}/{TOTAL_STEPS}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.flexGrow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            {step === 0 && (
              <View style={styles.welcome}>
                <Text style={styles.wordmark}>
                  Gym<Text style={{ color: colors.primary }}>Pulse</Text>
                </Text>
                <Svg width="100%" height={60} viewBox="0 0 320 60" preserveAspectRatio="xMinYMid meet">
                  <Path d="M0 30h112l11-21 15 44 15-52 13 46 9-17h145" fill="none" stroke={colors.primary} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.tagline}>Track it. Check it. Crush it.</Text>
                <View style={styles.flexGrow} />
                <View style={{ gap: 8 }}>
                  <Text style={styles.fieldLabel}>What should we call you?</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="First name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={40}
                    returnKeyType="next"
                    onSubmitEditing={() => canProceed && handleNext()}
                    testID="name-input"
                    accessibilityLabel="Your first name"
                  />
                </View>
              </View>
            )}

            {step === 1 && (
              <View style={styles.step}>
                <View style={styles.head}>
                  <Text style={styles.title}>What&apos;s your main goal?</Text>
                  <Text style={styles.sub}>We&apos;ll tune your splits, rep ranges and rest times.</Text>
                </View>
                <View style={styles.choices} accessibilityRole="radiogroup">
                  {GOALS.map((g) => renderChoice(g, goal === g.key, setGoal, `goal-${g.key}`))}
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.step}>
                <View style={styles.head}>
                  <Text style={styles.title}>How experienced are you?</Text>
                  <Text style={styles.sub}>This sets your starting weights and volume.</Text>
                </View>
                <View style={styles.choices} accessibilityRole="radiogroup">
                  {LEVELS.map((l) => renderChoice(l, level === l.key, setLevel, `level-${l.key}`))}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.step}>
                <View style={styles.head}>
                  <Text style={styles.title}>How many days a week can you train?</Text>
                  <Text style={styles.sub}>Be realistic. Consistency beats intensity.</Text>
                </View>
                <View style={styles.daysGrid} accessibilityRole="radiogroup">
                  {[2, 3, 4, 5, 6, 7].map((d) => {
                    const on = trainingDays === d;
                    const inner = (
                      <>
                        <Text style={[styles.dayNum, on && { color: "#fff" }]}>{d}</Text>
                        <Text style={[styles.dayUnit, on && { color: "rgba(255,255,255,0.8)" }]}>days</Text>
                      </>
                    );
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => {
                          setTrainingDays(d);
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                        }}
                        style={styles.dayWrap}
                        testID={`days-${d}`}
                        activeOpacity={0.85}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${d} days per week`}
                      >
                        {on ? (
                          <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.day}>
                            {inner}
                          </LinearGradient>
                        ) : (
                          <View style={[styles.day, styles.dayOff]}>{inner}</View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {rec && (
                  <View style={styles.rec}>
                    <Text style={styles.recKicker}>Recommended split</Text>
                    <Text style={styles.recName}>{rec.name}</Text>
                    <Text style={styles.recDesc}>{rec.shortDescription}</Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        onPress={handleNext}
        disabled={!canProceed}
        activeOpacity={0.85}
        style={[styles.ctaWrap, glow("#2563EB", colors, 0.3), !canProceed && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canProceed }}
        accessibilityLabel={ctaLabel}
      >
        <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    flex: { flex: 1, minWidth: 0 },
    flexGrow: { flexGrow: 1 },
    hidden: { opacity: 0 },
    disabled: { opacity: 0.45 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 44, marginBottom: 18 },
    back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
    dots: { flex: 1, flexDirection: "row", gap: 6 },
    dot: { flex: 1, height: 4, borderRadius: 2 },
    stepCount: { width: 30, textAlign: "right", fontSize: 13, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    scroll: { flexGrow: 1, paddingBottom: 18 },
    welcome: { flexGrow: 1, gap: 16, paddingTop: 40, minHeight: 420 },
    wordmark: { fontSize: 52, fontWeight: "800", letterSpacing: -2.2, lineHeight: 56, color: colors.text },
    tagline: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5, lineHeight: 30, color: colors.textSecondary },
    fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    nameInput: {
      height: 56,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 18,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    step: { gap: 22, paddingTop: 16 },
    head: { gap: 8 },
    title: { fontSize: 30, fontWeight: "800", letterSpacing: -1.1, lineHeight: 36, color: colors.text },
    sub: { fontSize: 15, fontWeight: "500", color: colors.textSecondary },
    choices: { gap: 10 },
    choice: {
      minHeight: 76,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.separator,
      backgroundColor: colors.cardBackground,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    choiceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    choiceLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
    choiceDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 2 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    dayWrap: { flexBasis: "30%", flexGrow: 1 },
    day: { height: 88, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 2 },
    dayOff: { backgroundColor: colors.cardBackground, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
    dayNum: { fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 34, color: colors.text, fontVariant: ["tabular-nums"] },
    dayUnit: { fontSize: 12, fontWeight: "700", color: colors.textTertiary },
    rec: { backgroundColor: colors.cardBackground, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 16, paddingHorizontal: 18, gap: 4 },
    recKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: colors.primaryText },
    recName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    recDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary },
    ctaWrap: { borderRadius: 18 },
    cta: { height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
