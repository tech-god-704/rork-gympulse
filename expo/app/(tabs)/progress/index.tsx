import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Target, TrendingUp, Calendar } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { getMonthCalendarDates, getCurrentMonthName, getToday } from "@/utils/helpers";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { streak, history, profile, getWorkoutsThisWeek, getWeeklyWorkoutCounts } = useGym();

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeek(), [getWorkoutsThisWeek]);
  const weeklyGoal = profile?.trainingDaysPerWeek ?? 4;
  const weeklyCounts = useMemo(() => getWeeklyWorkoutCounts(8), [getWeeklyWorkoutCounts]);
  const maxWeeklyCount = useMemo(() => Math.max(...weeklyCounts, 1), [weeklyCounts]);

  const calendarDates = useMemo(() => getMonthCalendarDates(), []);
  const monthName = useMemo(() => getCurrentMonthName(), []);
  const today = useMemo(() => getToday(), []);

  const completedDatesSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);

  const totalExercisesThisWeek = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return history
      .filter((h) => new Date(h.completedAt) >= startOfWeek)
      .reduce((sum, h) => sum + h.exerciseCount, 0);
  }, [history]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Progress</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <View style={styles.streakIconRow}>
              <Flame size={24} color={Colors.streakFlame} />
            </View>
            <Text style={styles.streakValue}>{streak.currentStreak}</Text>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
          <View style={styles.streakCard}>
            <View style={styles.streakIconRow}>
              <TrendingUp size={24} color={Colors.primary} />
            </View>
            <Text style={styles.streakValue}>{streak.longestStreak}</Text>
            <Text style={styles.streakLabel}>Best Streak</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>{monthName}</Text>
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
                  <View
                    style={[
                      styles.calendarDay,
                      isCompleted && styles.calendarDayCompleted,
                      isToday && !isCompleted && styles.calendarDayToday,
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
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Target size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>This Week</Text>
          </View>
          <View style={styles.weeklyStats}>
            <View style={styles.weeklyStat}>
              <Text style={styles.weeklyStatValue}>
                {workoutsThisWeek}/{weeklyGoal}
              </Text>
              <Text style={styles.weeklyStatLabel}>Workouts</Text>
            </View>
            <View style={styles.weeklyStatDivider} />
            <View style={styles.weeklyStat}>
              <Text style={styles.weeklyStatValue}>{totalExercisesThisWeek}</Text>
              <Text style={styles.weeklyStatLabel}>Exercises</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min((workoutsThisWeek / weeklyGoal) * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Last 8 Weeks</Text>
          </View>
          <View style={styles.barChart}>
            {weeklyCounts.map((count, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max((count / maxWeeklyCount) * 100, 4)}%`,
                        backgroundColor: i === weeklyCounts.length - 1 ? Colors.primary : Colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
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
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  streakRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  streakIconRow: {
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 3,
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDayCompleted: {
    backgroundColor: Colors.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  calendarDayTextCompleted: {
    color: Colors.white,
  },
  calendarDayTextOther: {
    color: Colors.textTertiary,
  },
  weeklyStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  weeklyStat: {
    flex: 1,
    alignItems: "center",
  },
  weeklyStatValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  weeklyStatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  weeklyStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.cardBorder,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cardBorder,
    overflow: "hidden" as const,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 120,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginTop: 6,
  },
});
