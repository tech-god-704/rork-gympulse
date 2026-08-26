import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Target, Play, X, Clock, Dumbbell, ChevronRight, CheckCircle2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { type ColorScheme } from "@/constants/colors";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import {
  getTodayWeekDay,
  getToday,
  estimateRoutineDuration,
  formatRelativeDate,
  formatClock,
} from "@/utils/helpers";
import { WeekDay, Routine, WorkoutHistory } from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import ProgressRing from "@/components/ProgressRing";
import RestTimer from "@/components/RestTimer";
import ConfettiOverlay from "@/components/ConfettiOverlay";
import XPBar from "@/components/XPBar";
import {
  getStreakMultiplier,
  getLevelDefinition,
  getAchievementById,
  calculateXPGain,
  getLevelForXP,
  buildAchievementContext,
  checkAchievements,
} from "@/utils/gamification";
import { summarizeSession, sessionProgress, streakFromDates } from "@/utils/workoutStats";
import { formatVolume } from "@/utils/units";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isBlueish(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return b > 150 && b > r * 1.3 && b > g * 1.2;
}

interface CompletionStats {
  exercises: number;
  duration: number;
  expectedStreak: number;
  totalVolume: number;
  newPRs: number;
  xpGained: number;
  streakMultiplier: number;
  leveledUp: boolean;
  newLevel: number;
  newLevelTitle: string;
  newAchievementNames: string[];
}

