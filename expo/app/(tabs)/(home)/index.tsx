import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Play, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { getGreeting } from "@/utils/helpers";
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
    completeWorkout,
    cancelWorkout,
  } = useGym();

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState({ exercises: 0, duration: 0 });

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";

  const completedCount = useMemo(
    () => currentSession?.exercises.filter((e) => e.completed).length ?? 0,
    [currentSession]
  );
  const totalCount = currentSession?.exercises.length ?? 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const sortedExercises = useMemo(() => {
    if (!currentSession) return [];
    const incomplete = currentSession.exercises.filter((e) => !e.completed);
    const complete = currentSession.exercises.filter((e) => e.completed);
    return [...incomplete, ...complete];
  }, [currentSession]);

  const handleToggleExercise = useCallback(
    (routineExerciseId: string) => {
      const allComplete = toggleExerciseComplete(routineExerciseId);
      if (allComplete) {
        const startTime = currentSession ? new Date(currentSession.startedAt).getTime() : Date.now();
        const duration = Math.round((Date.now() - startTime) / 60000);
        setCompletionStats({
          exercises: totalCount,
          duration: Math.max(duration, 1),
        });
        setTimeout(() => {
          setShowConfetti(true);
          if (Platform.OS !== "web") {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, 400);
      }
    },
    [toggleExerciseComplete, currentSession, totalCount]
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName}! 💪</Text>
          </View>
          <View style={styles.streakBadge}>
            <Flame size={18} color={Colors.streakFlame} />
            <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
          </View>
        </View>

        {currentSession ? (
          <View>
            <View style={styles.workoutHeader}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{currentSession.routineName}</Text>
                <Text style={styles.workoutSubtitle}>
                  {completedCount} of {totalCount} exercises done
                </Text>
              </View>
              <ProgressRing
                progress={progress}
                completed={completedCount}
                total={totalCount}
              />
            </View>

            <View style={styles.exerciseList}>
              {sortedExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.routineExerciseId}
                  exercise={exercise}
                  onToggle={() => handleToggleExercise(exercise.routineExerciseId)}
                  onRestTimer={() => setShowRestTimer(true)}
                />
              ))}
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
                        {routine.exercises.length} exercises · ~{routine.exercises.length * 5}min
                      </Text>
                    </View>
                    <View style={styles.playButton}>
                      <Play size={18} color={Colors.white} fill={Colors.white} />
                    </View>
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
        streak={streak.currentStreak}
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  name: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.streakFlame,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  workoutInfo: {
    flex: 1,
    marginRight: 16,
  },
  workoutTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  workoutSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  exerciseList: {
    marginBottom: 16,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  routineCardLeft: {
    flex: 1,
  },
  routineCardName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  routineCardDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createPrompt: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.primaryUltraLight,
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
