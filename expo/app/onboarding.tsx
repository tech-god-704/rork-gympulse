import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, ChevronRight, Dumbbell, Zap, Trophy } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, UserProfile } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GOALS: { key: FitnessGoal; label: string; icon: React.ReactNode }[] = [
  { key: "build_muscle", label: "Build Muscle", icon: <Dumbbell size={22} color={Colors.primary} /> },
  { key: "lose_weight", label: "Lose Weight", icon: <Flame size={22} color={Colors.streakFlame} /> },
  { key: "stay_active", label: "Stay Active", icon: <Zap size={22} color={Colors.warning} /> },
  { key: "get_stronger", label: "Get Stronger", icon: <Trophy size={22} color={Colors.success} /> },
];

const LEVELS: { key: ExperienceLevel; label: string; desc: string }[] = [
  { key: "beginner", label: "Beginner", desc: "New to the gym" },
  { key: "intermediate", label: "Intermediate", desc: "1-3 years experience" },
  { key: "advanced", label: "Advanced", desc: "3+ years experience" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useGym();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState(4);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (nextStep: number) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleNext = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < 2) {
      animateTransition(step + 1);
    } else {
      const profile: UserProfile = {
        name: name.trim() || "Athlete",
        fitnessGoal: goal ?? "stay_active",
        experienceLevel: level ?? "beginner",
        trainingDaysPerWeek: trainingDays,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      completeOnboarding(profile);
      router.replace("/(tabs)/(home)");
    }
  }, [step, name, goal, level, trainingDays, animateTransition, completeOnboarding, router]);

  const canProceed =
    step === 0 || (step === 1 && name.trim().length > 0 && goal !== null && level !== null) || step === 2;

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeIconContainer}>
        <View style={styles.welcomeIconCircle}>
          <Dumbbell size={48} color={Colors.white} />
        </View>
      </View>
      <Text style={styles.appName}>GymPulse</Text>
      <Text style={styles.tagline}>Track it. Check it. Crush it.</Text>
      <Text style={styles.subtitle}>Your personal workout tracker that makes every rep count.</Text>
    </View>
  );

  const renderStep1 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.stepContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepTitle}>About You</Text>
        <Text style={styles.stepSubtitle}>Let's personalize your experience</Text>

        <Text style={styles.fieldLabel}>What's your name?</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
          testID="name-input"
        />

        <Text style={styles.fieldLabel}>Fitness Goal</Text>
        <View style={styles.optionsGrid}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.goalCard, goal === g.key && styles.goalCardActive]}
              onPress={() => {
                setGoal(g.key);
                if (Platform.OS !== "web") void Haptics.selectionAsync();
              }}
              testID={`goal-${g.key}`}
            >
              {g.icon}
              <Text style={[styles.goalLabel, goal === g.key && styles.goalLabelActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Experience Level</Text>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l.key}
            style={[styles.levelCard, level === l.key && styles.levelCardActive]}
            onPress={() => {
              setLevel(l.key);
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            testID={`level-${l.key}`}
          >
            <View>
              <Text style={[styles.levelLabel, level === l.key && styles.levelLabelActive]}>{l.label}</Text>
              <Text style={styles.levelDesc}>{l.desc}</Text>
            </View>
            {level === l.key && <View style={styles.levelCheck} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Training Schedule</Text>
      <Text style={styles.stepSubtitle}>How many days per week do you want to train?</Text>

      <Text style={styles.bigNumber}>{trainingDays}</Text>
      <Text style={styles.bigNumberLabel}>days per week</Text>

      <View style={styles.daysRow}>
        {[2, 3, 4, 5, 6, 7].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayPill, trainingDays === d && styles.dayPillActive]}
            onPress={() => {
              setTrainingDays(d);
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            testID={`days-${d}`}
          >
            <Text style={[styles.dayPillText, trainingDays === d && styles.dayPillTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
      >
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </Animated.View>

      <TouchableOpacity
        style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!canProceed}
        testID="next-button"
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>{step === 0 ? "Get Started" : step === 2 ? "Let's Go!" : "Continue"}</Text>
        <ChevronRight size={20} color={Colors.white} />
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
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cardBorder,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeIconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800" as const,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.primary,
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 24,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    color: Colors.text,
    backgroundColor: Colors.cardBackground,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalCard: {
    width: (SCREEN_WIDTH - 58) / 2,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryUltraLight,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  goalLabelActive: {
    color: Colors.primary,
  },
  levelCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryUltraLight,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  levelLabelActive: {
    color: Colors.primary,
  },
  levelDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  levelCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  bigNumber: {
    fontSize: 80,
    fontWeight: "800" as const,
    color: Colors.primary,
    textAlign: "center",
    marginTop: 40,
  },
  bigNumberLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  dayPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  dayPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayPillText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dayPillTextActive: {
    color: Colors.white,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700" as const,
  },
});
