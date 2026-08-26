import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import {
  Layout,
  Radius,
  Space,
  Type,
  elevation,
  muscleColor,
  numeric,
  statNumber,
  surface,
  tint,
} from "@/constants/theme";
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
import { MuscleGroup, MUSCLE_GROUP_LABELS, WorkoutHistory, DEFAULT_TRAINING_DAYS } from "@/types";
import { formatVolume, formatWeight } from "@/utils/units";
import { estimateOneRepMax } from "@/utils/workoutStats";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";
import { Button, ProgressBar, ScreenHeader, Tag } from "@/components/ui";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Exercises actually worked, tolerant of entries logged before the field existed. */
function workedExercises(h: WorkoutHistory): number {
  return h.completedExercises ?? h.exerciseCount;
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const weeklyGoal = profile?.trainingDaysPerWeek ?? DEFAULT_TRAINING_DAYS;
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
      <ScreenHeader
        title="Progress"
        subtitle={hasHistory ? `${history.length} workout${history.length === 1 ? "" : "s"} logged` : undefined}
      />

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
            <Button
              label="Start a workout"
              onPress={() => progressRouter.push("/(tabs)/(home)")}
              trailingIcon={<ChevronRight size={16} color="#fff" />}
              haptic="medium"
            />
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
              <ProgressBar
                value={workoutsThisWeek / Math.max(weeklyGoal, 1)}
                height={6}
                color={workoutsThisWeek >= weeklyGoal ? colors.emerald : colors.primary}
                style={styles.weekProgress}
              />
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
                      <View style={[styles.muscleDot, { backgroundColor: muscleColor(item.group, colors) }]} />
                      <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[item.group]}</Text>
                      <View style={styles.muscleBarBg}>
                        <View
                          style={[
                            styles.muscleBarFill,
                            {
                              width: `${item.percentage}%`,
                              backgroundColor: muscleColor(item.group, colors),
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
                    <Tag label={String(prEntries.length)} color={colors.amber} size="sm" />
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
                              {isNew && <Tag label="New" color={colors.amber} size="sm" />}
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
                            <Tag
                              label={`${h.newPRs} PR${(h.newPRs ?? 0) > 1 ? "s" : ""}`}
                              color={colors.amber}
                              size="sm"
                            />
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
                            <Tag label="Skipped" color={colors.amber} size="sm" />
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

                <Button
                  label="Delete workout"
                  variant="danger"
                  onPress={() => handleDeleteWorkout(selectedWorkout)}
                  icon={<Trash2 size={16} color={colors.error} />}
                  fullWidth
                />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.gutter,
    gap: Space.md,
  },
  // ── Streak hero ──
  streakHero: {
    borderRadius: Radius.lg,
    padding: Space.xl + Space.xs,
    overflow: "hidden",
    backgroundColor: tint(colors.amber, colors.scheme === "dark" ? 0.16 : 0.12),
    borderWidth: Layout.hairline,
    borderColor: tint(colors.amber, 0.3),
  },
  streakContent: {
    alignItems: "center",
  },
  streakNumber: {
    ...Type.display,
    ...numeric,
    color: colors.text,
    marginTop: Space.sm,
  },
  streakLabel: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.amberDark,
    marginTop: Space.xs,
    textAlign: "center",
  },
  streakBest: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: Space.sm,
  },
  // ── Card ──
  card: {
    // No child paints to the card edge, so no clip is needed — and clipping
    // here would drop the surface shadow on iOS.
    ...surface(colors, 1, Radius.md),
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    padding: Space.base,
    paddingBottom: Space.sm,
  },
  cardHeaderRowTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Space.base,
    paddingBottom: Space.sm,
    minHeight: Layout.touchTarget,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  cardTitle: {
    ...Type.headline,
    color: colors.text,
  },
  cardSubtitle: {
    marginLeft: "auto",
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  // ── Calendar ──
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: Space.sm + 2,
    marginBottom: Space.xxs,
  },
  weekdayCell: {
    width: "14.28%",
    alignItems: "center",
  },
  weekdayText: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "800",
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Space.sm + 2,
    paddingBottom: Space.md + 2,
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
    borderRadius: Radius.xs + 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarDayCompleted: {
    backgroundColor: tint(colors.emerald, 0.18),
    borderColor: tint(colors.emerald, 0.34),
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    ...Type.caption,
    ...numeric,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  calendarDayTextCompleted: {
    color: colors.emerald,
    fontWeight: "800",
  },
  calendarDayTextToday: {
    color: "#fff",
    fontWeight: "800",
  },
  calendarDayTextOther: {
    color: colors.textTertiary,
  },
  // ── Week summary ──
  weekSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space.base,
    paddingBottom: Space.md,
  },
  weekSummaryStat: {
    flex: 1,
    alignItems: "center",
  },
  weekSummaryValue: {
    ...statNumber(24),
    color: colors.text,
  },
  weekSummaryLabel: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: "center",
  },
  weekSummaryDivider: {
    width: Layout.hairline,
    height: 34,
    backgroundColor: colors.separator,
  },
  weekProgress: {
    marginHorizontal: Space.base,
    marginBottom: Space.base,
  },
  // ── Progressive overload ──
  overloadList: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.md,
  },
  overloadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Space.md - 2,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
    gap: Space.md,
  },
  overloadInfo: {
    flex: 1,
  },
  overloadName: {
    ...Type.callout,
    color: colors.text,
  },
  overloadDate: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 1,
  },
  overloadValues: {
    alignItems: "flex-end",
  },
  overloadWeight: {
    ...statNumber(16),
    color: colors.text,
  },
  overload1RM: {
    ...Type.caption,
    ...numeric,
    fontSize: 11,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 1,
  },
  overloadBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs + 2,
    justifyContent: "center",
    alignItems: "center",
  },
  overloadBadgePR: {
    backgroundColor: tint(colors.emerald, 0.16),
  },
  overloadBadgeNormal: {
    backgroundColor: colors.fill,
  },
  // ── Bar chart ──
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Space.xs + 2,
    paddingHorizontal: Space.base - 2,
    paddingBottom: Space.base,
    paddingTop: Space.sm,
    height: 146,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: Space.xs + 1,
  },
  barValue: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  barValueActive: {
    color: colors.primary,
  },
  bar: {
    width: "100%",
    borderRadius: Radius.xs,
    minHeight: 4,
  },
  barInactive: {
    backgroundColor: colors.fillStrong,
  },
  barLabel: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
    letterSpacing: -0.2,
  },
  // ── Muscle split ──
  muscleList: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.base,
    gap: Space.md - 2,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md - 2,
  },
  muscleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleName: {
    ...Type.subhead,
    fontWeight: "600",
    color: colors.text,
    width: 78,
  },
  muscleBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fill,
    overflow: "hidden",
  },
  muscleBarFill: {
    height: 8,
    borderRadius: 4,
  },
  musclePercent: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
    width: 34,
    textAlign: "right",
  },
  // ── Lifetime stats ──
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  statsItem: {
    flex: 1,
    alignItems: "center",
  },
  statsValue: {
    ...statNumber(18),
    color: colors.text,
  },
  statsLabel: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  statsDivider: {
    height: Layout.hairline,
    backgroundColor: colors.separator,
    marginHorizontal: Space.base,
  },
  // ── Personal records ──
  prList: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.md,
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Space.md - 2,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
    gap: Space.md,
  },
  prInfo: {
    flex: 1,
  },
  prNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
  },
  prName: {
    ...Type.callout,
    color: colors.text,
    flexShrink: 1,
  },
  prDate: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 1,
  },
  prValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Space.xs,
  },
  prWeight: {
    ...statNumber(16),
    color: colors.primary,
  },
  prReps: {
    ...Type.footnote,
    ...numeric,
    color: colors.textTertiary,
  },
  pr1RMBadge: {
    alignItems: "center",
    backgroundColor: colors.fill,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.xs + 2,
    minWidth: 46,
  },
  pr1RMText: {
    ...statNumber(14),
    color: colors.primary,
  },
  pr1RMLabel: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "800",
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  // ── Workout log ──
  historyList: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.xs,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Space.md,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
    gap: Space.sm - 2,
    minHeight: Layout.rowHeight,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: Space.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
  },
  historyName: {
    ...Type.callout,
    color: colors.text,
    flexShrink: 1,
  },
  historyMeta: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 2,
  },
  historyDate: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  showMoreButton: {
    paddingVertical: Space.base,
    alignItems: "center",
    minHeight: Layout.touchTarget,
    justifyContent: "center",
  },
  showMoreText: {
    ...Type.subhead,
    fontWeight: "700",
    color: colors.primary,
  },
  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingVertical: Space.huge,
    paddingHorizontal: Space.xl,
  },
  emptyIconBg: {
    width: 68,
    height: 68,
    borderRadius: Radius.lg,
    backgroundColor: tint(colors.primary, colors.scheme === "dark" ? 0.18 : 0.1),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  emptyTitle: {
    ...Type.title3,
    fontWeight: "800",
    color: colors.text,
    marginBottom: Space.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Type.body,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: Space.xl,
    maxWidth: 320,
  },
  emptyFootnote: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: Space.lg,
    textAlign: "center",
  },
  // ── Pro upsell ──
  proAnalyticsCard: {
    borderRadius: Radius.md,
    overflow: "hidden",
    marginTop: Space.xs,
  },
  proAnalyticsGradient: {
    padding: Space.base,
  },
  proAnalyticsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  proAnalyticsInfo: {
    flex: 1,
    paddingRight: Space.lg,
  },
  proAnalyticsTitle: {
    ...Type.headline,
    fontSize: 15,
    color: "#fff",
  },
  proAnalyticsDesc: {
    ...Type.caption,
    fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  proAnalyticsLock: {
    position: "absolute",
    top: Space.base,
    right: Space.base,
  },
  // ── Detail sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm + 2,
    maxHeight: "85%",
    ...elevation(3, colors),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.fillStrong,
    alignSelf: "center",
    marginBottom: Space.md + 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
    marginBottom: Space.base,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    ...Type.title2,
    color: colors.text,
  },
  sheetSubtitle: {
    ...Type.footnote,
    color: colors.textTertiary,
    marginTop: 3,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStats: {
    flexDirection: "row",
    ...surface(colors, 1, Radius.md),
    paddingVertical: Space.base - 2,
    marginBottom: Space.base,
  },
  sheetStat: {
    flex: 1,
    alignItems: "center",
  },
  sheetStatValue: {
    ...statNumber(17),
    color: colors.text,
  },
  sheetStatLabel: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 3,
  },
  sheetScroll: {
    flexGrow: 0,
    marginBottom: Space.md,
  },
  sheetExercise: {
    paddingVertical: Space.md - 2,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
  },
  sheetExerciseHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  sheetExerciseName: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  sheetExerciseSkipped: {
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  sheetExerciseMeta: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  sheetSetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs + 2,
    marginTop: Space.sm,
  },
  sheetSetChip: {
    backgroundColor: colors.fill,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.xs,
  },
  sheetSetChipText: {
    ...Type.caption,
    ...numeric,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sheetEmpty: {
    ...Type.subhead,
    color: colors.textTertiary,
    paddingVertical: Space.lg,
    textAlign: "center",
    lineHeight: 20,
  },
});
