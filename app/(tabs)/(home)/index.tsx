import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Play, Dumbbell, Check, Layers, ChevronRight, X, Trophy } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { type ColorScheme } from "@/constants/colors";
import { Motion, card, dominantMuscleColor, gradient, numeric, tint } from "@/constants/theme";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import { getTodayWeekDay, getToday, getGreeting, estimateRoutineDuration, formatClock } from "@/utils/helpers";
import { WeekDay, Routine, WorkoutHistory, MuscleGroup, DEFAULT_TRAINING_DAYS, ALL_WEEKDAYS, WEEKDAY_LABELS } from "@/types";
import ExerciseCard, { type SetField } from "@/components/ExerciseCard";
import WorkoutComplete from "@/components/workout/WorkoutComplete";
import DemoTile from "@/components/DemoTile";
import TodayHero from "@/components/today/TodayHero";
import WeekCard from "@/components/today/WeekCard";
import LevelCard from "@/components/today/LevelCard";
import RestBar from "@/components/workout/RestBar";
import SetKeypad, { type KeypadTarget } from "@/components/workout/SetKeypad";
import { Screen } from "@/components/ui";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import Meter from "@/components/ui/Meter";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useDialog } from "@/components/ui/Dialog";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import {
  getLevelDefinition,
  getAchievementById,
  calculateXPGain,
  getLevelForXP,
  buildAchievementContext,
  checkAchievements,
} from "@/utils/gamification";
import { summarizeSession, sessionProgress, streakFromDates } from "@/utils/workoutStats";
import { formatVolume } from "@/utils/units";
import { haptic } from "@/utils/haptics";

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
  routineName: string;
  totalXP: number;
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
  routineName: "",
  totalXP: 0,
};

