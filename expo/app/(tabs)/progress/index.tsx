import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { getMonthCalendarDates, getToday } from "@/utils/helpers";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { streak, history, getWorkoutsThisWeek, getWeeklyWorkoutCounts, profile, refreshData, personalRecords } = useGym();
  const [refreshing, setRefreshing] = useState(false);

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 4;
  const weeklyCounts = useMemo(() => getWeeklyWorkoutCounts(8), [getWeeklyWorkoutCounts]);
  const maxWeeklyCount = useMemo(() => Math.max(...weeklyCounts, 1), [weeklyCounts]);

  // Recompute when streak.completedDates changes (new workouts)
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
        {/* Streak Hero */}
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
            <Text style={styles.streakLabel}>Day Streak 🔥</Text>
            <Text style={styles.streakBest}>Best: {streak.longestStreak} days</Text>
          </View>
        </LinearGradient>

        {/* Activity Calendar */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
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

        {/* This Week Summary */}
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
              <Text style={styles.weekSummaryValue}>
                {history
                  .filter((h) => {
                    const now = new Date();
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    return new Date(h.completedAt) >= startOfWeek;
                  })
                  .reduce((sum, h) => sum + h.exerciseCount, 0)}
              </Text>
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

        {/* Weekly Workouts Bar Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
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
                    <View
                      style={[
                        styles.bar,
                        styles.barInactive,
                        { height: barHeight },
                      ]}
                    />
                  )}
                  <Text style={styles.barLabel}>W{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Lifetime Stats */}
        <View style={styles.lifetimeRow}>
          <View style={styles.lifetimeCard}>
            <View style={[styles.lifetimeIcon, { backgroundColor: "#EEF2FF" }]}>
              <Text style={{ fontSize: 16 }}>🏋️</Text>
            </View>
            <Text style={styles.lifetimeValue}>{totalWorkouts}</Text>
            <Text style={styles.lifetimeLabel}>WORKOUTS</Text>
          </View>
          <View style={styles.lifetimeCard}>
            <View style={[styles.lifetimeIcon, { backgroundColor: "#FFFBEB" }]}>
              <Text style={{ fontSize: 16 }}>✨</Text>
            </View>
            <Text style={styles.lifetimeValue}>{totalExercises}</Text>
            <Text style={styles.lifetimeLabel}>EXERCISES</Text>
          </View>
          <View style={styles.lifetimeCard}>
            <View style={[styles.lifetimeIcon, { backgroundColor: "#ECFDF5" }]}>
              <Text style={{ fontSize: 16 }}>⏱️</Text>
            </View>
            <Text style={styles.lifetimeValue}>{totalDuration > 60 ? `${Math.round(totalDuration / 60)}h` : `${totalDuration}m`}</Text>
            <Text style={styles.lifetimeLabel}>TOTAL TIME</Text>
          </View>
        </View>

        {/* Recent Workouts */}
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

        {/* Personal Records */}
        {Object.keys(personalRecords).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Personal Records 🏆</Text>
            </View>
            <View style={styles.prList}>
              {Object.entries(personalRecords)
                .sort(([, a], [, b]) => b.estimated1RM - a.estimated1RM)
                .slice(0, 8)
                .map(([name, pr]) => (
                  <View key={name} style={styles.prRow}>
                    <View style={styles.prInfo}>
                      <Text style={styles.prName}>{name}</Text>
                      <Text style={styles.prDate}>{pr.date}</Text>
                    </View>
                    <View style={styles.prValues}>
                      <Text style={styles.prWeight}>{pr.weight} lbs</Text>
                      <Text style={styles.prReps}>× {pr.reps}</Text>
                    </View>
                  </View>
                ))}
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
  card: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeaderRow: {
    padding: 16,
    paddingBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
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
    backgroundColor: "rgba(0,0,0,0.02)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarDayCompleted: {
    backgroundColor: "rgba(99,102,241,0.12)",
    borderColor: "rgba(99,102,241,0.12)",
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
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
    backgroundColor: "rgba(0,0,0,0.04)",
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  weekProgressFill: {
    height: 6,
    borderRadius: 3,
  },
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
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  barLabel: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 8,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },
  lifetimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  lifetimeCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  lifetimeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  lifetimeValue: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  lifetimeLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
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
  prList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  prInfo: {
    flex: 1,
  },
  prName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
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
});
