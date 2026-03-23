import React, { useState, useRef, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Zap, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile } from "@/types";

const GOALS: { key: FitnessGoal; label: string; emoji: string; desc: string; color: string }[] = [
  { key: "build_muscle", label: "Build Muscle", emoji: "💪", desc: "Hypertrophy focused", color: Colors.primary },
  { key: "lose_weight", label: "Lose Weight", emoji: "🔥", desc: "Cut & lean out", color: Colors.rose },
  { key: "stay_active", label: "Stay Active", emoji: "🏃", desc: "General fitness", color: Colors.emerald },
  { key: "get_stronger", label: "Get Stronger", emoji: "⚡", desc: "Strength & power", color: Colors.amber },
];

const LEVELS: { key: ExperienceLevel; label: string; emoji: string; desc: string; color: string }[] = [
  { key: "beginner", label: "Beginner", emoji: "🌱", desc: "Just getting started", color: Colors.emerald },
  { key: "intermediate", label: "Intermediate", emoji: "⚡", desc: "1-3 years training", color: Colors.amber },
  { key: "advanced", label: "Advanced", emoji: "🏆", desc: "3+ years structured", color: Colors.rose },
];

export default function OnboardingScreen() {
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

  const handleNext = useCallback(() => {
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
    step === 0 ||
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
        colors={[Colors.primary, Colors.indigo, Colors.violet]}
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
      <View style={styles.welcomeStats}>
        {[{ n: "156", l: "Workouts" }, { n: "12", l: "Streak" }, { n: "847", l: "Exercises" }].map((s) => (
          <View key={s.l} style={styles.welcomeStat}>
            <Text style={styles.welcomeStatValue}>{s.n}</Text>
            <Text style={styles.welcomeStatLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        placeholderTextColor={Colors.textTertiary}
        autoCapitalize="words"
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
                colors={[Colors.primary, Colors.indigo]}
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
      {step > 0 && <ProgressDots />}

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
              ? [Colors.primary, Colors.indigo, Colors.violet]
              : [Colors.primary, Colors.indigo]
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  progressDot: {
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(99,102,241,0.12)",
  },
  progressDotActive: {
    backgroundColor: Colors.indigo,
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
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 48,
    elevation: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  appNameAccent: {
    color: Colors.indigo,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  taglineBold: {
    fontWeight: "700" as const,
    color: Colors.text,
  },
  welcomeStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 36,
    marginBottom: 36,
  },
  welcomeStat: {
    alignItems: "center",
  },
  welcomeStatValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  welcomeStatLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  nameInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.15)",
    borderRadius: 18,
    padding: 16,
    fontSize: 17,
    color: Colors.text,
    backgroundColor: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 4,
  },
  stepTitleAccent: {
    color: Colors.primary,
  },
  stepTitleAccent2: {
    color: Colors.violet,
  },
  stepTitleAccent3: {
    color: Colors.cyan,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 22,
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  optionCardLarge: {
    padding: 18,
  },
  optionEmoji: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(99,102,241,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionEmojiLg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(99,102,241,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  optionLabelLg: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
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
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  dayButtonActive: {
    borderWidth: 0,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  dayButtonText: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
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
    shadowColor: Colors.indigo,
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