export default function TodayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const dialog = useDialog();
  const {
    profile,
    routines,
    currentSession,
    streak,
    startWorkout,
    toggleExerciseComplete,
    skipExercise,
    toggleSetComplete,
    updateSet,
    addSetToExercise,
    removeSetFromExercise,
    completeWorkout,
    cancelWorkout,
    getLiveSession,
    refreshData,
    history,
    lastPerformance,
    personalRecords,
    settings,
    gamification,
    shouldShowPaywall,
  } = useGym();

  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises: libraryExercises, findByName } = useExerciseLibrary();

  const [restKey, setRestKey] = useState<number | null>(null);
  const [restTimerDuration, setRestTimerDuration] = useState(settings.defaultRestTimer);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats>(EMPTY_STATS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [keypad, setKeypad] = useState<KeypadTarget | null>(null);

  const activeRoutine = useMemo(() => {
    if (!currentSession) return null;
    return routines.find((r) => r.id === currentSession.routineId) ?? null;
  }, [currentSession, routines]);
  const routineRestEnabled = activeRoutine?.restTimerEnabled !== false;
  const routineRestAlert = activeRoutine?.restTimerAlert ?? "vibrate";

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";
  // "Good evening" plus a name overflows next to the streak pill; v4 uses the short form.
  const shortGreeting = getGreeting().replace(/^Good /, "");
  const greetingWord = shortGreeting.charAt(0).toUpperCase() + shortGreeting.slice(1);

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
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
        dialog.alert("Nothing logged", "Every exercise was skipped, so this session wasn't added to your history.");
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
        routineName: session.routineName,
        totalXP: previewTotalXP,
      });

      setTimeout(() => {
        if (settings.showConfetti) {
          setShowConfetti(true);
        } else {
          completeWorkout();
        }
        haptic.success();
      }, Motion.slow);
    },
    [currentSession, getLiveSession, streak, personalRecords, history, settings.showConfetti, completeWorkout, gamification, dialog]
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
      setRestKey(Date.now());
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
        dialog.alert("Nothing to do yet", "Add at least one exercise to this routine before starting it.");
        return;
      }
      haptic.medium();
    },
    [startWorkout, dialog]
  );

  const handleStartWorkout = useCallback(
    (routineId: string) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;
      if (currentSession) {
        dialog.confirm({
          title: "Workout in progress",
          message: `“${currentSession.routineName}” is still running. Starting a new one discards it.`,
          cancelLabel: "Keep current",
          confirmLabel: "Discard & start",
          destructive: true,
          onConfirm: () => beginWorkout(routine),
        });
        return;
      }
      beginWorkout(routine);
    },
    [routines, currentSession, beginWorkout, dialog]
  );

  const handleCancelWorkout = useCallback(() => {
    const done = sessionProgress(getLiveSession() ?? currentSession).completedSets;
    dialog.confirm({
      title: "End this workout?",
      message:
        done > 0
          ? `The ${done} set${done === 1 ? "" : "s"} you logged won't be saved. To keep them, tap Finish instead.`
          : "Nothing has been logged yet, so there's nothing to lose.",
      cancelLabel: "Keep going",
      confirmLabel: "End workout",
      destructive: true,
      onConfirm: () => {
        cancelWorkout();
        setRestKey(null);
        haptic.light();
      },
    });
  }, [cancelWorkout, dialog, getLiveSession, currentSession]);

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

  // The hero shows today's scheduled routine, or the next one with exercises.
  const upcoming = useMemo(() => {
    const order = ALL_WEEKDAYS;
    const start = order.indexOf(todayWeekDay);
    for (let offset = 1; offset < 7; offset++) {
      const day = order[(start + offset) % 7];
      const routine = routines.find((r) => r.exercises.length > 0 && r.scheduledDays?.includes(day));
      if (routine) return { routine, day };
    }
    return null;
  }, [routines, todayWeekDay]);
  const scheduledToday = todaysRoutine && todaysRoutine.exercises.length > 0 ? todaysRoutine : undefined;
  const heroRoutine = scheduledToday ?? upcoming?.routine ?? otherRoutines[0];
  const heroEyebrow = scheduledToday
    ? `Today · ${today.toLocaleDateString("en-US", { weekday: "long" })}`
    : upcoming && upcoming.routine.id === heroRoutine?.id
      ? `Up next · ${WEEKDAY_LABELS[upcoming.day]}`
      : "Up next";
  const listRoutines = routines.filter((r) => r.id !== heroRoutine?.id && r.exercises.length > 0);

  const demoSlugs = useMemo(() => {
    const fromRoutine = (heroRoutine?.exercises ?? [])
      .map((e) => findByName(e.exerciseName)?.slug)
      .filter((s): s is string => Boolean(s));
    const unique = [...new Set(fromRoutine)];
    return unique.length > 0 ? unique : libraryExercises.slice(0, 8).map((e) => e.slug);
  }, [heroRoutine, findByName, libraryExercises]);

  const handleFinish = useCallback(() => {
    const session = getLiveSession() ?? currentSession;
    if (!session) return;
    const done = sessionProgress(session).completedSets;
    if (done === 0) {
      dialog.alert("Nothing logged yet", "Check off at least one set before finishing, or close the workout to discard it.");
      return;
    }
    const total = progress.totalSets;
    if (done >= total) {
      triggerCompletionCheck(true);
      return;
    }
    dialog.confirm({
      title: "Finish workout?",
      message: `${done} of ${total} sets logged. The rest won't count.`,
      cancelLabel: "Keep going",
      confirmLabel: "Finish",
      onConfirm: () => triggerCompletionCheck(true),
    });
  }, [getLiveSession, currentSession, progress.totalSets, triggerCompletionCheck, dialog]);

  // ── Keypad ──
  const openKeypad = useCallback(
    (exerciseId: string, setNumber: number, field: SetField) => {
      const exercise = (getLiveSession() ?? currentSession)?.exercises.find((e) => e.routineExerciseId === exerciseId);
      const sets = exercise?.setDetails ?? [];
      const set = sets.find((s) => s.setNumber === setNumber);
      if (!exercise || !set) return;
      setKeypad({
        exerciseId,
        exerciseName: exercise.exerciseName,
        setNumber,
        field,
        weight: set.weight,
        reps: set.reps,
        followingSets: sets.filter((s) => s.setNumber > setNumber && !s.completed).length,
      });
    },
    [getLiveSession, currentSession]
  );

  const commitKeypad = useCallback(
    (target: KeypadTarget, patch: { weight?: number; reps?: number }, applyToFollowing: boolean) =>
      updateSet(target.exerciseId, target.setNumber, patch, applyToFollowing),
    [updateSet]
  );

  // Keep the exercise to do next in view as the workout moves along.
  const listRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<string, number>>({});
  const upNextId = upNext?.routineExerciseId;
  useEffect(() => {
    if (!upNextId) return;
    const timer = setTimeout(() => {
      const y = cardOffsets.current[upNextId];
      if (y != null) listRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
    }, 320);
    return () => clearTimeout(timer);
  }, [upNextId]);

  const lastHeroSession = useMemo(
    () => (heroRoutine ? history.find((h) => h.routineId === heroRoutine.id) : undefined),
    [history, heroRoutine]
  );
  const canFinish = progress.completedSets > 0;

  const renderRoutineRow = (routine: Routine, index: number) => {
    const groups = routineGroups(routine);
    const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
    return (
      <PressableScale
        key={routine.id}
        style={[styles.routineRow, index > 0 && styles.rowDivider]}
        scaleTo={0.98}
        onPress={() => handleStartWorkout(routine.id)}
        accessibilityRole="button"
        accessibilityLabel={`Start ${routine.name}. ${describeRoutine(routine)}`}
      >
        <View style={[styles.routineMark, { backgroundColor: accent }]} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle} numberOfLines={1}>{routine.name}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{describeRoutine(routine)}</Text>
        </View>
        <View style={[styles.playButton, { backgroundColor: tint(accent, colors.scheme === "dark" ? 0.2 : 0.12) }]}>
          <Play size={14} color={accent} fill={accent} />
        </View>
      </PressableScale>
    );
  };

  return (
    <Screen>
      {currentSession ? (
        <>
          {/* ── Workout mode header ── */}
          <View style={styles.wHeader}>
            <View style={styles.wTopRow}>
              <PressableScale onPress={handleCancelWorkout} style={styles.wEnd} accessibilityRole="button" accessibilityLabel="End workout" testID="end-workout">
                <X size={20} color={colors.error} strokeWidth={2.6} />
              </PressableScale>
              <View style={styles.wCenter}>
                <Text style={styles.wRoutine} numberOfLines={1}>{currentSession.routineName}</Text>
                <Text style={styles.wClock}>{formatClock(elapsedSeconds)}</Text>
              </View>
              <PressableScale onPress={handleFinish} haptic="light" accessibilityRole="button" accessibilityLabel="Finish workout" testID="finish-workout">
                {canFinish ? (
                  <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wFinish}>
                    <Text style={styles.wFinishText}>Finish</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.wFinish, { backgroundColor: colors.fill }]}>
                    <Text style={[styles.wFinishText, { color: colors.textTertiary }]}>Finish</Text>
                  </View>
                )}
              </PressableScale>
            </View>
            <View style={styles.wProgressRow}>
              <View style={styles.wSegments}>
                {currentSession.exercises.map((e) => {
                  const total = e.setDetails?.length || e.sets || 1;
                  const done = e.skipped ? 0 : e.setDetails?.filter((s) => s.completed).length ?? (e.completed ? total : 0);
                  return (
                    <Meter
                      key={e.routineExerciseId}
                      value={e.completed && !e.skipped ? 1 : done / total}
                      height={6}
                      color={e.completed && !e.skipped ? colors.success : colors.primary}
                      trackColor={e.skipped ? colors.fill : undefined}
                      style={styles.flex}
                    />
                  );
                })}
              </View>
              <Text style={styles.wSets}>
                {progress.completedSets}
                <Text style={styles.wSetsTotal}>/{progress.totalSets} sets</Text>
              </Text>
            </View>
          </View>

          <ScrollView
            ref={listRef}
            style={styles.flex}
            contentContainerStyle={styles.wList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentSession.exercises.map((exercise) => (
              <View
                key={exercise.routineExerciseId}
                onLayout={(e) => {
                  cardOffsets.current[exercise.routineExerciseId] = e.nativeEvent.layout.y;
                }}
              >
                <ExerciseCard
                  exercise={exercise}
                  exerciseId={exercise.routineExerciseId}
                  active={upNextId === exercise.routineExerciseId}
                  onToggle={handleToggleExercise}
                  onSkip={skipExercise}
                  onRestTimer={handleRestTimer}
                  onToggleSet={handleToggleSet}
                  onEditSet={openKeypad}
                  onAddSet={addSetToExercise}
                  onRemoveSet={removeSetFromExercise}
                  previousPerformance={lastPerformance[exercise.exerciseName]}
                  personalRecord={personalRecords[exercise.exerciseName]}
                  weightUnit={settings.weightUnit}
                  defaultRestTimer={activeRoutine?.restTimerDuration ?? settings.defaultRestTimer}
                  autoStartRestTimer={routineRestEnabled && settings.autoStartRestTimer}
                />
              </View>
            ))}
          </ScrollView>

          <RestBar
            startKey={restKey}
            duration={restTimerDuration}
            alertType={routineRestAlert}
            onDone={() => setRestKey(null)}
          />
          <SetKeypad target={keypad} weightUnit={settings.weightUnit} onClose={() => setKeypad(null)} onCommit={commitKeypad} />
        </>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ── Header ── */}
          <FadeIn style={styles.header} rise={0}>
            <View style={styles.flex}>
              <Text style={styles.date}>{dateLabel}</Text>
              <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {greetingWord}, {firstName}
              </Text>
            </View>
            <PressableScale
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </PressableScale>
          </FadeIn>

          {/* ── Hero / done / empty ── */}
          <FadeIn delay={60}>
            {routines.length === 0 || !heroRoutine ? (
              <View style={styles.emptyCard}>
                <HeroBackdrop tone="ink" pulse radius={30} />
                <View style={styles.emptyIcon}>
                  <Dumbbell size={26} color="#fff" />
                </View>
                <Text style={styles.emptyTitle}>Set up your first workout</Text>
                <Text style={styles.emptyBody}>Add a proven split in one tap, or build a routine exercise by exercise.</Text>
                <PressableScale
                  style={styles.emptyPrimary}
                  haptic="light"
                  onPress={() => router.push({ pathname: "/(tabs)/routines", params: { open: "splits" } })}
                  accessibilityRole="button"
                >
                  <Layers size={17} color="#0F1F66" />
                  <Text style={styles.emptyPrimaryText}>Browse workout splits</Text>
                </PressableScale>
                <PressableScale
                  style={styles.emptySecondary}
                  onPress={() => router.push({ pathname: "/(tabs)/routines", params: { open: "create" } })}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptySecondaryText}>Create my own routine</Text>
                </PressableScale>
              </View>
            ) : trainedToday && lastWorkout ? (
              <View style={styles.doneCard}>
                <View style={styles.doneRow}>
                  <View style={styles.doneCheck}>
                    <Check size={22} color="#fff" strokeWidth={3.2} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.doneEyebrow}>Done for today</Text>
                    <Text style={styles.doneName} numberOfLines={1}>{lastWorkout.routineName}</Text>
                  </View>
                </View>
                <View style={styles.doneStats}>
                  {[
                    { v: `${lastWorkout.duration}`, l: "min" },
                    { v: formatVolume(lastWorkout.totalVolume ?? 0, settings.weightUnit, false), l: `${settings.weightUnit} lifted` },
                    { v: `${lastWorkout.newPRs ?? 0}`, l: (lastWorkout.newPRs ?? 0) === 1 ? "new PR" : "new PRs" },
                  ].map((s) => (
                    <View key={s.l} style={styles.doneStat}>
                      <Text style={styles.doneStatValue}>{s.v}</Text>
                      <Text style={styles.doneStatLabel}>{s.l}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.doneActions}>
                  <PressableScale style={[styles.doneBtn, { backgroundColor: colors.fill }]} onPress={() => router.push("/(tabs)/progress")} accessibilityRole="button">
                    <Text style={[styles.doneBtnText, { color: colors.text }]}>View progress</Text>
                  </PressableScale>
                  <PressableScale style={[styles.doneBtn, { backgroundColor: colors.primaryTint }]} onPress={() => handleStartWorkout(heroRoutine.id)} accessibilityRole="button">
                    <Text style={[styles.doneBtnText, { color: colors.primaryText }]}>Train again</Text>
                  </PressableScale>
                </View>
              </View>
            ) : (
              <TodayHero
                routine={heroRoutine}
                eyebrow={heroEyebrow}
                onStart={() => handleStartWorkout(heroRoutine.id)}
                lastSession={lastHeroSession}
                weightUnit={settings.weightUnit}
              />
            )}
          </FadeIn>

          <FadeIn delay={120}>
            <WeekCard
              completedDates={streak.completedDates}
              streak={streak.currentStreak}
              goal={profile?.trainingDaysPerWeek ?? DEFAULT_TRAINING_DAYS}
              weekStartsOn={settings.weekStartsOn}
            />
          </FadeIn>

          {/* ── Form demos ── */}
          {demoSlugs.length > 0 && (
            <FadeIn delay={180} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>{heroRoutine ? "In this workout" : "Form demos"}</Text>
                  <Text style={styles.sectionSub}>Tap any move to see how it&apos;s done</Text>
                </View>
                <Pressable onPress={() => router.push("/exercise")} accessibilityRole="button" hitSlop={10} style={styles.link}>
                  <Text style={styles.linkText}>Library</Text>
                  <ChevronRight size={15} color={colors.primaryText} strokeWidth={2.6} />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoRow} style={styles.bleed}>
                {demoSlugs.map((slug) => (
                  <DemoTile key={slug} slug={slug} width={132} height={206} />
                ))}
              </ScrollView>
            </FadeIn>
          )}

          <FadeIn delay={240}>
            <LevelCard totalXP={gamification.totalXP} level={gamification.level} onPress={() => router.push("/(tabs)/profile")} />
          </FadeIn>

          {/* ── Other routines ── */}
          {listRoutines.length > 0 && (
            <FadeIn delay={300} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, styles.flex]}>Other routines</Text>
                <Pressable onPress={() => router.push("/(tabs)/routines")} hitSlop={10} style={styles.link} accessibilityRole="button">
                  <Text style={styles.linkText}>Manage</Text>
                  <ChevronRight size={15} color={colors.primaryText} strokeWidth={2.6} />
                </Pressable>
              </View>
              <View style={styles.listCard}>{listRoutines.map(renderRoutineRow)}</View>
            </FadeIn>
          )}

          {/* ── Recent ── */}
          {history.length > 0 && (
            <FadeIn delay={360} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, styles.flex]}>Recent</Text>
                <Pressable onPress={() => router.push("/(tabs)/progress")} hitSlop={10} style={styles.link} accessibilityRole="button">
                  <Text style={styles.linkText}>See all</Text>
                  <ChevronRight size={15} color={colors.primaryText} strokeWidth={2.6} />
                </Pressable>
              </View>
              <View style={styles.listCard}>
                {history.slice(0, 3).map((w, i) => {
                  const d = new Date(w.completedAt);
                  return (
                    <View key={w.id} style={[styles.recentRow, i > 0 && styles.rowDivider]}>
                      <View style={styles.dateBlock}>
                        <Text style={styles.dow}>{d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</Text>
                        <Text style={styles.dayNum}>{d.getDate()}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{w.routineName}</Text>
                        <Text style={styles.rowMeta}>
                          {w.completedExercises ?? w.exerciseCount} exercises · {w.duration} min
                        </Text>
                      </View>
                      {(w.newPRs ?? 0) > 0 && (
                        <View style={styles.prChip}>
                          <Trophy size={11} color={colors.gold} strokeWidth={2.6} />
                          <Text style={styles.prChipText}>{w.newPRs}</Text>
                        </View>
                      )}
                      {(w.totalVolume ?? 0) > 0 && (
                        <Text style={styles.recentVol}>{formatVolume(w.totalVolume ?? 0, settings.weightUnit)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          )}
        </ScrollView>
      )}

      <WorkoutComplete
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
        routineName={completionStats.routineName}
        totalXP={completionStats.totalXP}
        onDismiss={handleDismissConfetti}
      />
    </Screen>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 36, gap: 22 },
    // ── Header ──
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
    date: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: colors.textTertiary },
    greeting: { fontSize: 30, fontWeight: "800", letterSpacing: -1.1, lineHeight: 36, color: colors.text, marginTop: 2 },
    avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
    // ── Sections ──
    section: { gap: 12 },
    sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
    sectionTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    sectionSub: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 1 },
    link: { flexDirection: "row", alignItems: "center", gap: 1, paddingBottom: 2 },
    linkText: { fontSize: 14, fontWeight: "700", color: colors.primaryText },
    bleed: { marginHorizontal: -20 },
    demoRow: { paddingHorizontal: 20, gap: 10 },
    listCard: { ...card(colors), paddingHorizontal: 16, paddingVertical: 4 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    rowTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    rowMeta: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 2, ...numeric },
    routineRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 10 },
    routineMark: { width: 6, height: 36, borderRadius: 3 },
    playButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", paddingLeft: 2 },
    recentRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, paddingVertical: 10 },
    dateBlock: { width: 44, height: 46, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    dow: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, color: colors.textTertiary },
    dayNum: { fontSize: 17, fontWeight: "800", lineHeight: 20, color: colors.text, ...numeric },
    recentVol: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, ...numeric },
    prChip: { flexDirection: "row", alignItems: "center", gap: 3, height: 24, paddingHorizontal: 7, borderRadius: 8, backgroundColor: colors.goldTint },
    prChipText: { fontSize: 12, fontWeight: "800", color: colors.gold, ...numeric },
    // ── Empty ──
    emptyCard: { borderRadius: 30, padding: 24, gap: 10, overflow: "hidden", alignItems: "flex-start" },
    emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
    emptyTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -1, lineHeight: 33, color: "#fff" },
    emptyBody: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: "rgba(255,255,255,0.78)" },
    emptyPrimary: { alignSelf: "stretch", height: 56, borderRadius: 18, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
    emptyPrimaryText: { fontSize: 16, fontWeight: "800", color: "#0F1F66" },
    emptySecondary: { alignSelf: "stretch", height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    emptySecondaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    // ── Done ──
    doneCard: { ...card(colors, 30), padding: 20, gap: 16, borderWidth: 1.5, borderColor: colors.completedBorder },
    doneRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    doneCheck: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
    doneEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: colors.success },
    doneName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.9, color: colors.text, marginTop: 1 },
    doneStats: { flexDirection: "row", gap: 8 },
    doneStat: { flex: 1, backgroundColor: colors.fill, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, gap: 1 },
    doneStatValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text, ...numeric },
    doneStatLabel: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    doneActions: { flexDirection: "row", gap: 8 },
    doneBtn: { flex: 1, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    doneBtnText: { fontSize: 15, fontWeight: "800" },
    // ── Workout mode ──
    wHeader: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 14,
      gap: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    wTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    wEnd: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.errorLight, alignItems: "center", justifyContent: "center" },
    wCenter: { flex: 1, alignItems: "center" },
    wRoutine: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: colors.textTertiary },
    wClock: { fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 34, color: colors.text, ...numeric },
    wFinish: { height: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    wFinishText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    wProgressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    wSegments: { flex: 1, flexDirection: "row", gap: 4 },
    wSets: { fontSize: 13, fontWeight: "800", color: colors.text, ...numeric },
    wSetsTotal: { fontWeight: "600", color: colors.textTertiary },
    wList: { padding: 14, paddingBottom: 130, gap: 10 },
  });
