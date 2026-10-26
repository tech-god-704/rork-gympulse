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
import { Flame, Play, Dumbbell, CheckCircle2, Layers } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { type ColorScheme } from "@/constants/colors";
import {
  Layout,
  Motion,
  Space,
  dominantMuscleColor,
  elevation,
  gradient,
  muscleColor,
  numeric,
  tint,
} from "@/constants/theme";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import {
  getTodayWeekDay,
  getToday,
  getGreeting,
  estimateRoutineDuration,
  formatClock,
} from "@/utils/helpers";
import {
  WeekDay,
  Routine,
  WorkoutHistory,
  MuscleGroup,
} from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import ConfettiOverlay from "@/components/ConfettiOverlay";
import DemoTile from "@/components/DemoTile";
import TodayHero from "@/components/today/TodayHero";
import WeekStrip from "@/components/today/WeekStrip";
import LevelCard from "@/components/today/LevelCard";
import RestBar from "@/components/workout/RestBar";
import { Button, Screen } from "@/components/ui";
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
        routineName: session.routineName,
        totalXP: previewTotalXP,
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

  // The hero shows today's scheduled routine, or the next one with exercises.
  const heroRoutine = todaysRoutine && todaysRoutine.exercises.length > 0 ? todaysRoutine : otherRoutines[0];
  const listRoutines = routines.filter((r) => r.id !== heroRoutine?.id && r.exercises.length > 0);
  const weekdayName = today.toLocaleDateString("en-US", { weekday: "long" });

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
      Alert.alert("Nothing logged yet", "Check off at least one set before finishing, or tap End to discard.");
      return;
    }
    Alert.alert("Finish workout?", `${done} of ${progress.totalSets} sets logged.`, [
      { text: "Keep going", style: "cancel" },
      { text: "Finish", onPress: () => triggerCompletionCheck(true) },
    ]);
  }, [getLiveSession, currentSession, progress.totalSets, triggerCompletionCheck]);

  const renderRoutineRow = (routine: Routine) => {
    const groups = routineGroups(routine);
    const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
    return (
      <TouchableOpacity
        key={routine.id}
        style={styles.routineRow}
        onPress={() => handleStartWorkout(routine.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Start ${routine.name}. ${describeRoutine(routine)}`}
      >
        <View style={[styles.routineMark, { backgroundColor: accent }]} />
        <View style={styles.routineInfo}>
          <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
          <Text style={styles.routineMeta} numberOfLines={1}>{describeRoutine(routine)}</Text>
        </View>
        <View style={[styles.playButton, { backgroundColor: tint(accent, 0.14) }]}>
          <Play size={15} color={accent} fill={accent} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      {currentSession ? (
        <>
          {/* ── Workout mode header ── */}
          <View style={styles.wHeader}>
            <View style={styles.wTopRow}>
              <TouchableOpacity onPress={handleCancelWorkout} style={styles.wEnd} accessibilityRole="button" accessibilityLabel="End workout">
                <Text style={styles.wEndText}>End</Text>
              </TouchableOpacity>
              <View style={styles.wCenter}>
                <Text style={styles.wRoutine} numberOfLines={1}>{currentSession.routineName}</Text>
                <Text style={styles.wClock}>{formatClock(elapsedSeconds)}</Text>
              </View>
              <TouchableOpacity onPress={handleFinish} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Finish workout">
                <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wFinish}>
                  <Text style={styles.wFinishText}>Finish</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.wProgressRow}>
              <View style={styles.wTrack}>
                <LinearGradient
                  colors={gradient("bar", colors)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.wFill, { width: `${Math.round(progress.fraction * 100)}%` }]}
                />
              </View>
              <Text style={styles.wSets}>{progress.completedSets} of {progress.totalSets} sets</Text>
            </View>
            {upNext && (
              <Text style={styles.wUpNext} numberOfLines={1}>
                <Text style={styles.wUpNextLabel}>UP NEXT  </Text>
                {upNext.exerciseName}
              </Text>
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.wList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentSession.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.routineExerciseId}
                exercise={exercise}
                exerciseId={exercise.routineExerciseId}
                index={index}
                active={upNext?.routineExerciseId === exercise.routineExerciseId}
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
          </ScrollView>

          <RestBar
            startKey={restKey}
            duration={restTimerDuration}
            alertType={routineRestAlert}
            onDone={() => setRestKey(null)}
          />
        </>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.date}>{dateLabel}</Text>
              <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {greetingWord}, {firstName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/progress")}
              style={styles.streakPill}
              accessibilityRole="button"
              accessibilityLabel={`${streak.currentStreak} day streak`}
            >
              <Flame size={17} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.streakText}>{streak.currentStreak}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <LinearGradient colors={["#2563EB", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* ── Hero / done / empty ── */}
            {routines.length === 0 || !heroRoutine ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Dumbbell size={26} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No routines yet</Text>
                <Text style={styles.emptyBody}>Pick a proven split or build your own, then start training from here.</Text>
                <View style={styles.emptyActions}>
                  <Button label="Browse splits" onPress={() => router.push("/(tabs)/routines")} icon={<Layers size={16} color="#fff" />} />
                  <Button label="Create routine" variant="ghost" onPress={() => router.push("/(tabs)/routines")} />
                </View>
              </View>
            ) : trainedToday ? (
              <View style={styles.doneCard}>
                <View style={styles.doneRow}>
                  <View style={styles.doneCheck}>
                    <CheckCircle2 size={26} color="#fff" />
                  </View>
                  <View style={styles.doneText}>
                    <Text style={styles.doneTitle}>Done for today</Text>
                    <Text style={styles.doneName} numberOfLines={1}>{lastWorkout?.routineName}</Text>
                  </View>
                </View>
                <Text style={styles.doneLine}>
                  {lastWorkout?.duration ?? 0} min
                  {(lastWorkout?.totalVolume ?? 0) > 0 ? ` · ${formatVolume(lastWorkout?.totalVolume ?? 0, settings.weightUnit)}` : ""}
                  {(lastWorkout?.newPRs ?? 0) > 0 ? ` · ${lastWorkout?.newPRs} PR${(lastWorkout?.newPRs ?? 0) > 1 ? "s" : ""}` : ""}
                </Text>
                <View style={styles.doneActions}>
                  <Button label="View progress" variant="ghost" size="sm" onPress={() => router.push("/(tabs)/progress")} />
                  <Button label="Train again" size="sm" onPress={() => handleStartWorkout(heroRoutine.id)} />
                </View>
              </View>
            ) : (
              <TodayHero
                routine={heroRoutine}
                eyebrow={todaysRoutine?.id === heroRoutine.id ? `Today · ${weekdayName}` : "Up next"}
                startLabel="Start workout"
                onStart={() => handleStartWorkout(heroRoutine.id)}
              />
            )}

            {/* ── Form demos ── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View>
                  <Text style={styles.sectionTitle}>Form demos</Text>
                  <Text style={styles.sectionSub}>
                    {heroRoutine && demoSlugs.length > 0 ? `From ${heroRoutine.name}` : `${libraryExercises.length} exercises`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/exercise")} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoRow} style={styles.bleed}>
                {demoSlugs.map((slug) => (
                  <DemoTile key={slug} slug={slug} width={124} height={220} />
                ))}
              </ScrollView>
            </View>

            {/* ── Week + level ── */}
            <WeekStrip completedDates={streak.completedDates} streak={streak.currentStreak} />
            <LevelCard totalXP={gamification.totalXP} level={gamification.level} onPress={() => router.push("/(tabs)/profile")} />

            {/* ── Recent ── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {history.length > 0 && (
                  <TouchableOpacity onPress={() => router.push("/(tabs)/progress")} hitSlop={8}>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
              {history.length === 0 ? (
                <View style={styles.listCard}>
                  <Text style={styles.emptyRecentTitle}>No workouts yet</Text>
                  <Text style={styles.emptyRecentBody}>Finish your first session and it&apos;ll show up here with sets, volume and PRs.</Text>
                </View>
              ) : (
                <View style={styles.listCard}>
                  {history.slice(0, 3).map((w, i) => {
                    const d = new Date(w.completedAt);
                    return (
                      <View key={w.id} style={[styles.recentRow, i > 0 && styles.rowDivider]}>
                        <View style={styles.dateBlock}>
                          <Text style={styles.dow}>{d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</Text>
                          <Text style={styles.dayNum}>{d.getDate()}</Text>
                        </View>
                        <View style={styles.recentInfo}>
                          <Text style={styles.recentName} numberOfLines={1}>{w.routineName}</Text>
                          <Text style={styles.recentMeta}>
                            {w.completedExercises ?? w.exerciseCount} exercises · {w.duration} min
                          </Text>
                        </View>
                        {(w.totalVolume ?? 0) > 0 && (
                          <Text style={styles.recentVol}>{formatVolume(w.totalVolume ?? 0, settings.weightUnit)}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Other routines ── */}
            {listRoutines.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Other routines</Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/routines")} hitSlop={8}>
                    <Text style={styles.seeAll}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.listCard}>
                  {listRoutines.map((r, i) => (
                    <View key={r.id} style={i > 0 ? styles.rowDivider : undefined}>{renderRoutineRow(r)}</View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

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
        routineName={completionStats.routineName}
        totalXP={completionStats.totalXP}
        onDismiss={handleDismissConfetti}
      />
    </Screen>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Space.xxxl },
  body: { paddingHorizontal: 20, gap: 22 },
  // ── Header ──
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: Space.sm, paddingBottom: 18 },
  headerText: { flex: 1 },
  date: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
  greeting: { fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 36, color: colors.text },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...elevation(1, colors),
  },
  streakText: { fontSize: 17, fontWeight: "800", color: colors.text, ...numeric },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  // ── Empty / done ──
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    padding: 24,
    alignItems: "center",
    gap: 8,
    ...elevation(1, colors),
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  emptyBody: { fontSize: 14, fontWeight: "500", color: colors.textTertiary, textAlign: "center", lineHeight: 20 },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  doneCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.completedBorder,
    padding: 20,
    gap: 12,
    ...elevation(1, colors),
  },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  doneCheck: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  doneText: { flex: 1 },
  doneTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
  doneName: { fontSize: 14, fontWeight: "600", color: colors.textTertiary },
  doneLine: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, ...numeric },
  doneActions: { flexDirection: "row", gap: 10 },
  // ── Sections ──
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: Space.sm },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
  sectionSub: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, marginTop: 1 },
  seeAll: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
  bleed: { marginHorizontal: -20 },
  demoRow: { gap: 10, paddingHorizontal: 20 },
  listCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...elevation(1, colors),
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  emptyRecentTitle: { fontSize: 15, fontWeight: "800", color: colors.text, paddingTop: 14 },
  emptyRecentBody: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, paddingTop: 2, paddingBottom: 14, lineHeight: 18 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66 },
  dateBlock: {
    width: 44,
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.separator,
    boxSizing: "content-box",
  },
  dow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: colors.textTertiary },
  dayNum: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text, ...numeric },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 15, fontWeight: "800", color: colors.text },
  recentMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 1, ...numeric },
  recentVol: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, ...numeric },
  routineRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  routineMark: { width: 10, height: 36, borderRadius: 5 },
  routineInfo: { flex: 1 },
  routineName: { fontSize: 15, fontWeight: "800", color: colors.text },
  routineMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 1, ...numeric },
  playButton: { width: Layout.touchTarget, height: Layout.touchTarget, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  // ── Workout mode ──
  wHeader: {
    paddingHorizontal: 20,
    paddingTop: Space.xs,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  wTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wEnd: { height: 44, justifyContent: "center", minWidth: 64 },
  wEndText: { fontSize: 17, fontWeight: "700", color: colors.error },
  wCenter: { flex: 1, alignItems: "center" },
  wRoutine: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
  wClock: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6, color: colors.text, ...numeric },
  wFinish: { height: 40, paddingHorizontal: 18, borderRadius: 999, alignItems: "center", justifyContent: "center", minWidth: 64 },
  wFinishText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  wProgressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.fillStrong, overflow: "hidden" },
  wFill: { height: "100%", borderRadius: 999 },
  wSets: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, ...numeric },
  wUpNext: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  wUpNextLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.primaryText },
  wList: { padding: 16, paddingBottom: 140, gap: 12 },
});
