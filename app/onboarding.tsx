import React, { useState, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, Animated, Platform, KeyboardAvoidingView, ScrollView, Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  Activity,
  ArrowRight,
  BarChart2,
  BarChart3,
  Check,
  ChevronLeft,
  Dumbbell,
  Flame,
  ListChecks,
  PlayCircle,
  Signal,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text, TextInput } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Motion, card, glow, gradient } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile, DEFAULT_TRAINING_DAYS, WEEKDAY_SHORT } from "@/types";
import { WORKOUT_SPLITS, type WorkoutSplitId } from "@/mocks/exercises";
import { planSchedule } from "@/utils/routinePlanning";
import { haptic } from "@/utils/haptics";

const TOTAL_STEPS = 4;

interface Choice<T> {
  key: T;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

const GOALS: Choice<FitnessGoal>[] = [
  { key: "build_muscle", label: "Build muscle", desc: "Add size with hypertrophy-focused volume", Icon: Dumbbell },
  { key: "lose_weight", label: "Lose weight", desc: "Burn more with denser, higher-rep sessions", Icon: Flame },
  { key: "stay_active", label: "Stay active", desc: "Consistent, balanced training for health", Icon: Activity },
  { key: "get_stronger", label: "Get stronger", desc: "Heavy compounds and steady progressive loading", Icon: Zap },
];

const LEVELS: Choice<ExperienceLevel>[] = [
  { key: "beginner", label: "Beginner", desc: "Less than 6 months of steady training", Icon: Signal },
  { key: "intermediate", label: "Intermediate", desc: "6 months to 2 years under the bar", Icon: BarChart2 },
  { key: "advanced", label: "Advanced", desc: "2+ years, confident with heavy compounds", Icon: BarChart3 },
];

const PILLARS: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: ListChecks, title: "Log a set in two taps", body: "Last session's numbers are already filled in." },
  { Icon: PlayCircle, title: "See every move done right", body: "Short form demos for the exercises in your plan." },
  { Icon: TrendingUp, title: "Watch your strength climb", body: "Records, streaks and volume, charted for you." },
];

/** The split we point people at for a given weekly frequency. */
function recommendedSplit(days: number): WorkoutSplitId {
  if (days <= 3) return "start_strong";
  if (days === 4) return "build_muscle";
  if (days === 5) return "bro_split";
  return "ppl_program";
}

