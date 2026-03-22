import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Target, Play, X, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import ExerciseCard from "@/components/ExerciseCard";
import ProgressRing from "@/components/ProgressRing";
import RestTimer from "@/components/RestTimer";
import ConfettiOverlay from "@/components/ConfettiOverlay";

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
    toggleSetComplete,
    updateSetWeight,
    completeWorkout,
    cancelWorkout,
    getWorkoutsThisWeek,
    refreshData,
    history,
  } = useGym();

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState({ exercises: 0, duration: 0, expectedStreak: 0 });
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 5;
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);

  const completedCount = useMemo(
    () => currentSession?.exercises.filter((e) => e.completed).length ?? 0,
    [currentSession]
  );
  const totalCount = currentSession?.exercises.length ?? 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

  // Live workout timer
  useEffect(() => {
    if (!currentSession) {
      setElapsedMinutes(0);
      return;
    }
    const updateElapsed = () => {
      const startTime = new Date(currentSession.startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setElapsedMinutes(elapsed);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [currentSession]);

  const triggerCompletionCheck = useCallback((allComplete: boolean) => {
    if (allComplete) {
      const startTime = currentSession ? new Date(currentSession.startedAt).getTime() : Date.now();
      const duration = Math.round((Date.now() - startTime) / 60000);
      // Calculate expected streak after this workout completes
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      let expectedStreak = streak.currentStreak;
      if (streak.lastWorkoutDate === today) {
        // already counted today
      } else if (streak.lastWorkoutDate === yesterday || streak.lastWorkoutDate === null) {
        expectedStreak = streak.currentStreak + 1;
      } else {
        expectedStreak = 1;
      }
      setCompletionStats({
        exercises: totalCount,
        duration: Math.max(duration, 1),
        expectedStreak,
      });
      setTimeout(() => {
        setShowConfetti(true);
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 400);
    }
  }, [currentSession, totalCount, streak]);

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
    cancelWorkout();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
                  {elapsedMinutes > 0 && (
                    <View style={styles.heroTimerRow}>
                      <Clock size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.heroTimerText}>{elapsedMinutes} min</Text>
                    </View>
                  )}
                </View>
                <View style={styles.heroRingContainer}>
                  <ProgressRing
                    progress={progress}
                    completed={completedCount}
                    total={totalCount}
                  />
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
                    onRestTimer={() => setShowRestTimer(true)}
                    onToggleSet={(setNumber) => handleToggleSet(exercise.routineExerciseId, setNumber)}
                    onUpdateSetWeight={(setNumber, weight) => handleUpdateSetWeight(exercise.routineExerciseId, setNumber, weight)}
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
            {history.length > 0 && (
              <View style={styles.lastWorkoutCard}>
                <Text style={styles.lastWorkoutLabel}>LAST WORKOUT</Text>
                <Text style={styles.lastWorkoutName}>{history[0].routineName}</Text>
                <View style={styles.lastWorkoutMeta}>
                  <Text style={styles.lastWorkoutDetail}>
                    {history[0].exerciseCount} exercises · {history[0].duration}min
                  </Text>
                  <Text style={styles.lastWorkoutDate}>
                    {new Date(history[0].completedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ready to train?</Text>
              <Text style={styles.emptySubtitle}>Pick a routine to start today's workout</Text>
            </View>

            {routines.length > 0 ? (
              <View style={styles.routinesList}>
                {routines.map((routine) => (
                  <TouchableOpacity
                    key={routine.id}
                    style={styles.routineCard}
                    onPress={() => handleStartWorkout(routine.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.routineCardLeft}>
                      <Text style={styles.routineCardName}>{routine.name}</Text>
                      <Text style={styles.routineCardDetail}>
                        {routine.exercises.length} exercises · ~{routine.exercises.length * 5 + 10}min
                      </Text>
                    </View>
                    <LinearGradient
                      colors={[Colors.primary, Colors.indigo]}
                      style={styles.playButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Play size={18} color={Colors.white} fill={Colors.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
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

      <RestTimer visible={showRestTimer} onClose={() => setShowRestTimer(false)} />

      <ConfettiOverlay
        visible={showConfetti}
        exerciseCount={completionStats.exercises}
        duration={completionStats.duration}
        streak={completionStats.expectedStreak || streak.currentStreak}
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
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1.2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    height: 5,
    width: 110,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heroProgressText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600" as const,
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
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
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
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
    borderRadius: 14,
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
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
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
