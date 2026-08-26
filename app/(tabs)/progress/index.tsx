import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Flame,
  TrendingUp,
  Minus,
  Trophy,
  Clock,
  Dumbbell,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  Crown,
  Lock,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useRouter } from "expo-router";
import { useGym } from "@/providers/GymProvider";
import {
  getMonthCalendarDates,
  getToday,
  weekdayInitials,
  dateOffsetFromToday,
  formatShortDate,
  formatRelativeDate,
  formatDuration,
} from "@/utils/helpers";
import { MuscleGroup, MUSCLE_GROUP_LABELS, WorkoutHistory } from "@/types";
import { formatVolume, formatWeight } from "@/utils/units";
import { estimateOneRepMax } from "@/utils/workoutStats";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Exercises actually worked, tolerant of entries logged before the field existed. */
function workedExercises(h: WorkoutHistory): number {
  return h.completedExercises ?? h.exerciseCount;
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const MUSCLE_COLORS: Record<MuscleGroup, string> = {
    chest: colors.muscleChest,
    back: colors.muscleBack,
    shoulders: colors.muscleShoulders,
    arms: colors.muscleArms,
    legs: colors.muscleLegs,
    core: colors.muscleCore,
    cardio: colors.muscleCardio,
  };
  const insets = useSafeAreaInsets();
  const {
    streak,
    history,
    getWorkoutsThisWeek,
    getWeeklyWorkoutCounts,
    getVolumeThisWeek,
    profile,
    refreshData,
    personalRecords,
    routines,
    lastPerformance,
    settings,
    premium,
    currentSession,
    deleteWorkout,
  } = useGym();
  const progressRouter = useRouter();
  const wu = settings.weightUnit;
  const [refreshing, setRefreshing] = useState(false);
  const [prExpanded, setPrExpanded] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);

  const hasHistory = history.length > 0;

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 4;
  const weeklyCounts = useMemo(() => getWeeklyWorkoutCounts(8), [getWeeklyWorkoutCounts]);
  const maxWeeklyCount = useMemo(
    () => Math.max(...weeklyCounts.map((w) => w.count), 1),
    [weeklyCounts]
  );

  const calendarDates = useMemo(
    () => getMonthCalendarDates(settings.weekStartsOn),
    [settings.weekStartsOn]
  );
  const weekdayLabels = useMemo(() => weekdayInitials(settings.weekStartsOn), [settings.weekStartsOn]);
  const today = getToday();
  const completedDatesSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);

  const totalWorkouts = history.length;
  const totalExercises = useMemo(
    () => history.reduce((sum, h) => sum + workedExercises(h), 0),
    [history]
  );
  const totalDuration = useMemo(
    () => history.reduce((sum, h) => sum + h.duration, 0),
    [history]
  );
  const totalSets = useMemo(
    () =>
      history.reduce(
        (sum, h) => sum + (h.completedSets ?? h.exercises?.reduce((s, e) => s + e.setsCompleted, 0) ?? 0),
        0
      ),
    [history]
  );

  const weekVolume = useMemo(() => getVolumeThisWeek(), [getVolumeThisWeek]);
  const weekExerciseCount = useMemo(() => {
    const startIso = weeklyCounts[weeklyCounts.length - 1]?.startDate;
    if (!startIso) return 0;
    const start = new Date(`${startIso}T00:00:00`).getTime();
    return history
      .filter((h) => new Date(h.completedAt).getTime() >= start)
      .reduce((sum, h) => sum + workedExercises(h), 0);
  }, [history, weeklyCounts]);

  const totalVolume = useMemo(
    () => history.reduce((sum, h) => sum + (h.totalVolume ?? 0), 0),
    [history]
  );

  const totalPRs = useMemo(() => Object.keys(personalRecords).length, [personalRecords]);

  const avgDuration = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(totalDuration / history.length);
  }, [history, totalDuration]);

  const avgExercisesPerWorkout = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round((totalExercises / history.length) * 10) / 10;
  }, [history, totalExercises]);

  const favoriteDayName = useMemo(() => {
    if (history.length === 0) return "—";
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    history.forEach((h) => {
      const d = new Date(h.completedAt);
      dayCounts[d.getDay()]++;
    });
    const maxIdx = dayCounts.indexOf(Math.max(...dayCounts));
    return DAY_NAMES[maxIdx];
  }, [history]);

  // Muscle group distribution from actual completed sets, ignoring skipped work.
  const muscleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    const hasHistoryDetails = history.some((h) => h.exercises && h.exercises.length > 0);
    if (hasHistoryDetails) {
      history.forEach((h) => {
        if (h.exercises) {
          h.exercises.forEach((e) => {
            if (e.skipped || e.setsCompleted <= 0) return;
            counts[e.muscleGroup] = (counts[e.muscleGroup] || 0) + e.setsCompleted;
            total += e.setsCompleted;
          });
        } else if (h.muscleGroups) {
          h.muscleGroups.forEach((mg) => {
            counts[mg] = (counts[mg] || 0) + 1;
            total++;
          });
        }
      });
    } else {
      // No completed workouts yet — show the plan implied by saved routines.
      routines.forEach((r) => {
        r.exercises.forEach((e) => {
          counts[e.muscleGroup] = (counts[e.muscleGroup] || 0) + 1;
          total++;
        });
      });
    }

    if (total === 0) return [];
    return Object.entries(counts)
      .map(([group, count]) => ({
        group: group as MuscleGroup,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [history, routines]);

  const muscleSourceIsPlan = useMemo(
    () => !history.some((h) => h.exercises && h.exercises.length > 0),
    [history]
  );

  // Progressive overload: latest working weight against the standing record.
  const progressTracking = useMemo(() => {
    const entries = Object.entries(lastPerformance);
    if (entries.length === 0) return [];
    return entries
      .map(([name, perf]) => {
        const maxWeight = Math.max(...perf.sets.map((s) => s.weight), 0);
        const bestSet = perf.sets.reduce(
          (best, s) =>
            estimateOneRepMax(s.weight, s.reps) > estimateOneRepMax(best.weight, best.reps) ? s : best,
          perf.sets[0] ?? { weight: 0, reps: 0 }
        );
        const pr = personalRecords[name];
        return {
          name,
          currentWeight: maxWeight,
          current1RM: Math.round(estimateOneRepMax(bestSet.weight, bestSet.reps)),
          prWeight: pr?.weight ?? maxWeight,
          pr1RM: pr ? Math.round(pr.estimated1RM) : 0,
          date: perf.date,
        };
      })
      .filter((e) => e.currentWeight > 0)
      .sort((a, b) => b.current1RM - a.current1RM)
      .slice(0, 6);
  }, [lastPerformance, personalRecords]);

  const prEntries = useMemo(() => {
    return Object.entries(personalRecords)
      .map(([name, pr]) => ({ name, ...pr }))
      .sort((a, b) => b.estimated1RM - a.estimated1RM);
  }, [personalRecords]);

  // Local-date cutoff. Comparing against a UTC-derived string used to mark PRs
  // as "new" a day early or late depending on the user's timezone.
  const recentPRs = useMemo(() => {
    const cutoff = dateOffsetFromToday(-7);
    return new Set(prEntries.filter((pr) => pr.date >= cutoff).map((pr) => pr.name));
  }, [prEntries]);

  const bestMonth = useMemo(() => {
    if (history.length === 0) return { label: "—", count: 0 };
    const monthCounts: Record<string, number> = {};
    history.forEach((h) => {
      const d = new Date(h.completedAt);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    let best = "—";
    let bestCount = 0;
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > bestCount) {
        best = month;
        bestCount = count;
      }
    });
    return { label: best, count: bestCount };
  }, [history]);

  const visibleHistory = useMemo(
    () => (showAllHistory ? history : history.slice(0, 10)),
    [history, showAllHistory]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshData]);

  const handleDeleteWorkout = useCallback(
    (workout: WorkoutHistory) => {
      Alert.alert(
        "Delete workout?",
        `“${workout.routineName}” from ${formatShortDate(workout.completedAt)} will be removed. Personal records, streaks and XP are recalculated from your remaining history.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteWorkout(workout.id);
              setSelectedWorkout(null);
            },
          },
        ]
      );
    },
    [deleteWorkout]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Progress</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: currentSession ? 40 + ACTIVE_BAR_HEIGHT : 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />
        }
      >
        {!hasHistory ? (
          /* One honest empty state beats a wall of zeroed-out cards. */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Dumbbell size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No workouts logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Finish your first session and this page fills up with streaks, personal
              records, volume trends and your muscle split.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => progressRouter.push("/(tabs)/(home)")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go to today's workout"
            >
              <Text style={styles.emptyCtaText}>Start a workout</Text>
              <ChevronRight size={16} color={colors.white} />
            </TouchableOpacity>
            {muscleDistribution.length > 0 && (
              <Text style={styles.emptyFootnote}>
                Your saved routines cover {muscleDistribution.length} muscle group
                {muscleDistribution.length === 1 ? "" : "s"}.
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* ─── Streak Hero ─── */}
            <View style={styles.streakHero}>
              <View style={styles.streakContent}>
                <Flame size={36} color={colors.amber} />
                <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
                <Text style={styles.streakLabel}>
                  Day Streak{streak.currentStreak === 0 ? " — start a new one today" : ""}
                </Text>
                <Text style={styles.streakBest}>Best: {streak.longestStreak} days</Text>
              </View>
            </View>

            {/* ─── This Week Summary ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>This Week</Text>
              </View>
              <View style={styles.weekSummary}>
                <View style={styles.weekSummaryStat}>
                  <Text style={styles.weekSummaryValue}>{workoutsThisWeek}/{weeklyGoal}</Text>
                  <Text style={styles.weekSummaryLabel}>Training days</Text>
                </View>
                <View style={styles.weekSummaryDivider} />
                <View style={styles.weekSummaryStat}>
                  <Text style={styles.weekSummaryValue}>{weekExerciseCount}</Text>
                  <Text style={styles.weekSummaryLabel}>Exercises</Text>
                </View>
                {weekVolume > 0 && (
                  <>
                    <View style={styles.weekSummaryDivider} />
                    <View style={styles.weekSummaryStat}>
                      <Text style={styles.weekSummaryValue}>
                        {formatVolume(weekVolume, wu, false)}
                      </Text>
                      <Text style={styles.weekSummaryLabel}>Volume ({wu})</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.weekProgressBg}>
                <View
                  style={[
                    styles.weekProgressFill,
                    {
                      width: `${Math.min((workoutsThisWeek / Math.max(weeklyGoal, 1)) * 100, 100)}%`,
                      backgroundColor: workoutsThisWeek >= weeklyGoal ? colors.emerald : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* ─── Activity Calendar ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Calendar size={16} color={colors.indigo} />
                <Text style={styles.cardTitle}>Activity</Text>
              </View>
              <View style={styles.weekdayRow}>
                {weekdayLabels.map((day, i) => (
                  <View key={`${day}-${i}`} style={styles.weekdayCell}>
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarDates.map((item) => {
                  const isCompleted = completedDatesSet.has(item.date);
                  const isToday = item.date === today;
                  return (
                    <View key={item.date} style={styles.calendarCell}>
                      <View
                        style={[
                          styles.calendarDay,
                          isCompleted && styles.calendarDayCompleted,
                          isToday && { backgroundColor: colors.primary },
                          !item.isCurrentMonth && styles.calendarDayOtherMonth,
                        ]}
                        accessible
                        accessibilityLabel={`${item.date}${isCompleted ? ", worked out" : ""}${isToday ? ", today" : ""}`}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isCompleted && styles.calendarDayTextCompleted,
                            isToday && styles.calendarDayTextToday,
                            !item.isCurrentMonth && styles.calendarDayTextOther,
                          ]}
                        >
                          {item.dayOfMonth}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ─── Progressive Overload Tracker ─── */}
            {progressTracking.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <TrendingUp size={16} color={colors.indigo} />
                  <Text style={styles.cardTitle}>Progressive Overload</Text>
                </View>
                <View style={styles.overloadList}>
                  {progressTracking.map((item) => {
                    const atPR = item.current1RM >= item.pr1RM && item.pr1RM > 0;
                    return (
                      <View key={item.name} style={styles.overloadRow}>
                        <View style={styles.overloadInfo}>
                          <Text style={styles.overloadName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.overloadDate}>{formatRelativeDate(item.date)}</Text>
                        </View>
                        <View style={styles.overloadValues}>
                          <Text style={styles.overloadWeight}>
                            {formatWeight(item.currentWeight, wu)}
                          </Text>
                          {item.pr1RM > 0 && (
                            <Text style={styles.overload1RM}>
                              est. 1RM {formatWeight(item.pr1RM, wu)}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.overloadBadge, atPR ? styles.overloadBadgePR : styles.overloadBadgeNormal]}>
                          {atPR ? (
                            <TrendingUp size={12} color={colors.emerald} />
                          ) : (
                            <Minus size={12} color={colors.textTertiary} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ─── Weekly Workouts Chart ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Target size={16} color={colors.indigo} />
                <Text style={styles.cardTitle}>Last 8 Weeks</Text>
              </View>
              <View style={styles.barChart}>
                {weeklyCounts.map((week) => {
                  const barHeight = Math.max((week.count / maxWeeklyCount) * 68, 4);
                  return (
                    <View
                      key={week.startDate}
                      style={styles.barColumn}
                      accessible
                      accessibilityLabel={`Week of ${week.label}: ${week.count} workout${week.count === 1 ? "" : "s"}`}
                    >
                      <Text style={[styles.barValue, week.isCurrent && styles.barValueActive]}>
                        {week.count}
                      </Text>
                      <View
                        style={[
                          styles.bar,
                          { height: barHeight },
                          week.isCurrent
                            ? { backgroundColor: colors.primary }
                            : styles.barInactive,
                        ]}
                      />
                      {/* Real week-start dates: "W1..W8" named nothing the user could place. */}
                      <Text style={styles.barLabel} numberOfLines={1}>{week.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ─── Muscle Group Split ─── */}
            {muscleDistribution.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Dumbbell size={16} color={colors.indigo} />
                  <Text style={styles.cardTitle}>Muscle Split</Text>
                  <Text style={styles.cardSubtitle}>
                    {muscleSourceIsPlan ? "from routines" : "by sets completed"}
                  </Text>
                </View>
                <View style={styles.muscleList}>
                  {muscleDistribution.map((item) => (
                    <View
                      key={item.group}
                      style={styles.muscleRow}
                      accessible
                      accessibilityLabel={`${MUSCLE_GROUP_LABELS[item.group]}: ${item.percentage} percent, ${item.count} sets`}
                    >
                      <View style={[styles.muscleDot, { backgroundColor: MUSCLE_COLORS[item.group] }]} />
                      <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[item.group]}</Text>
                      <View style={styles.muscleBarBg}>
                        <View
                          style={[
                            styles.muscleBarFill,
                            {
                              width: `${item.percentage}%`,
                              backgroundColor: MUSCLE_COLORS[item.group],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.musclePercent}>{item.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── Workout Stats ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Clock size={16} color={colors.indigo} />
                <Text style={styles.cardTitle}>Lifetime Stats</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{formatDuration(avgDuration)}</Text>
                  <Text style={styles.statsLabel}>Avg Duration</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{avgExercisesPerWorkout}</Text>
                  <Text style={styles.statsLabel}>Avg Exercises</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{totalSets}</Text>
                  <Text style={styles.statsLabel}>Sets Done</Text>
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{totalExercises}</Text>
                  <Text style={styles.statsLabel}>Exercises</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{formatDuration(totalDuration)}</Text>
                  <Text style={styles.statsLabel}>Total Time</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{formatVolume(totalVolume, wu, false)}</Text>
                  <Text style={styles.statsLabel}>Volume ({wu})</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{totalPRs}</Text>
                  <Text style={styles.statsLabel}>PRs Set</Text>
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  {/* Was "Aug 2026 (12)" crammed into a cell and truncated. */}
                  <Text style={styles.statsValue} numberOfLines={1}>{bestMonth.count || "—"}</Text>
                  <Text style={styles.statsLabel} numberOfLines={1}>
                    {bestMonth.count ? `Best · ${bestMonth.label}` : "Best Month"}
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{streak.longestStreak}</Text>
                  <Text style={styles.statsLabel}>Best Streak</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{favoriteDayName}</Text>
                  <Text style={styles.statsLabel}>Top Day</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsValue}>{totalWorkouts}</Text>
                  <Text style={styles.statsLabel}>Workouts</Text>
                </View>
              </View>
            </View>

            {/* ─── Personal Records Wall ─── */}
            {prEntries.length > 0 && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeaderRowTouchable}
                  onPress={() => setPrExpanded(!prExpanded)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: prExpanded }}
                  accessibilityLabel={`Personal records, ${prEntries.length} total`}
                >
                  <View style={styles.cardHeaderLeft}>
                    <Trophy size={16} color={colors.amber} />
                    <Text style={styles.cardTitle}>Personal Records</Text>
                    <View style={styles.prCountBadge}>
                      <Text style={styles.prCountText}>{prEntries.length}</Text>
                    </View>
                  </View>
                  {prExpanded ? (
                    <ChevronUp size={16} color={colors.textTertiary} />
                  ) : (
                    <ChevronDown size={16} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
                {prExpanded && (
                  <View style={styles.prList}>
                    {prEntries.slice(0, 12).map((pr) => {
                      const isNew = recentPRs.has(pr.name);
                      return (
                        <View key={pr.name} style={styles.prRow}>
                          <View style={styles.prInfo}>
                            <View style={styles.prNameRow}>
                              <Text style={styles.prName} numberOfLines={1}>{pr.name}</Text>
                              {isNew && (
                                <View style={styles.newPrBadge}>
                                  <Text style={styles.newPrText}>NEW</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.prDate}>{formatRelativeDate(pr.date)}</Text>
                          </View>
                          <View style={styles.prValues}>
                            <Text style={styles.prWeight}>{formatWeight(pr.weight, wu)}</Text>
                            <Text style={styles.prReps}>× {pr.reps}</Text>
                          </View>
                          <View style={styles.pr1RMBadge}>
                            <Text style={styles.pr1RMText}>
                              {formatWeight(pr.estimated1RM, wu, { withUnit: false, bodyweightLabel: false })}
                            </Text>
                            <Text style={styles.pr1RMLabel}>1RM</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ─── Recent Workouts ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Workout Log</Text>
                <Text style={styles.cardSubtitle}>tap for details</Text>
              </View>
              <View style={styles.historyList}>
                {visibleHistory.map((h) => {
                  const vol = h.totalVolume ?? 0;
                  return (
                    <TouchableOpacity
                      key={h.id}
                      style={styles.historyRow}
                      onPress={() => setSelectedWorkout(h)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.routineName}, ${formatShortDate(h.completedAt)}. ${workedExercises(h)} exercises, ${h.duration} minutes. Tap for details.`}
                    >
                      <View style={styles.historyDot} />
                      <View style={styles.historyInfo}>
                        <View style={styles.historyNameRow}>
                          <Text style={styles.historyName} numberOfLines={1}>{h.routineName}</Text>
                          {(h.newPRs ?? 0) > 0 && (
                            <View style={styles.historyPrBadge}>
                              <Text style={styles.historyPrText}>
                                {h.newPRs} PR{(h.newPRs ?? 0) > 1 ? "s" : ""}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.historyMeta}>
                          {workedExercises(h)} exercises · {formatDuration(h.duration)}
                          {vol > 0 ? ` · ${formatVolume(vol, wu)}` : ""}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>{formatShortDate(h.completedAt)}</Text>
                      <ChevronRight size={14} color={colors.textTertiary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {history.length > 10 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllHistory((v) => !v)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.showMoreText}>
                    {showAllHistory ? "Show less" : `Show all ${history.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pro Analytics Upsell */}
            {!premium.isPremium && history.length >= 3 && (
              <TouchableOpacity
                style={styles.proAnalyticsCard}
                onPress={() => progressRouter.push("/paywall")}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Unlock Pro analytics"
              >
                <LinearGradient
                  colors={[colors.primary, colors.indigo]}
                  style={styles.proAnalyticsGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.proAnalyticsContent}>
                    <Crown size={20} color="#fff" />
                    <View style={styles.proAnalyticsInfo}>
                      <Text style={styles.proAnalyticsTitle}>Unlock Pro Analytics</Text>
                      <Text style={styles.proAnalyticsDesc}>
                        Muscle heatmaps, volume trends, progressive overload insights
                      </Text>
                    </View>
                  </View>
                  <View style={styles.proAnalyticsLock}>
                    <Lock size={14} color="rgba(255,255,255,0.6)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Workout Detail Sheet ─── */}
      <Modal
        visible={selectedWorkout !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorkout(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
            {selectedWorkout && (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderText}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>{selectedWorkout.routineName}</Text>
                    <Text style={styles.sheetSubtitle}>
                      {formatShortDate(selectedWorkout.completedAt)} ·{" "}
                      {new Date(selectedWorkout.completedAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedWorkout(null)}
                    style={styles.sheetClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.sheetStats}>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatValue}>{formatDuration(selectedWorkout.duration)}</Text>
                    <Text style={styles.sheetStatLabel}>Duration</Text>
                  </View>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatValue}>
                      {selectedWorkout.completedSets ??
                        selectedWorkout.exercises?.reduce((s, e) => s + e.setsCompleted, 0) ??
                        0}
                    </Text>
                    <Text style={styles.sheetStatLabel}>Sets</Text>
                  </View>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatValue}>
                      {formatVolume(selectedWorkout.totalVolume ?? 0, wu, false)}
                    </Text>
                    <Text style={styles.sheetStatLabel}>Volume ({wu})</Text>
                  </View>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatValue}>{selectedWorkout.newPRs ?? 0}</Text>
                    <Text style={styles.sheetStatLabel}>PRs</Text>
                  </View>
                </View>

                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  {selectedWorkout.exercises?.length ? (
                    selectedWorkout.exercises.map((ex, i) => (
                      <View key={`${ex.exerciseName}-${i}`} style={styles.sheetExercise}>
                        <View style={styles.sheetExerciseHead}>
                          <Text
                            style={[styles.sheetExerciseName, ex.skipped && styles.sheetExerciseSkipped]}
                            numberOfLines={1}
                          >
                            {ex.exerciseName}
                          </Text>
                          {ex.skipped ? (
                            <Text style={styles.sheetSkippedTag}>SKIPPED</Text>
                          ) : (
                            <Text style={styles.sheetExerciseMeta}>
                              {ex.setsCompleted}/{ex.totalSets} sets
                            </Text>
                          )}
                        </View>
                        {!ex.skipped && (ex.sets?.length ?? 0) > 0 && (
                          <View style={styles.sheetSetRow}>
                            {ex.sets!.map((s, si) => (
                              <View key={si} style={styles.sheetSetChip}>
                                <Text style={styles.sheetSetChipText}>
                                  {formatWeight(s.weight, wu, { withUnit: false })} × {s.reps}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {!ex.skipped && !ex.sets?.length && ex.bestSet.weight > 0 && (
                          <Text style={styles.sheetExerciseMeta}>
                            Best: {formatWeight(ex.bestSet.weight, wu)} × {ex.bestSet.reps}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sheetEmpty}>
                      This entry was logged before per-exercise detail was recorded.
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteWorkout(selectedWorkout)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this workout"
                >
                  <Trash2 size={16} color={colors.error} />
                  <Text style={styles.deleteButtonText}>Delete workout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingTop: 0,
    gap: 12,
  },
  // ─── Streak Hero ───
  streakHero: {
    backgroundColor: colors.amberLight,
    borderRadius: 12,
    padding: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.amberBorder,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  streakContent: {
    alignItems: "center",
  },
  streakNumber: {
    fontSize: 52,
    fontWeight: "900" as const,
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 56,
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.amberDark,
    marginTop: 4,
    letterSpacing: -0.2,
    textAlign: "center" as const,
  },
  streakBest: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 8,
  },
  // ─── Card ───
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    paddingBottom: 6,
  },
  cardHeaderRowTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 6,
    minHeight: 48,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    marginLeft: "auto",
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  // ─── Calendar ───
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  weekdayCell: {
    width: "14.28%",
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  calendarDay: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glassBorder,
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarDayCompleted: {
    backgroundColor: `${colors.emerald}26`,
    borderColor: `${colors.emerald}44`,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    fontWeight: "500" as const,
    color: colors.textTertiary,
  },
  calendarDayTextCompleted: {
    color: colors.emerald,
    fontWeight: "800" as const,
  },
  calendarDayTextToday: {
    color: colors.white,
    fontWeight: "700" as const,
  },
  calendarDayTextOther: {
    color: colors.textTertiary,
  },
  // ─── Week Summary ───
  weekSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  weekSummaryStat: {
    flex: 1,
    alignItems: "center",
  },
  weekSummaryValue: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
  },
  weekSummaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center" as const,
  },
  weekSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.glassBorder,
  },
  weekProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  weekProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  // ─── Progressive Overload ───
  overloadList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  overloadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 12,
  },
  overloadInfo: {
    flex: 1,
  },
  overloadName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.2,
  },
  overloadDate: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  overloadValues: {
    alignItems: "flex-end",
  },
  overloadWeight: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  overload1RM: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
  overloadBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  overloadBadgePR: {
    backgroundColor: `${colors.emerald}1F`,
  },
  overloadBadgeNormal: {
    backgroundColor: colors.glassBorder,
  },
  // ─── Bar Chart ───
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 8,
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  barValue: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.textTertiary,
  },
  barValueActive: {
    color: colors.indigo,
  },
  bar: {
    width: "100%",
    borderRadius: 6,
    minHeight: 4,
  },
  barInactive: {
    backgroundColor: colors.glassBorder,
  },
  barLabel: {
    fontSize: 8,
    color: colors.textTertiary,
    letterSpacing: -0.2,
  },
  // ─── Muscle Split ───
  muscleList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  muscleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
    width: 80,
  },
  muscleBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glassBorder,
    overflow: "hidden",
  },
  muscleBarFill: {
    height: 8,
    borderRadius: 4,
  },
  musclePercent: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    width: 35,
    textAlign: "right" as const,
  },
  // ─── Workout Stats ───
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsItem: {
    flex: 1,
    alignItems: "center",
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 3,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
  },
  statsDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginHorizontal: 16,
  },
  // ─── Personal Records ───
  prCountBadge: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  prCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.amberDark,
  },
  prList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 12,
  },
  prInfo: {
    flex: 1,
  },
  prNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  newPrBadge: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newPrText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: colors.amberDark,
    letterSpacing: 0.5,
  },
  prDate: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  prValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  prWeight: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: colors.indigo,
    letterSpacing: -0.5,
  },
  prReps: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textTertiary,
  },
  pr1RMBadge: {
    alignItems: "center",
    backgroundColor: colors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 44,
  },
  pr1RMText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: colors.indigo,
    letterSpacing: -0.3,
  },
  pr1RMLabel: {
    fontSize: 7,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  // ─── Recent Workouts ───
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 6,
    minHeight: 56,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.indigo,
    marginRight: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyPrBadge: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  historyPrText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: colors.amberDark,
    letterSpacing: 0.3,
  },
  historyName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  historyMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: colors.textTertiary,
  },
  showMoreButton: {
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  // ─── Empty State ───
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 48,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  emptyFootnote: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 18,
    textAlign: "center" as const,
  },
  // ─── Pro upsell ───
  proAnalyticsCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  proAnalyticsGradient: {
    padding: 16,
  },
  proAnalyticsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proAnalyticsInfo: {
    flex: 1,
    paddingRight: 20,
  },
  proAnalyticsTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: -0.2,
  },
  proAnalyticsDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  proAnalyticsLock: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  // ─── Detail sheet ───
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 3,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStats: {
    flexDirection: "row",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 14,
    marginBottom: 16,
  },
  sheetStat: {
    flex: 1,
    alignItems: "center",
  },
  sheetStatValue: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.4,
  },
  sheetStatLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginTop: 3,
  },
  sheetScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  sheetExercise: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  sheetExerciseHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sheetExerciseName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
    flexShrink: 1,
  },
  sheetExerciseSkipped: {
    color: colors.textTertiary,
    fontStyle: "italic" as const,
  },
  sheetExerciseMeta: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    color: colors.textTertiary,
  },
  sheetSkippedTag: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: colors.amberDark,
    backgroundColor: colors.amberTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  sheetSetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  sheetSetChip: {
    backgroundColor: colors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sheetSetChipText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  sheetEmpty: {
    fontSize: 13,
    color: colors.textTertiary,
    paddingVertical: 20,
    textAlign: "center" as const,
    lineHeight: 19,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorLight,
    minHeight: 48,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.error,
  },
});
