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
import { Zap, Check, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile } from "@/types";

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const GOALS: { key: FitnessGoal; label: string; emoji: string; desc: string; color: string }[] = [
    { key: "build_muscle", label: "Build Muscle", emoji: "💪", desc: "Hypertrophy focused", color: colors.primary },
    { key: "lose_weight", label: "Lose Weight", emoji: "🔥", desc: "Cut & lean out", color: colors.rose },
    { key: "stay_active", label: "Stay Active", emoji: "🏃", desc: "General fitness", color: colors.emerald },
    { key: "get_stronger", label: "Get Stronger", emoji: "⚡", desc: "Strength & power", color: colors.amber },
  ];

  const LEVELS: { key: ExperienceLevel; label: string; emoji: string; desc: string; color: string }[] = [
    { key: "beginner", label: "Beginner", emoji: "🌱", desc: "Just getting started", color: colors.emerald },
    { key: "intermediate", label: "Intermediate", emoji: "⚡", desc: "1-3 years training", color: colors.amber },
    { key: "advanced", label: "Advanced", emoji: "🏆", desc: "3+ years structured", color: colors.rose },
  ];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useGym();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState(5);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (nextStep: number) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleBack = useCallback(() => {
    if (step > 0) {
      Keyboard.dismiss();
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      animateTransition(step - 1);
    }
  }, [step, animateTransition]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < 3) {
      animateTransition(step + 1);
    } else {
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
    }
  }, [step, name, goal, level, trainingDays, animateTransition, completeOnboarding, router]);

  const canProceed =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && goal !== null) ||
    (step === 2 && level !== null) ||
    step === 3;

  const ProgressDots = () => (
    <View style={styles.progressRow}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            { flex: i <= step ? 2 : 1 },
            i <= step && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );

  // Step 0: Welcome
  const renderStep0 = () => (
    <View style={styles.stepCenter}>
      <LinearGradient
        colors={[colors.primary, colors.indigo, colors.violet]}
        style={styles.logoMark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Zap size={48} color="#fff" fill="#fff" />
      </LinearGradient>
      <Text style={styles.appName}>
        Gym<Text style={styles.appNameAccent}>Pulse</Text>
      </Text>
      <Text style={styles.tagline}>
        Track it. Check it. <Text style={styles.taglineBold}>Crush it.</Text>
      </Text>
      <View style={styles.welcomeFeatures}>
        {[
          { emoji: "📊", label: "Track Progress" },
          { emoji: "🏋️", label: "Log Workouts" },
          { emoji: "🏆", label: "Crush PRs" },
        ].map((f) => (
          <View key={f.label} style={styles.welcomeFeature}>
            <Text style={styles.welcomeFeatureEmoji}>{f.emoji}</Text>
            <Text style={styles.welcomeFeatureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.nameLabel}>What should we call you?</Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="words"
        autoFocus
        testID="name-input"
      />
    </View>
  );

  // Step 1: Goal
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        What's your{"\n"}
        <Text style={styles.stepTitleAccent}>mission</Text>?
      </Text>
      <Text style={styles.stepSubtitle}>We'll shape your experience around it.</Text>
      <View style={styles.optionList}>
        {GOALS.map((g) => {
          const selected = goal === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.optionCard,
                selected && { borderColor: g.color, borderWidth: 2, backgroundColor: `${g.color}18` },
              ]}
              onPress={() => {
                setGoal(g.key);
                if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
              testID={`goal-${g.key}`}
            >
              <View style={[styles.optionEmoji, selected && { backgroundColor: `${g.color}20` }]}>
                <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>{g.label}</Text>
                <Text style={styles.optionDesc}>{g.desc}</Text>
              </View>
              {selected && (
                <LinearGradient
                  colors={[g.color, `${g.color}dd`]}
                  style={styles.optionCheck}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Check size={14} color="#fff" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Step 2: Experience
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        Your{"\n"}
        <Text style={styles.stepTitleAccent2}>experience</Text>?
      </Text>
      <Text style={styles.stepSubtitle}>No judgment — just calibration.</Text>
      <View style={styles.optionList}>
        {LEVELS.map((x) => {
          const selected = level === x.key;
          return (
            <TouchableOpacity
              key={x.key}
              style={[
                styles.optionCard,
                styles.optionCardLarge,
                selected && { borderColor: x.color, borderWidth: 2, backgroundColor: `${x.color}18` },
              ]}
              onPress={() => {
                setLevel(x.key);
                if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
              testID={`level-${x.key}`}
            >
              <View style={[styles.optionEmojiLg, selected && { backgroundColor: `${x.color}20` }]}>
                <Text style={{ fontSize: 30 }}>{x.emoji}</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabelLg}>{x.label}</Text>
                <Text style={styles.optionDesc}>{x.desc}</Text>
              </View>
              {selected && (
                <LinearGradient
                  colors={[x.color, `${x.color}dd`]}
                  style={styles.optionCheck}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Check size={14} color="#fff" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Step 3: Training days
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        How many{"\n"}
        <Text style={styles.stepTitleAccent3}>days</Text> a week?
      </Text>
      <Text style={styles.stepSubtitle}>Pick your rhythm. You can always change this.</Text>
      <View style={styles.daysRow}>
        {[2, 3, 4, 5, 6, 7].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => {
              setTrainingDays(d);
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            testID={`days-${d}`}
          >
            {trainingDays === d ? (
              <LinearGradient
                colors={[colors.primary, colors.indigo]}
                style={[styles.dayButton, styles.dayButtonActive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.dayButtonTextActive}>{d}</Text>
                <Text style={styles.dayButtonSubtext}>days</Text>
              </LinearGradient>
            ) : (
              <View style={styles.dayButton}>
                <Text style={styles.dayButtonText}>{d}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {step > 0 && (
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.progressRowWrap}>
            <ProgressDots />
          </View>
          <View style={{ width: 36 }} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {step === 0 && renderStep0()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        onPress={handleNext}
        disabled={!canProceed}
        testID="next-button"
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            step === 3
              ? [colors.primary, colors.indigo, colors.violet]
              : [colors.primary, colors.indigo]
          }
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.nextButtonText}>
            {step === 0 ? "Get Started →" : step === 3 ? "Let's Crush It 🔥" : "Continue"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  progressRowWrap: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressDot: {
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
  },
  progressDotActive: {
    backgroundColor: colors.indigo,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  stepCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  stepContainer: {
    flex: 1,
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 48,
    elevation: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  appNameAccent: {
    color: colors.indigo,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  taglineBold: {
    fontWeight: "700" as const,
    color: colors.text,
  },
  welcomeFeatures: {
    flexDirection: "row",
    gap: 12,
    marginTop: 36,
    marginBottom: 36,
  },
  welcomeFeature: {
    alignItems: "center",
    backgroundColor: colors.glassBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  welcomeFeatureEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  welcomeFeatureLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.2,
  },
  nameLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  nameInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: 18,
    padding: 16,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    textAlign: "center",
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 4,
  },
  stepTitleAccent: {
    color: colors.primary,
  },
  stepTitleAccent2: {
    color: colors.violet,
  },
  stepTitleAccent3: {
    color: colors.cyan,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 22,
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  optionCardLarge: {
    padding: 18,
  },
  optionEmoji: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  optionEmojiLg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  optionLabelLg: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 1,
  },
  optionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  dayButton: {
    width: 50,
    height: 62,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dayButtonActive: {
    borderWidth: 0,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  dayButtonText: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.text,
  },
  dayButtonTextActive: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
  },
  dayButtonSubtext: {
    fontSize: 7,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
});