const EMPTY_STATS: CompletionStats = {
  exercises: 0,
  duration: 0,
  expectedStreak: 0,
  totalVolume: 0,
  newPRs: 0,
  xpGained: 0,
  streakMultiplier: 1,
  leveledUp: false,
  newLevel: 0,
  newLevelTitle: "",
  newAchievementNames: [],
};

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const {
    profile,
    routines,
    currentSession,
    streak,
    startWorkout,
    toggleExerciseComplete,
    skipExercise,
    toggleSetComplete,
    updateSetWeight,
    updateSetReps,
    addSetToExercise,
    removeSetFromExercise,
    completeWorkout,
    cancelWorkout,
    getLiveSession,
    getWorkoutsThisWeek,
    refreshData,
    history,
    lastPerformance,
    personalRecords,
    settings,
    gamification,
    shouldShowPaywall,
  } = useGym();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(settings.defaultRestTimer);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats>(EMPTY_STATS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Per-routine rest timer overrides
  const activeRoutine = useMemo(() => {
    if (!currentSession) return null;
    return routines.find((r) => r.id === currentSession.routineId) ?? null;
  }, [currentSession, routines]);
  const routineRestEnabled = activeRoutine?.restTimerEnabled !== false;
  const routineRestAlert = activeRoutine?.restTimerAlert ?? "vibrate";

  // Build per-exercise color lookup: exercise.color > routine.color > undefined
  const exerciseColorMap = useMemo(() => {
    if (!activeRoutine) return {} as Record<string, string | undefined>;
    const map: Record<string, string | undefined> = {};
    activeRoutine.exercises.forEach((e) => {
      map[e.id] = e.color || activeRoutine.color;
    });
    return map;
  }, [activeRoutine]);

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 5;
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);

  // Find today's scheduled routine
  const todayWeekDay = getTodayWeekDay() as WeekDay;
  const todaysRoutine = useMemo(() => {
    return routines.find((r) => r.scheduledDays?.includes(todayWeekDay));
  }, [routines, todayWeekDay]);

  // Progress is measured in sets, not exercises — a 5-exercise workout with
  // 3 of 4 sets done on each is 75% through, not 0%.
  const progress = useMemo(() => sessionProgress(currentSession), [currentSession]);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

  // Live workout timer -- depend only on startedAt (stable during a workout)
  // to avoid re-creating the interval on every set toggle
  const sessionStartedAt = currentSession?.startedAt;
  useEffect(() => {
    if (!sessionStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = new Date(sessionStartedAt).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  /**
   * Preview the exact figures `completeWorkout` is about to record.
   * Both paths run `summarizeSession`, so the celebration can no longer
   * advertise volume, PRs or XP that were never awarded.
   */
  const triggerCompletionCheck = useCallback(
    (allComplete: boolean) => {
      // Read through the ref: `currentSession` is still the pre-toggle value on
      // the tick where the final set is checked off, which would drop that set
      // from every number shown in the celebration.
      const session = getLiveSession() ?? currentSession;
      if (!allComplete || !session) return;

      const todayIso = getToday();
      const summary = summarizeSession(session, personalRecords, { today: todayIso });

      // Every exercise skipped: nothing was performed, so there is nothing to
      // celebrate and nothing gets logged.
      if (summary.completedSets === 0) {
        completeWorkout();
        Alert.alert(
          "Nothing logged",
          "Every exercise was skipped, so this session wasn't added to your history."
        );
        return;
      }

      const projectedDates = [...new Set([...streak.completedDates, todayIso])];
      const expectedStreak = streakFromDates(projectedDates, todayIso).currentStreak;

      const xpBreakdown = calculateXPGain(
        summary.completedSets,
        summary.newPRCount,
        summary.totalVolume,
        expectedStreak
      );
      const previewTotalXP = gamification.totalXP + xpBreakdown.total;
      const previewLevel = getLevelForXP(previewTotalXP);

      // Same provisional entry the provider will persist, so achievement
      // unlocks shown here are the ones that actually fire.
      const provisionalEntry: WorkoutHistory = {
        id: "preview",
        routineId: session.routineId,
        routineName: session.routineName,
        completedAt: new Date().toISOString(),
        exerciseCount: summary.exerciseCount,
        completedExercises: summary.completedExercises,
        duration: summary.durationMinutes,
        totalVolume: summary.totalVolume,
        muscleGroups: summary.muscleGroups,
        exercises: summary.exercises,
        newPRs: summary.newPRCount,
      };
      const ctx = buildAchievementContext(
        [provisionalEntry, ...history],
        {
          currentStreak: expectedStreak,
          longestStreak: Math.max(streak.longestStreak, expectedStreak),
          lastWorkoutDate: todayIso,
          completedDates: projectedDates,
        },
        { ...personalRecords, ...summary.prUpdates },
        previewLevel,
        summary.totalVolume,
        summary.newPRCount
      );
      const unlockedNames = checkAchievements(
        ctx,
        gamification.achievements.map((a) => a.id)
      )
        .map((id) => getAchievementById(id)?.name)
        .filter((n): n is string => Boolean(n));

      setCompletionStats({
        exercises: summary.completedExercises,
        duration: summary.durationMinutes,
        expectedStreak,
        totalVolume: summary.totalVolume,
        newPRs: summary.newPRCount,
        xpGained: xpBreakdown.total,
        streakMultiplier: xpBreakdown.consistencyMultiplier,
        leveledUp: previewLevel > gamification.level,
        newLevel: previewLevel,
        newLevelTitle: getLevelDefinition(previewLevel).title,
        newAchievementNames: unlockedNames,
      });

      setTimeout(() => {
        if (settings.showConfetti) {
          setShowConfetti(true);
        } else {
          completeWorkout();
        }
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 400);
    },
    [currentSession, getLiveSession, streak, personalRecords, history, settings.showConfetti, completeWorkout, gamification]
  );

  const handleToggleExercise = useCallback(
    (routineExerciseId: string) => {
      triggerCompletionCheck(toggleExerciseComplete(routineExerciseId));
    },
    [toggleExerciseComplete, triggerCompletionCheck]
  );

  const handleToggleSet = useCallback(
    (routineExerciseId: string, setNumber: number) => {
      triggerCompletionCheck(toggleSetComplete(routineExerciseId, setNumber));
    },
    [toggleSetComplete, triggerCompletionCheck]
  );

  const handleRestTimer = useCallback(
    (seconds?: number) => {
      if (!routineRestEnabled) return;
      setRestTimerDuration(seconds ?? activeRoutine?.restTimerDuration ?? settings.defaultRestTimer);
      setShowRestTimer(true);
    },
    [routineRestEnabled, activeRoutine?.restTimerDuration, settings.defaultRestTimer]
  );

  const handleDismissConfetti = useCallback(() => {
    setShowConfetti(false);
    completeWorkout();
    if (shouldShowPaywall()) {
      setTimeout(() => router.push("/paywall"), 600);
    }
  }, [completeWorkout, shouldShowPaywall, router]);

  const beginWorkout = useCallback(
    (routine: Routine) => {
      const started = startWorkout(routine);
      if (!started) {
        Alert.alert("Nothing to do yet", "Add at least one exercise to this routine before starting it.");
        return;
      }
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [startWorkout]
  );

  const handleStartWorkout = useCallback(
    (routineId: string) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;
      // Starting a second workout would silently discard the first.
      if (currentSession) {
        Alert.alert(
          "Workout in progress",
          `“${currentSession.routineName}” is still running. Starting a new one discards it.`,
          [
            { text: "Keep current", style: "cancel" },
            { text: "Discard & start", style: "destructive", onPress: () => beginWorkout(routine) },
          ]
        );
        return;
      }
      beginWorkout(routine);
    },
    [routines, currentSession, beginWorkout]
  );

  const handleCancelWorkout = useCallback(() => {
    Alert.alert(
      "Cancel Workout",
      "Are you sure? All progress for this session will be lost.",
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: () => {
            cancelWorkout();
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
      ]
    );
  }, [cancelWorkout]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshData]);

  const routineMeta = useCallback((routine: Routine) => {
    const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
    const mins = estimateRoutineDuration(routine.exercises.length, setCount);
    return `${routine.exercises.length} exercises · ${setCount} sets · ~${mins} min`;
  }, []);

  const lastWorkout = history[0];
  const trainedToday =
    lastWorkout != null &&
    new Date(lastWorkout.completedAt).toDateString() === new Date().toDateString();
  const otherRoutines = routines.filter((r) => r.id !== todaysRoutine?.id && r.exercises.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{dayName}, {monthDay}</Text>
          <Text style={styles.greeting}>Welcome back, {firstName}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View
            style={styles.statCard}
            accessible
            accessibilityLabel={`Current streak: ${streak.currentStreak} days`}
          >
            <View style={[styles.statIconBg, { backgroundColor: colors.amberLight }]}>
              <Flame size={22} color={colors.amber} />
            </View>
            <View style={styles.statText}>
              <Text style={styles.statValue} numberOfLines={1}>
                {streak.currentStreak}
                {streak.currentStreak >= 3 && (
                  <Text style={[styles.statMultiplier, { color: colors.amber }]}>
                    {" "}{getStreakMultiplier(streak.currentStreak)}x
                  </Text>
                )}
              </Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
          <View
            style={styles.statCard}
            accessible
            accessibilityLabel={`${workoutsThisWeek} of ${weeklyGoal} training days this week`}
          >
            <View style={[styles.statIconBg, { backgroundColor: colors.primaryUltraLight }]}>
              <Target size={22} color={colors.indigo} />
            </View>
            <View style={styles.statText}>
              <Text style={styles.statValue} numberOfLines={1}>{workoutsThisWeek}/{weeklyGoal}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {/* XP Progress Bar */}
        <View style={styles.xpCard}>
          <XPBar totalXP={gamification.totalXP} level={gamification.level} compact />
        </View>

        {currentSession ? (
          <View>
            {/* Hero Workout Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroLabel}>TODAY&apos;S WORKOUT</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>{currentSession.routineName}</Text>
                  <View style={styles.heroProgressRow}>
                    <View style={styles.heroProgressBg}>
                      <View style={[styles.heroProgressFill, { width: `${progress.fraction * 100}%` }]} />
                    </View>
                    <Text style={styles.heroProgressText}>
                      {progress.completedSets}/{progress.totalSets}
                    </Text>
                  </View>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroTimerRow}>
                      <Clock size={12} color="rgba(255,255,255,0.55)" />
                      <Text style={styles.heroTimerText}>{formatClock(elapsedSeconds)}</Text>
                    </View>
                    <View style={styles.heroTimerRow}>
                      <CheckCircle2 size={12} color="rgba(255,255,255,0.55)" />
                      <Text style={styles.heroTimerText}>
                        {progress.completedExercises}/{progress.totalExercises} done
                      </Text>
                    </View>
                    {progress.volume > 0 && (
                      <Text style={styles.heroTimerText}>
                        {formatVolume(progress.volume, settings.weightUnit)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.heroRingContainer}>
                  <ProgressRing
                    progress={progress.fraction}
                    completed={progress.completedSets}
                    total={progress.totalSets}
                  />
                </View>
              </View>
            </View>

            {/* Exercises */}
            <View style={styles.exerciseSection}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseSectionTitle}>Exercises</Text>
                <Text style={styles.exerciseCount}>
                  {progress.completedExercises} of {progress.totalExercises}
                </Text>
              </View>
              <View style={styles.exerciseList}>
                {currentSession.exercises.map((exercise, index) => (
                  <ExerciseCard
                    key={exercise.routineExerciseId}
                    exercise={exercise}
                    exerciseId={exercise.routineExerciseId}
                    index={index}
                    onToggle={handleToggleExercise}
                    onSkip={skipExercise}
                    onRestTimer={handleRestTimer}
                    onToggleSet={handleToggleSet}
                    onUpdateSetWeight={updateSetWeight}
                    onUpdateSetReps={updateSetReps}
                    onAddSet={addSetToExercise}
                    onRemoveSet={removeSetFromExercise}
                    previousPerformance={lastPerformance[exercise.exerciseName]}
                    personalRecord={personalRecords[exercise.exerciseName]}
                    weightUnit={settings.weightUnit}
                    defaultRestTimer={activeRoutine?.restTimerDuration ?? settings.defaultRestTimer}
                    autoStartRestTimer={routineRestEnabled && settings.autoStartRestTimer}
                    accentColor={exerciseColorMap[exercise.routineExerciseId]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelWorkout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel this workout"
            >
              <X size={16} color={colors.error} />
              <Text style={styles.cancelText}>Cancel Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Last Workout Summary */}
            {lastWorkout && (
              <View style={styles.lastWorkoutCard}>
                <Text style={styles.lastWorkoutLabel}>LAST WORKOUT</Text>
                <Text style={styles.lastWorkoutName}>{lastWorkout.routineName}</Text>
                <View style={styles.lastWorkoutMeta}>
                  <Text style={styles.lastWorkoutDetail}>
                    {lastWorkout.completedExercises ?? lastWorkout.exerciseCount} exercises · {lastWorkout.duration}min
                    {lastWorkout.totalVolume
                      ? ` · ${formatVolume(lastWorkout.totalVolume, settings.weightUnit)}`
                      : ""}
                  </Text>
                  <Text style={styles.lastWorkoutDate}>
                    {formatRelativeDate(lastWorkout.completedAt)}
                  </Text>
                </View>
              </View>
            )}

            {/* Today's Scheduled Routine */}
            {todaysRoutine && todaysRoutine.exercises.length > 0 ? (() => {
              const tbg = todaysRoutine.color;
              const tDark = tbg ? getLuminance(tbg) < 0.55 : false;
              const tAltPlay = tbg ? isBlueish(tbg) : false;
              const tStartBg = tAltPlay ? "#FFFFFF" : colors.primary;
              const tStartTextColor = tAltPlay ? (tbg ?? colors.primary) : "#fff";
              return (
                <View>
                  <Text style={styles.scheduledLabel}>TODAY&apos;S PLAN</Text>
                  <TouchableOpacity
                    style={[
                      styles.scheduledCard,
                      tbg ? { backgroundColor: tbg, borderColor: tbg } : undefined,
                    ]}
                    onPress={() => handleStartWorkout(todaysRoutine.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Start workout: ${todaysRoutine.name}`}
                    accessibilityRole="button"
                  >
                    <View style={[styles.routineInitialBg, { backgroundColor: tbg ? "rgba(255,255,255,0.25)" : colors.primaryUltraLight }]}>
                      <Text style={[styles.routineInitialText, { color: tDark ? "#fff" : colors.primary }]}>
                        {todaysRoutine.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.routineCardLeft}>
                      <Text style={[styles.scheduledName, tDark && { color: "#fff" }]}>{todaysRoutine.name}</Text>
                      <Text style={[styles.routineCardDetail, tDark && { color: "rgba(255,255,255,0.75)" }]}>
                        {routineMeta(todaysRoutine)}
                      </Text>
                    </View>
                    <View style={[styles.startButton, { backgroundColor: tStartBg }]}>
                      <Text style={[styles.startButtonText, { color: tStartTextColor }]}>Start</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })() : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {trainedToday ? "Today's workout done" : "No workout scheduled"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {trainedToday
                    ? "Rest up, or start another routine below."
                    : routines.length > 0
                      ? "Pick a routine below to begin."
                      : "Create a routine to get started."}
                </Text>
              </View>
            )}

            {otherRoutines.length > 0 ? (
              <View style={styles.routinesList}>
                {otherRoutines.map((routine) => {
                  const bg = routine.color;
                  const isRoutineDark = bg ? getLuminance(bg) < 0.55 : false;
                  const useAltPlay = bg ? isBlueish(bg) : false;
                  const playBg = useAltPlay ? "#FFFFFF" : colors.primary;
                  const playIconColor = useAltPlay ? (bg ?? colors.white) : colors.white;
                  return (
                    <TouchableOpacity
                      key={routine.id}
                      style={[
                        styles.routineCard,
                        bg ? { backgroundColor: bg, borderColor: bg } : undefined,
                      ]}
                      onPress={() => handleStartWorkout(routine.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Start workout: ${routine.name}`}
                    >
                      <View style={[styles.routineInitialBg, { backgroundColor: bg ? "rgba(255,255,255,0.25)" : colors.primaryUltraLight }]}>
                        <Text style={[styles.routineInitialText, { color: isRoutineDark ? "#fff" : colors.primary }]}>
                          {routine.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.routineCardLeft}>
                        <Text style={[styles.routineCardName, isRoutineDark && { color: "#fff" }]}>{routine.name}</Text>
                        <Text style={[styles.routineCardDetail, isRoutineDark && { color: "rgba(255,255,255,0.75)" }]}>
                          {routineMeta(routine)}
                        </Text>
                      </View>
                      <View style={[styles.playButton, { backgroundColor: playBg }]}>
                        <Play size={18} color={playIconColor} fill={playIconColor} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : routines.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconRow}>
                  <View style={styles.emptyStateIconBg}>
                    <Dumbbell size={28} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.emptyStateHeading}>Build Your First Routine</Text>
                <Text style={styles.emptyStateBody}>
                  Create a custom workout or pick from popular splits like Push/Pull/Legs, Upper/Lower, and more.
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateCta}
                  onPress={() => router.push("/(tabs)/routines")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Get started building a routine"
                >
                  <Text style={styles.emptyStateCtaText}>Get Started</Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <RestTimer
        visible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        initialDuration={restTimerDuration}
        alertType={routineRestAlert}
      />

      <ConfettiOverlay
        visible={showConfetti}
        exerciseCount={completionStats.exercises}
        duration={completionStats.duration}
        streak={completionStats.expectedStreak || streak.currentStreak}
        totalVolume={completionStats.totalVolume}
        newPRs={completionStats.newPRs}
        weightUnit={settings.weightUnit}
        xpGained={completionStats.xpGained}
        streakMultiplier={completionStats.streakMultiplier}
        leveledUp={completionStats.leveledUp}
        newLevel={completionStats.newLevel}
        newLevelTitle={completionStats.newLevelTitle}
        newAchievementNames={completionStats.newAchievementNames}
        onDismiss={handleDismissConfetti}
      />
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 28,
  },
  statMultiplier: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500" as const,
  },
  xpCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCard: {
    borderRadius: 12,
    padding: 22,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLeft: {
    flex: 1,
    marginRight: 16,
  },
  heroLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700" as const,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.white,
    marginTop: 6,
    letterSpacing: -0.8,
  },
  heroProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  heroProgressBg: {
    height: 10,
    width: 110,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heroProgressText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600" as const,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroTimerText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500" as const,
  },
  heroRingContainer: {},
  exerciseSection: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  exerciseSectionTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  exerciseCount: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textTertiary,
  },
  exerciseList: {
    gap: 10,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorLight,
    minHeight: 48,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.error,
  },
  lastWorkoutCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  lastWorkoutLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  lastWorkoutName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  lastWorkoutMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  lastWorkoutDetail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: colors.textTertiary,
    flexShrink: 1,
  },
  lastWorkoutDate: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500" as const,
  },
  scheduledLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.indigo,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  scheduledCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    marginBottom: 16,
  },
  scheduledName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  startButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  routinesList: {
    gap: 12,
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  routineInitialBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  routineInitialText: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  routineCardLeft: {
    flex: 1,
  },
  routineCardName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  routineCardDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyStateIconRow: {
    marginBottom: 16,
  },
  emptyStateIconBg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateHeading: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  emptyStateCta: {
    flexDirection: "row" as const,
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 6,
    minHeight: 48,
  },
  emptyStateCtaText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
