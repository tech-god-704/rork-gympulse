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
import { Flame, Target, Play, X, Clock, Dumbbell, ChevronRight, CheckCircle2, Layers } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { type ColorScheme } from "@/constants/colors";
import {
  Layout,
  Motion,
  Radius,
  Space,
  Type,
  dominantMuscleColor,
  glow,
  muscleColor,
  numeric,
  onColor,
  surface,
  tint,
} from "@/constants/theme";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import {
  getTodayWeekDay,
  getToday,
  getGreeting,
  estimateRoutineDuration,
  formatRelativeDate,
  formatClock,
} from "@/utils/helpers";
import {
  WeekDay,
  Routine,
  WorkoutHistory,
  MUSCLE_GROUP_LABELS,
  MuscleGroup,
  DEFAULT_TRAINING_DAYS,
} from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import ProgressRing from "@/components/ProgressRing";
import RestTimer from "@/components/RestTimer";
import ConfettiOverlay from "@/components/ConfettiOverlay";
import XPBar from "@/components/XPBar";
import { Button, Card, EmptyState, ProgressBar, Screen, ScreenHeader, StatTile, Tag } from "@/components/ui";
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
import { formatVolume, formatWeight } from "@/utils/units";

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

  const activeRoutine = useMemo(() => {
    if (!currentSession) return null;
    return routines.find((r) => r.id === currentSession.routineId) ?? null;
  }, [currentSession, routines]);
  const routineRestEnabled = activeRoutine?.restTimerEnabled !== false;
  const routineRestAlert = activeRoutine?.restTimerAlert ?? "vibrate";

  const exerciseColorMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    if (!currentSession) return map;
    currentSession.exercises.forEach((e) => {
      const override = activeRoutine?.exercises.find((re) => re.id === e.routineExerciseId)?.color;
      // Fall back to the muscle-group palette so every card is colour-coded
      // even when the user hasn't picked a custom colour.
      map[e.routineExerciseId] = override ?? activeRoutine?.color ?? muscleColor(e.muscleGroup, colors);
    });
    return map;
  }, [currentSession, activeRoutine, colors]);

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";
  const weeklyGoal = profile?.trainingDaysPerWeek ?? DEFAULT_TRAINING_DAYS;
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);

  const todayWeekDay = getTodayWeekDay() as WeekDay;
  const todaysRoutine = useMemo(
    () => routines.find((r) => r.scheduledDays?.includes(todayWeekDay)),
    [routines, todayWeekDay]
  );

  const progress = useMemo(() => sessionProgress(currentSession), [currentSession]);

  /** The first exercise still needing work — what the user should do right now. */
  const upNext = useMemo(() => {
    if (!currentSession) return null;
    return currentSession.exercises.find((e) => !e.completed) ?? null;
  }, [currentSession]);

  const today = new Date();
  const dateLabel = today
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();

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
      const unlockedNames = checkAchievements(ctx, gamification.achievements.map((a) => a.id))
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
      }, Motion.slow);
    },
    [currentSession, getLiveSession, streak, personalRecords, history, settings.showConfetti, completeWorkout, gamification]
  );

  const handleToggleExercise = useCallback(
    (id: string) => triggerCompletionCheck(toggleExerciseComplete(id)),
    [toggleExerciseComplete, triggerCompletionCheck]
  );

  const handleToggleSet = useCallback(
    (id: string, setNumber: number) => triggerCompletionCheck(toggleSetComplete(id, setNumber)),
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
      if (!startWorkout(routine)) {
        Alert.alert("Nothing to do yet", "Add at least one exercise to this routine before starting it.");
        return;
      }
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [startWorkout]
  );

  const handleStartWorkout = useCallback(
    (routineId: string) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;
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
    Alert.alert("Cancel Workout", "Are you sure? All progress for this session will be lost.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Cancel Workout",
        style: "destructive",
        onPress: () => {
          cancelWorkout();
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  }, [cancelWorkout]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshData]);

  const describeRoutine = useCallback((routine: Routine) => {
    const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
    const mins = estimateRoutineDuration(routine.exercises.length, setCount);
    return `${routine.exercises.length} exercises · ${setCount} sets · ~${mins} min`;
  }, []);

  const routineGroups = useCallback(
    (routine: Routine): MuscleGroup[] => [...new Set(routine.exercises.map((e) => e.muscleGroup))],
    []
  );

  const lastWorkout = history[0];
  const trainedToday =
    lastWorkout != null &&
    new Date(lastWorkout.completedAt).toDateString() === new Date().toDateString();
  const otherRoutines = routines.filter(
    (r) => r.id !== todaysRoutine?.id && r.exercises.length > 0
  );

  // ── Routine card, shared by "today's plan" and the list below ──
  const renderRoutineCard = (routine: Routine, featured: boolean) => {
    const groups = routineGroups(routine);
    const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
    const fg = onColor(accent);

    return (
      <TouchableOpacity
        key={routine.id}
        style={[
          styles.routineCard,
          surface(colors, 1, Radius.md),
          featured && { borderColor: tint(accent, 0.45), borderWidth: 1.5 },
        ]}
        onPress={() => handleStartWorkout(routine.id)}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`Start ${routine.name}. ${describeRoutine(routine)}`}
      >
        <View style={[styles.routineMark, { backgroundColor: accent }]}>
          <Text style={[styles.routineMarkText, { color: fg }]}>
            {routine.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.routineInfo}>
          <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
          <Text style={styles.routineMeta} numberOfLines={1}>{describeRoutine(routine)}</Text>
          {groups.length > 0 && (
            <View style={styles.tagRow}>
              {groups.slice(0, 3).map((g) => (
                <Tag key={g} label={MUSCLE_GROUP_LABELS[g]} color={muscleColor(g, colors)} size="sm" />
              ))}
              {groups.length > 3 && (
                <Text style={styles.moreTags}>+{groups.length - 3}</Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.playButton, { backgroundColor: accent }, glow(accent, colors, 0.3)]}>
          <Play size={17} color={fg} fill={fg} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <ScreenHeader eyebrow={dateLabel} title={`${getGreeting()}, ${firstName}`} />

        <View style={styles.body}>
          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard} padding={Space.base - 2}>
              <StatTile
                value={streak.currentStreak}
                label="Day streak"
                color={colors.amber}
                icon={<Flame size={20} color={colors.amber} />}
                accessory={streak.currentStreak >= 3 ? `${getStreakMultiplier(streak.currentStreak)}x` : undefined}
              />
            </Card>
            <Card style={styles.statCard} padding={Space.base - 2}>
              <StatTile
                value={`${workoutsThisWeek}/${weeklyGoal}`}
                label="This week"
                color={colors.primary}
                icon={<Target size={20} color={colors.primary} />}
              />
            </Card>
          </View>

          {/* ── Level ── */}
          <Card padding={Space.base}>
            <XPBar totalXP={gamification.totalXP} level={gamification.level} compact />
          </Card>

          {currentSession ? (
            <>
              {/* ── Active workout hero ── */}
              <View
                style={[styles.hero, { backgroundColor: colors.primary }, glow(colors.primary, colors, 0.32)]}
              >
                <View style={styles.heroTop}>
                  <View style={styles.heroText}>
                    <View style={styles.liveRow}>
                      <View style={styles.liveDot} />
                      <Text style={styles.heroEyebrow}>IN PROGRESS</Text>
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {currentSession.routineName}
                    </Text>
                  </View>
                  <ProgressRing
                    progress={progress.fraction}
                    completed={progress.completedSets}
                    total={progress.totalSets}
                    size={68}
                    onDark
                  />
                </View>

                <ProgressBar
                  value={progress.fraction}
                  height={6}
                  color="rgba(255,255,255,0.95)"
                  trackColor="rgba(255,255,255,0.22)"
                  style={styles.heroBar}
                />

                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Clock size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroStatText}>{formatClock(elapsedSeconds)}</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <CheckCircle2 size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroStatText}>
                      {progress.completedExercises}/{progress.totalExercises} done
                    </Text>
                  </View>
                  {progress.volume > 0 && (
                    <View style={styles.heroStat}>
                      <Dumbbell size={13} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.heroStatText}>
                        {formatVolume(progress.volume, settings.weightUnit)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── What to do right now ── */}
              {upNext && (
                <Card
                  padding={Space.md + 2}
                  accentColor={muscleColor(upNext.muscleGroup, colors)}
                  accessibilityLabel={`Up next: ${upNext.exerciseName}`}
                >
                  <Text style={styles.upNextEyebrow}>UP NEXT</Text>
                  <Text style={styles.upNextName} numberOfLines={1}>{upNext.exerciseName}</Text>
                  <Text style={styles.upNextMeta}>
                    {(upNext.setDetails ?? []).filter((s) => s.completed).length}/
                    {upNext.setDetails?.length ?? upNext.sets} sets ·{" "}
                    {formatWeight(upNext.setDetails?.[0]?.weight ?? upNext.weight, settings.weightUnit)} ·{" "}
                    {MUSCLE_GROUP_LABELS[upNext.muscleGroup]}
                  </Text>
                </Card>
              )}

              {/* ── Exercises ── */}
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Exercises</Text>
                  <Text style={styles.sectionNote}>
                    {progress.completedSets}/{progress.totalSets} sets
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

              <Button
                label="Cancel workout"
                variant="danger"
                onPress={handleCancelWorkout}
                icon={<X size={16} color={colors.error} />}
                fullWidth
              />
            </>
          ) : (
            <>
              {/* ── Last session recap ── */}
              {lastWorkout && (
                <Card padding={Space.base}>
                  <View style={styles.recapHead}>
                    <Text style={styles.recapEyebrow}>LAST WORKOUT</Text>
                    <Text style={styles.recapDate}>{formatRelativeDate(lastWorkout.completedAt)}</Text>
                  </View>
                  <Text style={styles.recapName} numberOfLines={1}>{lastWorkout.routineName}</Text>
                  <View style={styles.recapStats}>
                    <Text style={styles.recapStat}>
                      {lastWorkout.completedExercises ?? lastWorkout.exerciseCount} exercises
                    </Text>
                    <View style={styles.recapDot} />
                    <Text style={styles.recapStat}>{lastWorkout.duration} min</Text>
                    {(lastWorkout.totalVolume ?? 0) > 0 && (
                      <>
                        <View style={styles.recapDot} />
                        <Text style={styles.recapStat}>
                          {formatVolume(lastWorkout.totalVolume ?? 0, settings.weightUnit)}
                        </Text>
                      </>
                    )}
                    {(lastWorkout.newPRs ?? 0) > 0 && (
                      <Tag
                        label={`${lastWorkout.newPRs} PR${(lastWorkout.newPRs ?? 0) > 1 ? "s" : ""}`}
                        color={colors.amber}
                        size="sm"
                      />
                    )}
                  </View>
                </Card>
              )}

              {/* ── Today's plan ── */}
              {todaysRoutine && todaysRoutine.exercises.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Today&apos;s plan</Text>
                    <Text style={styles.sectionNote}>scheduled</Text>
                  </View>
                  {renderRoutineCard(todaysRoutine, true)}
                </View>
              ) : routines.length > 0 ? (
                <View style={styles.restNote}>
                  <Text style={styles.restTitle}>
                    {trainedToday ? "Today's work is done" : "Nothing scheduled today"}
                  </Text>
                  <Text style={styles.restBody}>
                    {trainedToday
                      ? "Rest up — or run another routine below."
                      : "Pick any routine below to get moving."}
                  </Text>
                </View>
              ) : null}

              {/* ── All routines ── */}
              {otherRoutines.length > 0 && (
                <View style={styles.section}>
                  {todaysRoutine && (
                    <View style={styles.sectionHead}>
                      <Text style={styles.sectionTitle}>Other routines</Text>
                    </View>
                  )}
                  <View style={styles.routineList}>
                    {otherRoutines.map((routine) => renderRoutineCard(routine, false))}
                  </View>
                </View>
              )}

              {routines.length === 0 && (
                <Card padding={0}>
                  <EmptyState
                    icon={<Dumbbell size={30} color={colors.primary} />}
                    title="Build your first routine"
                    body="Start from a proven split like Push/Pull/Legs or Upper/Lower — every exercise comes pre-filled and you can tweak it after."
                    action={
                      <Button
                        label="Get started"
                        onPress={() => router.push("/(tabs)/routines")}
                        trailingIcon={<ChevronRight size={17} color="#fff" />}
                        haptic="medium"
                      />
                    }
                    secondaryAction={
                      <Button
                        label="Browse splits"
                        variant="ghost"
                        size="sm"
                        icon={<Layers size={15} color={colors.primary} />}
                        onPress={() => router.push("/(tabs)/routines")}
                      />
                    }
                  />
                </Card>
              )}
            </>
          )}
        </View>
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
    </Screen>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Space.xxxl,
  },
  body: {
    paddingHorizontal: Layout.gutter,
    gap: Space.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Space.md,
  },
  statCard: {
    flex: 1,
  },
  section: {
    gap: Space.md,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  sectionTitle: {
    ...Type.title3,
    fontWeight: "800",
    color: colors.text,
  },
  sectionNote: {
    ...Type.caption,
    color: colors.textTertiary,
    ...numeric,
  },
  // ── Hero ──
  hero: {
    borderRadius: Radius.lg,
    padding: Space.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.base,
  },
  heroText: {
    flex: 1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
    marginBottom: Space.xs + 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  heroEyebrow: {
    ...Type.overline,
    color: "rgba(255,255,255,0.8)",
  },
  heroTitle: {
    ...Type.title2,
    fontSize: 26,
    color: "#fff",
  },
  heroBar: {
    marginTop: Space.base,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Space.base,
    marginTop: Space.md,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 1,
  },
  heroStatText: {
    ...Type.footnote,
    ...numeric,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  // ── Up next ──
  upNextEyebrow: {
    ...Type.overline,
    color: colors.textTertiary,
    marginBottom: Space.xs,
  },
  upNextName: {
    ...Type.headline,
    color: colors.text,
  },
  upNextMeta: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 3,
  },
  exerciseList: {
    gap: Space.sm + 2,
  },
  // ── Recap ──
  recapHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Space.xs + 2,
  },
  recapEyebrow: {
    ...Type.overline,
    color: colors.textTertiary,
  },
  recapDate: {
    ...Type.caption,
    color: colors.textTertiary,
    fontWeight: "600",
  },
  recapName: {
    ...Type.headline,
    color: colors.text,
    marginBottom: Space.sm,
  },
  recapStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    flexWrap: "wrap",
  },
  recapStat: {
    ...Type.caption,
    ...numeric,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  recapDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  // ── Rest note ──
  restNote: {
    alignItems: "center",
    paddingVertical: Space.lg,
    gap: Space.xs + 2,
  },
  restTitle: {
    ...Type.title3,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  restBody: {
    ...Type.subhead,
    color: colors.textTertiary,
    textAlign: "center",
  },
  // ── Routine cards ──
  routineList: {
    gap: Space.md,
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.base - 2,
  },
  routineMark: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  routineMarkText: {
    ...Type.title3,
    fontWeight: "800",
  },
  routineInfo: {
    flex: 1,
    gap: 3,
  },
  routineName: {
    ...Type.headline,
    color: colors.text,
  },
  routineMeta: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
    marginTop: Space.xs,
    flexWrap: "wrap",
  },
  moreTags: {
    ...Type.caption,
    color: colors.textTertiary,
    fontWeight: "700",
  },
  playButton: {
    width: Layout.touchTarget,
    height: Layout.touchTarget,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
