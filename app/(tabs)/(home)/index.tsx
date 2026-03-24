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
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Target, Play, X, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
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

  // Total volume lifted (weight × reps for completed sets)
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

  // Live workout timer
  useEffect(() => {
    if (!currentSession) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const startTime = new Date(currentSession.startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.indigo} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{dayName}, {monthDay}</Text>
          <Text style={styles.greeting}>Let's go, {firstName} 💪</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={["#FFFBEB", "#FEF3C7"]}
              style={styles.statIconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Flame size={22} color="#F59E0B" />
            </LinearGradient>
            <View>
              <Text style={styles.statValue}>{streak.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <LinearGradient
              colors={["#EEF2FF", "#E0E7FF"]}
              style={styles.statIconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Target size={22} color={Colors.indigo} />
            </LinearGradient>
            <View>
              <Text style={styles.statValue}>{workoutsThisWeek}/{weeklyGoal}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {currentSession ? (
          <View>
            {/* Hero Workout Card */}
            <LinearGradient
              colors={[Colors.primary, Colors.indigo, Colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroDecor1} />
              <View style={styles.heroDecor2} />
              <View style={styles.heroDecor3} />
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroLabel}>TODAY'S WORKOUT</Text>
                  <Text style={styles.heroTitle}>{currentSession.routineName} 🔥</Text>
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
            </LinearGradient>

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
                    index={index}
                    onToggle={() => handleToggleExercise(exercise.routineExerciseId)}
                    onSkip={() => skipExercise(exercise.routineExerciseId)}
                    onRestTimer={(seconds) => {
                      if (!routineRestEnabled) return;
                      setRestTimerDuration(seconds ?? activeRoutine?.restTimerDuration ?? 60);
                      setShowRestTimer(true);
                    }}
                    onToggleSet={(setNumber) => handleToggleSet(exercise.routineExerciseId, setNumber)}
                    onUpdateSetWeight={(setNumber, weight) => handleUpdateSetWeight(exercise.routineExerciseId, setNumber, weight)}
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
              <X size={16} color={Colors.error} />
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
              const tPlayColors: [string, string] = tAltPlay
                ? ["#FFFFFF", "#F0F0F0"]
                : [Colors.primary, Colors.indigo];
              const tStartTextColor = tAltPlay ? tbg : "#fff";
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
                  {todaysRoutine.emoji ? (
                    <Text style={styles.routineCardEmoji}>{todaysRoutine.emoji}</Text>
                  ) : null}
                  <View style={styles.routineCardLeft}>
                    <Text style={[styles.scheduledName, tDark && { color: "#fff" }]}>{todaysRoutine.name}</Text>
                    <Text style={[styles.routineCardDetail, tDark && { color: "rgba(255,255,255,0.75)" }]}>
                      {todaysRoutine.exercises.length} exercises · ~{todaysRoutine.exercises.length * 5 + 10}min
                    </Text>
                  </View>
                  <LinearGradient
                    colors={tPlayColors}
                    style={styles.startButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.startButtonText, { color: tStartTextColor }]}>Start</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              );
            })() : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Ready to train?</Text>
                <Text style={styles.emptySubtitle}>Pick a routine to start today's workout</Text>
              </View>
            )}

            {routines.length > 0 ? (
              <View style={styles.routinesList}>
                {routines.filter((r) => r.id !== todaysRoutine?.id && r.exercises.length > 0).map((routine) => {
                  const bg = routine.color;
                  const isDark = bg ? getLuminance(bg) < 0.55 : false;
                  const useAltPlay = bg ? isBlueish(bg) : false;
                  const playColors: [string, string] = useAltPlay
                    ? ["#FFFFFF", "#F0F0F0"]
                    : [Colors.primary, Colors.indigo];
                  const playIconColor = useAltPlay ? (bg ?? Colors.white) : Colors.white;
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
                    {routine.emoji ? (
                      <Text style={styles.routineCardEmoji}>{routine.emoji}</Text>
                    ) : null}
                    <View style={styles.routineCardLeft}>
                      <Text style={[styles.routineCardName, isDark && { color: "#fff" }]}>{routine.name}</Text>
                      <Text style={[styles.routineCardDetail, isDark && { color: "rgba(255,255,255,0.75)" }]}>
                        {routine.exercises.length} exercises · ~{routine.exercises.length * 5 + 10}min
                      </Text>
                    </View>
                    <LinearGradient
                      colors={playColors}
                      style={styles.playButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Play size={18} color={playIconColor} fill={playIconColor} />
                    </LinearGradient>
                  </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.createPrompt}
                onPress={() => router.push("/(tabs)/routines")}
                activeOpacity={0.7}
              >
                <Text style={styles.createPromptText}>Create your first routine →</Text>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textTertiary,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
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
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
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
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 48,
    elevation: 8,
  },
  heroDecor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroDecor3: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.04)",
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
    color: "#FFFFFF",
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
    color: Colors.text,
    letterSpacing: -0.5,
  },
  exerciseCount: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textTertiary,
  },
  exerciseList: {
    gap: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.error,
  },
  lastWorkoutCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 16,
  },
  lastWorkoutLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  lastWorkoutName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
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
    color: Colors.textTertiary,
  },
  lastWorkoutDate: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  scheduledLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.indigo,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  scheduledCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(99,102,241,0.06)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.15)",
    marginBottom: 16,
  },
  scheduledName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  startButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  routinesList: {
    gap: 12,
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  routineCardEmoji: {
    fontSize: 24,
    marginRight: 2,
  },
  routineCardLeft: {
    flex: 1,
  },
  routineCardName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  routineCardDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createPrompt: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderStyle: "dashed" as const,
  },
  createPromptText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
});
