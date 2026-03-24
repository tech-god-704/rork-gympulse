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
import { Flame, Target, Play, X, Clock, Dumbbell, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { type ColorScheme } from "@/constants/colors";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import { getTodayWeekDay, getToday, formatDate } from "@/utils/helpers";
import { WeekDay } from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import ProgressRing from "@/components/ProgressRing";
import RestTimer from "@/components/RestTimer";
import ConfettiOverlay from "@/components/ConfettiOverlay";

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

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
    completeWorkout,
    cancelWorkout,
    getWorkoutsThisWeek,
    refreshData,
    history,
    lastPerformance,
    personalRecords,
    settings,
  } = useGym();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(settings.defaultRestTimer);

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState({ exercises: 0, duration: 0, expectedStreak: 0, totalVolume: 0, newPRs: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 5;
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);

  // Find today's scheduled routine
  const todayWeekDay = getTodayWeekDay() as WeekDay;
  const todaysRoutine = useMemo(() => {
    return routines.find((r) => r.scheduledDays?.includes(todayWeekDay));
  }, [routines, todayWeekDay]);

  const completedCount = useMemo(
    () => currentSession?.exercises.filter((e) => e.completed).length ?? 0,
    [currentSession]
  );
  const totalCount = currentSession?.exercises.length ?? 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  // Total volume lifted (weight x reps for completed sets)
  const totalVolume = useMemo(() => {
    if (!currentSession) return 0;
    return currentSession.exercises.reduce((vol, ex) => {
      const sets = ex.setDetails || [];
      return vol + sets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);
    }, 0);
  }, [currentSession]);

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
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const triggerCompletionCheck = useCallback((allComplete: boolean) => {
    if (allComplete) {
      const startTime = currentSession ? new Date(currentSession.startedAt).getTime() : Date.now();
      const duration = Math.round((Date.now() - startTime) / 60000);
      // Calculate expected streak after this workout completes
      const today = getToday();
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yesterday = formatDate(yd);
      let expectedStreak = streak.currentStreak;
      if (streak.lastWorkoutDate === today) {
        // already counted today
      } else if (streak.lastWorkoutDate === yesterday || streak.lastWorkoutDate === null) {
        expectedStreak = streak.currentStreak + 1;
      } else {
        expectedStreak = 1;
      }
      // Calculate volume and PR count for this workout
      let sessionVolume = 0;
      let sessionPRs = 0;
      if (currentSession) {
        currentSession.exercises.forEach((ex) => {
          const sets = ex.setDetails || [];
          sets.forEach((s) => {
            if (s.completed) {
              sessionVolume += s.weight * s.reps;
              if (s.weight > 0) {
                const est1RM = s.weight * (1 + s.reps / 30);
                const existing = personalRecords[ex.exerciseName];
                if (!existing || est1RM > existing.estimated1RM) {
                  sessionPRs++;
                }
              }
            }
          });
        });
      }
      setCompletionStats({
        exercises: totalCount,
        duration: Math.max(duration, 1),
        expectedStreak,
        totalVolume: sessionVolume,
        newPRs: sessionPRs,
      });
      setTimeout(() => {
        if (settings.showConfetti) {
          setShowConfetti(true);
        } else {
          // Skip confetti, go straight to completing
          completeWorkout();
        }
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 400);
    }
  }, [currentSession, totalCount, streak, personalRecords, settings.showConfetti, completeWorkout]);

  const handleToggleExercise = useCallback(
    (routineExerciseId: string) => {
      const allComplete = toggleExerciseComplete(routineExerciseId);
      triggerCompletionCheck(allComplete);
    },
    [toggleExerciseComplete, triggerCompletionCheck]
  );

  const handleToggleSet = useCallback(
    (routineExerciseId: string, setNumber: number) => {
      const allComplete = toggleSetComplete(routineExerciseId, setNumber);
      triggerCompletionCheck(allComplete);
    },
    [toggleSetComplete, triggerCompletionCheck]
  );

  const handleUpdateSetWeight = useCallback(
    (routineExerciseId: string, setNumber: number, weight: number) => {
      updateSetWeight(routineExerciseId, setNumber, weight);
    },
    [updateSetWeight]
  );

  const handleSkipExercise = useCallback(
    (routineExerciseId: string) => {
      skipExercise(routineExerciseId);
    },
    [skipExercise]
  );

  const handleRestTimer = useCallback(
    (seconds?: number) => {
      if (!routineRestEnabled) return;
      setRestTimerDuration(seconds ?? activeRoutine?.restTimerDuration ?? 60);
      setShowRestTimer(true);
    },
    [routineRestEnabled, activeRoutine?.restTimerDuration]
  );

  const handleDismissConfetti = useCallback(() => {
    setShowConfetti(false);
    completeWorkout();
  }, [completeWorkout]);

  const handleStartWorkout = useCallback(
    (routineId: string) => {
      const routine = routines.find((r) => r.id === routineId);
      if (routine) {
        startWorkout(routine);
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    [routines, startWorkout]
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.statCard}>
            <View
              style={[styles.statIconBg, { backgroundColor: colors.amberLight }]}
            >
              <Flame size={22} color={colors.amber} />
            </View>
            <View>
              <Text style={styles.statValue}>{streak.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statIconBg, { backgroundColor: colors.primaryUltraLight }]}
            >
              <Target size={22} color={colors.indigo} />
            </View>
            <View>
              <Text style={styles.statValue}>{workoutsThisWeek}/{weeklyGoal}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {currentSession ? (
          <View>
            {/* Hero Workout Card */}
            <View
              style={[styles.heroCard, { backgroundColor: colors.primary }]}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroLabel}>TODAY'S WORKOUT</Text>
                  <Text style={styles.heroTitle}>{currentSession.routineName}</Text>
                  <View style={styles.heroProgressRow}>
                    <View style={styles.heroProgressBg}>
                      <View style={[styles.heroProgressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.heroProgressText}>{completedCount}/{totalCount}</Text>
                  </View>
                  <View style={styles.heroMetaRow}>
                    {elapsedSeconds > 0 && (
                      <View style={styles.heroTimerRow}>
                        <Clock size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.heroTimerText}>
                          {elapsedMinutes > 0 ? `${elapsedMinutes} min` : `${elapsedSeconds}s`}
                        </Text>
                      </View>
                    )}
                    {totalVolume > 0 && (
                      <Text style={styles.heroTimerText}>
                        {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume} {settings.weightUnit}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.heroRingContainer}>
                  <ProgressRing progress={progress} completed={completedCount} total={totalCount} />
                </View>
              </View>
            </View>

            {/* Exercises */}
            <View style={styles.exerciseSection}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseSectionTitle}>Exercises</Text>
                <Text style={styles.exerciseCount}>{completedCount} of {totalCount}</Text>
              </View>
              <View style={styles.exerciseList}>
                {currentSession.exercises.map((exercise, index) => (
                  <ExerciseCard
                    key={exercise.routineExerciseId}
                    exercise={exercise}
                    exerciseId={exercise.routineExerciseId}
                    index={index}
                    onToggle={handleToggleExercise}
                    onSkip={handleSkipExercise}
                    onRestTimer={handleRestTimer}
                    onToggleSet={handleToggleSet}
                    onUpdateSetWeight={handleUpdateSetWeight}
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
            >
              <X size={16} color={colors.error} />
              <Text style={styles.cancelText}>Cancel Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Last Workout Summary */}
            {history.length > 0 && (() => {
              const last = history[0];
              const lastVol = last.totalVolume ?? 0;
              const lastVolStr = lastVol >= 1000 ? `${(lastVol / 1000).toFixed(1)}k ${settings.weightUnit}` : lastVol > 0 ? `${lastVol} ${settings.weightUnit}` : "";
              return (
              <View style={styles.lastWorkoutCard}>
                <Text style={styles.lastWorkoutLabel}>LAST WORKOUT</Text>
                <Text style={styles.lastWorkoutName}>{last.routineName}</Text>
                <View style={styles.lastWorkoutMeta}>
                  <Text style={styles.lastWorkoutDetail}>
                    {last.exerciseCount} exercises · {last.duration}min{lastVolStr ? ` · ${lastVolStr}` : ""}
                  </Text>
                  <Text style={styles.lastWorkoutDate}>
                    {new Date(last.completedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                </View>
              </View>
              );
            })()}

            {/* Today's Scheduled Routine */}
            {todaysRoutine && todaysRoutine.exercises.length > 0 ? (() => {
              const tbg = todaysRoutine.color;
              const tDark = tbg ? getLuminance(tbg) < 0.55 : false;
              const tAltPlay = tbg ? isBlueish(tbg) : false;
              const tStartBg = tAltPlay ? "#FFFFFF" : colors.primary;
              const tStartTextColor = tAltPlay ? (tbg ?? colors.primary) : "#fff";
              return (
              <View>
                <Text style={styles.scheduledLabel}>TODAY'S PLAN</Text>
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
                      {todaysRoutine.exercises.length} exercises · ~{todaysRoutine.exercises.length * 5 + 10}min
                    </Text>
                  </View>
                  <View
                    style={[styles.startButton, { backgroundColor: tStartBg }]}
                  >
                    <Text style={[styles.startButtonText, { color: tStartTextColor }]}>Start</Text>
                  </View>
                </TouchableOpacity>
              </View>
              );
            })() : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No workout scheduled</Text>
                <Text style={styles.emptySubtitle}>Select a routine to begin</Text>
              </View>
            )}

            {routines.length > 0 ? (
              <View style={styles.routinesList}>
                {routines.filter((r) => r.id !== todaysRoutine?.id && r.exercises.length > 0).map((routine) => {
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
                  >
                    <View style={[styles.routineInitialBg, { backgroundColor: bg ? "rgba(255,255,255,0.25)" : colors.primaryUltraLight }]}>
                      <Text style={[styles.routineInitialText, { color: isRoutineDark ? "#fff" : colors.primary }]}>
                        {routine.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.routineCardLeft}>
                      <Text style={[styles.routineCardName, isRoutineDark && { color: "#fff" }]}>{routine.name}</Text>
                      <Text style={[styles.routineCardDetail, isRoutineDark && { color: "rgba(255,255,255,0.75)" }]}>
                        {routine.exercises.length} exercises · ~{routine.exercises.length * 5 + 10}min
                      </Text>
                    </View>
                    <View
                      style={[styles.playButton, { backgroundColor: playBg }]}
                    >
                      <Play size={18} color={playIconColor} fill={playIconColor} />
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
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
                >
                  <Text style={styles.emptyStateCtaText}>Get Started</Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <RestTimer visible={showRestTimer} onClose={() => setShowRestTimer(false)} initialDuration={restTimerDuration} alertType={routineRestAlert} />

      <ConfettiOverlay
        visible={showConfetti}
        exerciseCount={completionStats.exercises}
        duration={completionStats.duration}
        streak={completionStats.expectedStreak || streak.currentStreak}
        totalVolume={completionStats.totalVolume}
        newPRs={completionStats.newPRs}
        weightUnit={settings.weightUnit}
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
    paddingBottom: 40,
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
  statValue: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500" as const,
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
    color: "rgba(255,255,255,0.5)",
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
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600" as const,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroTimerText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500" as const,
  },
  heroRingContainer: {
    // ProgressRing renders here
  },
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
  },
  lastWorkoutDetail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: colors.textTertiary,
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
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
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
    fontSize: 13,
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
  },
  emptyStateCtaText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
