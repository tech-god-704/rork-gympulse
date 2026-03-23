import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, TrendingUp, Minus, Trophy, Clock, Dumbbell, Calendar, Target, ChevronDown, ChevronUp } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { getMonthCalendarDates, getToday } from "@/utils/helpers";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/types";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: Colors.muscleChest,
  back: Colors.muscleBack,
  shoulders: Colors.muscleShoulders,
  arms: Colors.muscleArms,
  legs: Colors.muscleLegs,
  core: Colors.muscleCore,
  cardio: Colors.muscleCardio,
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { streak, history, getWorkoutsThisWeek, getWeeklyWorkoutCounts, profile, refreshData, personalRecords, routines, lastPerformance } = useGym();
  const [refreshing, setRefreshing] = useState(false);
  const [prExpanded, setPrExpanded] = useState(true);

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 4;
  const weeklyCounts = useMemo(() => getWeeklyWorkoutCounts(8), [getWeeklyWorkoutCounts]);
  const maxWeeklyCount = useMemo(() => Math.max(...weeklyCounts, 1), [weeklyCounts]);

  const calendarDates = useMemo(() => getMonthCalendarDates(), [streak.completedDates]);
  const today = useMemo(() => getToday(), []);
  const completedDatesSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);

  const totalWorkouts = history.length;
  const totalExercises = useMemo(
    () => history.reduce((sum, h) => sum + h.exerciseCount, 0),
    [history]
  );
  const totalDuration = useMemo(
    () => history.reduce((sum, h) => sum + h.duration, 0),
    [history]
  );

  const weekExerciseCount = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return history
      .filter((h) => new Date(h.completedAt).getTime() >= startOfWeek.getTime())
      .reduce((sum, h) => sum + h.exerciseCount, 0);
  }, [history]);

  // ─── Computed Stats ─────────────────────────────────────
  const avgDuration = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(totalDuration / history.length);
  }, [history, totalDuration]);

  const avgExercisesPerWorkout = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round((totalExercises / history.length) * 10) / 10;
  }, [history, totalExercises]);

  // Favorite workout day
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

  // Muscle group distribution from routines
  const muscleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    routines.forEach((r) => {
      r.exercises.forEach((e) => {
        counts[e.muscleGroup] = (counts[e.muscleGroup] || 0) + 1;
        total++;
      });
    });
    if (total === 0) return [];
    return Object.entries(counts)
      .map(([group, count]) => ({
        group: group as MuscleGroup,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [routines]);

  // Progressive overload tracking from lastPerformance
  const progressTracking = useMemo(() => {
    const entries = Object.entries(lastPerformance);
    if (entries.length === 0) return [];
    return entries
      .map(([name, perf]) => {
        const maxWeight = Math.max(...perf.sets.map((s) => s.weight));
        const pr = personalRecords[name];
        return {
          name,
          currentWeight: maxWeight,
          prWeight: pr?.weight ?? maxWeight,
          pr1RM: pr ? Math.round(pr.estimated1RM) : 0,
          date: perf.date,
        };
      })
      .filter((e) => e.currentWeight > 0)
      .sort((a, b) => b.currentWeight - a.currentWeight)
      .slice(0, 6);
  }, [lastPerformance, personalRecords]);

  // PR entries sorted and grouped
  const prEntries = useMemo(() => {
    return Object.entries(personalRecords)
      .map(([name, pr]) => ({ name, ...pr }))
      .sort((a, b) => b.estimated1RM - a.estimated1RM);
  }, [personalRecords]);

  const recentPRs = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split("T")[0];
    return new Set(prEntries.filter((pr) => pr.date >= cutoff).map((pr) => pr.name));
  }, [prEntries]);

  // Best month
  const bestMonth = useMemo(() => {
    if (history.length === 0) return "—";
    const monthCounts: Record<string, number> = {};
    history.forEach((h) => {
      const d = new Date(h.completedAt);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    let best = "";
    let bestCount = 0;
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > bestCount) {
        best = month;
        bestCount = count;
      }
    });
    return `${best} (${bestCount})`;
  }, [history]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshData]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Progress</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.indigo} />
        }
      >
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💪</Text>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySubtitle}>Complete your first workout to start tracking progress!</Text>
          </View>
        )}

        {/* ─── Streak Hero ─── */}
        <LinearGradient
          colors={["#FFFBEB", "#FEF3C7", "#FDE68A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakHero}
        >
          <View style={styles.streakDecor} />
          <View style={styles.streakContent}>
            <Flame size={36} color="#F59E0B" />
            <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
            <Text style={styles.streakBest}>Best: {streak.longestStreak} days</Text>
          </View>
        </LinearGradient>

        {/* ─── This Week Summary ─── */}
        {history.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>This Week</Text>
            </View>
            <View style={styles.weekSummary}>
              <View style={styles.weekSummaryStat}>
                <Text style={styles.weekSummaryValue}>{workoutsThisWeek}/{weeklyGoal}</Text>
                <Text style={styles.weekSummaryLabel}>Workouts</Text>
              </View>
              <View style={styles.weekSummaryDivider} />
              <View style={styles.weekSummaryStat}>
                <Text style={styles.weekSummaryValue}>{weekExerciseCount}</Text>
                <Text style={styles.weekSummaryLabel}>Exercises</Text>
              </View>
            </View>
            <View style={styles.weekProgressBg}>
              <LinearGradient
                colors={[Colors.primary, Colors.indigo]}
                style={[styles.weekProgressFill, { width: `${Math.min((workoutsThisWeek / weeklyGoal) * 100, 100)}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        )}

        {/* ─── Activity Calendar ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Calendar size={16} color={Colors.indigo} />
            <Text style={styles.cardTitle}>Activity</Text>
          </View>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDates.map((item, i) => {
              const isCompleted = completedDatesSet.has(item.date);
              const isToday = item.date === today;
              return (
                <View key={i} style={styles.calendarCell}>
                  {isToday ? (
                    <LinearGradient
                      colors={isCompleted ? [Colors.emerald, "#059669"] : [Colors.primary, Colors.indigo]}
                      style={styles.calendarDay}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.calendarDayText, styles.calendarDayTextToday]}>
                        {item.dayOfMonth}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.calendarDay,
                        isCompleted && styles.calendarDayCompleted,
                        !item.isCurrentMonth && styles.calendarDayOtherMonth,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isCompleted && styles.calendarDayTextCompleted,
                          !item.isCurrentMonth && styles.calendarDayTextOther,
                        ]}
                      >
                        {item.dayOfMonth}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── Progressive Overload Tracker ─── */}
        {progressTracking.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <TrendingUp size={16} color={Colors.indigo} />
              <Text style={styles.cardTitle}>Progressive Overload</Text>
            </View>
            <View style={styles.overloadList}>
              {progressTracking.map((item) => {
                const atPR = item.currentWeight >= item.prWeight;
                return (
                  <View key={item.name} style={styles.overloadRow}>
                    <View style={styles.overloadInfo}>
                      <Text style={styles.overloadName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.overloadDate}>{item.date}</Text>
                    </View>
                    <View style={styles.overloadValues}>
                      <Text style={styles.overloadWeight}>{item.currentWeight} lbs</Text>
                      {item.pr1RM > 0 && (
                        <Text style={styles.overload1RM}>est. 1RM: {item.pr1RM}</Text>
                      )}
                    </View>
                    <View style={[styles.overloadBadge, atPR ? styles.overloadBadgePR : styles.overloadBadgeNormal]}>
                      {atPR ? (
                        <TrendingUp size={12} color={Colors.emerald} />
                      ) : (
                        <Minus size={12} color={Colors.textTertiary} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Weekly Volume Chart ─── */}
        {history.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Target size={16} color={Colors.indigo} />
              <Text style={styles.cardTitle}>Weekly Workouts</Text>
            </View>
            <View style={styles.barChart}>
              {weeklyCounts.map((count, i) => {
                const isLast = i === weeklyCounts.length - 1;
                const barHeight = Math.max((count / maxWeeklyCount) * 68, 4);
                return (
                  <View key={i} style={styles.barColumn}>
                    <Text style={[styles.barValue, isLast && styles.barValueActive]}>{count}</Text>
                    {isLast ? (
                      <LinearGradient
                        colors={[Colors.primary, Colors.indigo]}
                        style={[styles.bar, { height: barHeight }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                    ) : (
                      <View style={[styles.bar, styles.barInactive, { height: barHeight }]} />
                    )}
                    <Text style={styles.barLabel}>W{i + 1}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Muscle Group Split ─── */}
        {muscleDistribution.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Dumbbell size={16} color={Colors.indigo} />
              <Text style={styles.cardTitle}>Muscle Split</Text>
            </View>
            <View style={styles.muscleList}>
              {muscleDistribution.map((item) => (
                <View key={item.group} style={styles.muscleRow}>
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
        {history.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Clock size={16} color={Colors.indigo} />
              <Text style={styles.cardTitle}>Workout Stats</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{avgDuration}m</Text>
                <Text style={styles.statsLabel}>Avg Duration</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{avgExercisesPerWorkout}</Text>
                <Text style={styles.statsLabel}>Avg Exercises</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{favoriteDayName}</Text>
                <Text style={styles.statsLabel}>Top Day</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{totalWorkouts}</Text>
                <Text style={styles.statsLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsGrid}>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{totalExercises}</Text>
                <Text style={styles.statsLabel}>Exercises Done</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>
                  {totalDuration >= 60
                    ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}m` : ""}`
                    : `${totalDuration}m`}
                </Text>
                <Text style={styles.statsLabel}>Total Time</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue} numberOfLines={1}>{bestMonth}</Text>
                <Text style={styles.statsLabel}>Best Month</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{streak.longestStreak}</Text>
                <Text style={styles.statsLabel}>Best Streak</Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── Personal Records Wall ─── */}
        {prEntries.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRowTouchable}
              onPress={() => setPrExpanded(!prExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderLeft}>
                <Trophy size={16} color="#F59E0B" />
                <Text style={styles.cardTitle}>Personal Records</Text>
                <View style={styles.prCountBadge}>
                  <Text style={styles.prCountText}>{prEntries.length}</Text>
                </View>
              </View>
              {prExpanded ? (
                <ChevronUp size={16} color={Colors.textTertiary} />
              ) : (
                <ChevronDown size={16} color={Colors.textTertiary} />
              )}
            </TouchableOpacity>
            {prExpanded && (
              <View style={styles.prList}>
                {prEntries.slice(0, 10).map((pr) => {
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
                        <Text style={styles.prDate}>{pr.date}</Text>
                      </View>
                      <View style={styles.prValues}>
                        <Text style={styles.prWeight}>{pr.weight} lbs</Text>
                        <Text style={styles.prReps}>× {pr.reps}</Text>
                      </View>
                      <View style={styles.pr1RMBadge}>
                        <Text style={styles.pr1RMText}>{Math.round(pr.estimated1RM)}</Text>
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
        {history.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Recent Workouts</Text>
            </View>
            <View style={styles.historyList}>
              {history.slice(0, 10).map((h) => {
                const d = new Date(h.completedAt);
                const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                return (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{h.routineName}</Text>
                      <Text style={styles.historyMeta}>
                        {h.exerciseCount} exercises · {h.duration} min
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{dateStr}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
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
    paddingBottom: 40,
    gap: 12,
  },
  // ─── Streak Hero ───
  streakHero: {
    borderRadius: 24,
    padding: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 4,
  },
  streakDecor: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  streakContent: {
    alignItems: "center",
  },
  streakNumber: {
    fontSize: 52,
    fontWeight: "900" as const,
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 56,
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#92400E",
    marginTop: 4,
    letterSpacing: -0.2,
  },
  streakBest: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  // ─── Card ───
  card: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
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
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.3,
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
    color: Colors.textTertiary,
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
    backgroundColor: "rgba(99,102,241,0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarDayCompleted: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderColor: "rgba(99,102,241,0.15)",
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    fontWeight: "500" as const,
    color: Colors.textTertiary,
  },
  calendarDayTextCompleted: {
    color: Colors.indigo,
    fontWeight: "700" as const,
  },
  calendarDayTextToday: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  calendarDayTextOther: {
    color: Colors.textTertiary,
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
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  weekSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  weekSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  weekProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(99,102,241,0.10)",
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
    borderBottomColor: "rgba(0,0,0,0.06)",
    gap: 12,
  },
  overloadInfo: {
    flex: 1,
  },
  overloadName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  overloadDate: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  overloadValues: {
    alignItems: "flex-end",
  },
  overloadWeight: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  overload1RM: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    color: Colors.textTertiary,
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
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  overloadBadgeNormal: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  // ─── Bar Chart ───
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 8,
    height: 130,
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
    color: Colors.textTertiary,
  },
  barValueActive: {
    color: Colors.indigo,
  },
  bar: {
    width: "100%",
    borderRadius: 8,
    minHeight: 4,
  },
  barInactive: {
    backgroundColor: "rgba(99,102,241,0.15)",
  },
  barLabel: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 8,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
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
    color: Colors.text,
    width: 80,
  },
  muscleBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
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
    color: Colors.textTertiary,
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
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 3,
    textTransform: "uppercase" as const,
  },
  statsDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 16,
  },
  // ─── Personal Records ───
  prCountBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  prCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#92400E",
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
    borderBottomColor: "rgba(0,0,0,0.06)",
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
    color: Colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  newPrBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newPrText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: "#92400E",
    letterSpacing: 0.5,
  },
  prDate: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  prValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  prWeight: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.indigo,
    letterSpacing: -0.5,
  },
  prReps: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textTertiary,
  },
  pr1RMBadge: {
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
  },
  pr1RMText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.indigo,
    letterSpacing: -0.3,
  },
  pr1RMLabel: {
    fontSize: 7,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  // ─── Recent Workouts ───
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.indigo,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  historyMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.textTertiary,
  },
  // ─── Empty State ───
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
});