const stripDays = (desc: string) => {
  const rest = desc.replace(/^\d+ days per week\s*[—-]\s*/i, "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding, addRoutinesFromTemplates } = useGym();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState(DEFAULT_TRAINING_DAYS);
  const [addPlan, setAddPlan] = useState(true);

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

  const rec = WORKOUT_SPLITS.find((s) => s.id === recommendedSplit(trainingDays));
  const recSchedule = useMemo(() => (rec ? planSchedule(rec.routines.length, rec.daysPerWeek) : []), [rec]);

  const handleBack = useCallback(() => {
    if (step === 0) return;
    Keyboard.dismiss();
    haptic.light();
    animateTransition(step - 1, -1);
  }, [step, animateTransition]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    if (step < TOTAL_STEPS - 1) {
      haptic.light();
      animateTransition(step + 1, 1);
      return;
    }
    haptic.success();
    const profileData: UserProfile = {
      name: name.trim() || "Athlete",
      fitnessGoal: goal ?? "stay_active",
      experienceLevel: level ?? "beginner",
      trainingDaysPerWeek: trainingDays,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };
    // Land on a ready-to-go Today screen instead of an empty one.
    if (addPlan && rec) addRoutinesFromTemplates(rec.routines, { daysPerWeek: rec.daysPerWeek });
    completeOnboarding(profileData);
    router.replace("/(tabs)/(home)");
  }, [step, name, goal, level, trainingDays, addPlan, rec, animateTransition, completeOnboarding, addRoutinesFromTemplates, router]);

  const canProceed =
    (step === 0 && name.trim().length > 0) || (step === 1 && goal !== null) || (step === 2 && level !== null) || step === 3;
  const ctaLabel = step === TOTAL_STEPS - 1 ? (addPlan ? "Build my plan" : "Get started") : "Continue";

  function renderChoice<T extends string>(choice: Choice<T>, selected: boolean, onSelect: (key: T) => void, testID: string, index: number) {
    const { Icon } = choice;
    return (
      <FadeIn key={choice.key} delay={index * 55}>
        <PressableScale
          style={[styles.choice, selected && styles.choiceOn]}
          scaleTo={0.98}
          haptic="light"
          onPress={() => onSelect(choice.key)}
          testID={testID}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          accessibilityLabel={`${choice.label}. ${choice.desc}`}
        >
          <View style={[styles.choiceIcon, { backgroundColor: selected ? colors.primaryFill : colors.fill }]}>
            <Icon size={22} color={selected ? "#fff" : colors.textSecondary} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.choiceLabel}>{choice.label}</Text>
            <Text style={styles.choiceDesc}>{choice.desc}</Text>
          </View>
          <View style={[styles.radio, selected ? { borderColor: colors.primaryFill, backgroundColor: colors.primaryFill } : { borderColor: colors.fillStrong }]}>
            {selected && <Check size={13} color="#fff" strokeWidth={3.4} />}
          </View>
        </PressableScale>
      </FadeIn>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={handleBack}
          style={[styles.back, step === 0 && styles.hidden]}
          disabled={step === 0}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primaryFill : colors.fillStrong }]} />
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
                <FadeIn>
                  <Text style={styles.wordmark}>
                    Gym<Text style={{ color: colors.primary }}>Pulse</Text>
                  </Text>
                  <Svg width="100%" height={54} viewBox="0 0 320 54" preserveAspectRatio="xMinYMid meet">
                    <Path
                      d="M0 27h112l11-19 15 40 15-47 13 42 9-16h145"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.tagline}>Track it. Check it. Crush it.</Text>
                </FadeIn>

                <View style={styles.pillars}>
                  {PILLARS.map(({ Icon, title, body }, i) => (
                    <FadeIn key={title} delay={140 + i * 80} style={styles.pillar}>
                      <View style={styles.pillarIcon}>
                        <Icon size={20} color={colors.primaryText} strokeWidth={2.3} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.pillarTitle}>{title}</Text>
                        <Text style={styles.pillarBody}>{body}</Text>
                      </View>
                    </FadeIn>
                  ))}
                </View>

                <View style={styles.flexGrow} />
                <FadeIn delay={400} style={styles.nameBlock}>
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
                </FadeIn>
              </View>
            )}

            {step === 1 && (
              <View style={styles.step}>
                <View style={styles.head}>
                  <Text style={styles.title}>What&apos;s your main goal{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}?</Text>
                  <Text style={styles.sub}>We&apos;ll tune your splits, rep ranges and rest times.</Text>
                </View>
                <View style={styles.choices} accessibilityRole="radiogroup">
                  {GOALS.map((g, i) => renderChoice(g, goal === g.key, setGoal, `goal-${g.key}`, i))}
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
                  {LEVELS.map((l, i) => renderChoice(l, level === l.key, setLevel, `level-${l.key}`, i))}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.step}>
                <View style={styles.head}>
                  <Text style={styles.title}>How many days a week can you train?</Text>
                  <Text style={styles.sub}>Be realistic. Consistency beats intensity.</Text>
                </View>
                <View style={styles.daysRow} accessibilityRole="radiogroup">
                  {[2, 3, 4, 5, 6, 7].map((d) => {
                    const on = trainingDays === d;
                    return (
                      <PressableScale
                        key={d}
                        onPress={() => setTrainingDays(d)}
                        haptic="select"
                        scaleTo={0.92}
                        style={styles.dayWrap}
                        testID={`days-${d}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${d} days per week`}
                      >
                        {on ? (
                          <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.day}>
                            <Text style={[styles.dayNum, { color: "#fff" }]}>{d}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={[styles.day, styles.dayOff]}>
                            <Text style={styles.dayNum}>{d}</Text>
                          </View>
                        )}
                      </PressableScale>
                    );
                  })}
                </View>

                {rec && (
                  <View style={[styles.rec, addPlan && styles.recOn]}>
                    <View style={styles.recHead}>
                      <View style={styles.flex}>
                        <Text style={styles.recKicker}>Your starting plan</Text>
                        <Text style={styles.recName}>{rec.name}</Text>
                        <Text style={styles.recDesc}>{stripDays(rec.shortDescription)}</Text>
                      </View>
                    </View>
                    <View style={styles.recList}>
                      {rec.routines.map((r, i) => (
                        <View key={`${r.name}-${i}`} style={[styles.recRow, i > 0 && styles.recBorder]}>
                          <Text style={styles.recRoutine} numberOfLines={1}>{r.name}</Text>
                          <Text style={styles.recDays}>{(recSchedule[i] ?? []).map((d) => WEEKDAY_SHORT[d]).join(" · ")}</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable
                      style={styles.recToggle}
                      onPress={() => {
                        haptic.select();
                        setAddPlan((v) => !v);
                      }}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: addPlan }}
                      testID="add-plan"
                    >
                      <Text style={styles.recToggleText}>Add this plan to my routines</Text>
                      <View style={[styles.switchTrack, { backgroundColor: addPlan ? colors.success : colors.fillStrong, alignItems: addPlan ? "flex-end" : "flex-start" }]}>
                        <View style={styles.switchThumb} />
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PressableScale
        onPress={handleNext}
        disabled={!canProceed}
        style={[styles.ctaWrap, canProceed && glow("#2563EB", colors, 0.32)]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canProceed }}
        accessibilityLabel={ctaLabel}
        testID="onboarding-next"
      >
        <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.6} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    flex: { flex: 1, minWidth: 0 },
    flexGrow: { flexGrow: 1 },
    hidden: { opacity: 0 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 46, marginBottom: 12 },
    back: { width: 42, height: 42, borderRadius: 21, marginLeft: -6, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    dots: { flex: 1, flexDirection: "row", gap: 6 },
    dot: { flex: 1, height: 5, borderRadius: 3 },
    stepCount: { width: 30, textAlign: "right", fontSize: 13, fontWeight: "800", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    scroll: { flexGrow: 1, paddingBottom: 18 },
    welcome: { flexGrow: 1, gap: 26, paddingTop: 22 },
    wordmark: { fontSize: 54, fontWeight: "800", letterSpacing: -2.4, lineHeight: 60, color: colors.text },
    tagline: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5, color: colors.textSecondary, marginTop: 6 },
    pillars: { gap: 16 },
    pillar: { flexDirection: "row", alignItems: "center", gap: 14 },
    pillarIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    pillarTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    pillarBody: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: colors.textTertiary, marginTop: 1 },
    nameBlock: { gap: 8, paddingTop: 8 },
    fieldLabel: { fontSize: 13, fontWeight: "800", color: colors.textSecondary },
    nameInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.fillStrong,
      height: 58,
      paddingHorizontal: 18,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    step: { gap: 22, paddingTop: 10 },
    head: { gap: 8 },
    title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, lineHeight: 38, color: colors.text },
    sub: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: colors.textSecondary },
    choices: { gap: 10 },
    choice: {
      ...card(colors, 22),
      minHeight: 78,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    choiceOn: { borderColor: colors.primaryFill, backgroundColor: colors.scheme === "dark" ? "#152038" : "#EEF4FF" },
    choiceIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    choiceLabel: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    choiceDesc: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: colors.textTertiary, marginTop: 2 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    daysRow: { flexDirection: "row", gap: 8 },
    dayWrap: { flex: 1 },
    day: { height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    dayOff: card(colors, 18),
    dayNum: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: colors.text, fontVariant: ["tabular-nums"] },
    rec: { ...card(colors, 24), padding: 18, gap: 14, borderWidth: 2, borderColor: "transparent" },
    recOn: { borderColor: colors.primaryFill },
    recHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    recKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: colors.primaryText },
    recName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text, marginTop: 3 },
    recDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 2 },
    recList: { backgroundColor: colors.fill, borderRadius: 16, paddingHorizontal: 14 },
    recRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 42 },
    recBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    recRoutine: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
    recDays: { fontSize: 13, fontWeight: "700", color: colors.primaryText },
    recToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 36 },
    recToggleText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
    switchTrack: { width: 50, height: 30, borderRadius: 999, padding: 2, justifyContent: "center" },
    switchThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff" },
    ctaWrap: { borderRadius: 20 },
    cta: { height: 60, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
