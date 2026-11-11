import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Polyline, Stop } from "react-native-svg";
import { BarChart3, ChevronRight, Sparkles, Dumbbell, Trophy, Clock, Timer, TrendingUp, TrendingDown, Flame, Check, type LucideIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import Sheet from "@/components/ui/Sheet";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useDialog } from "@/components/ui/Dialog";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card, dominantMuscleColor, gradient, muscleColor } from "@/constants/theme";
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
import { formatVolume, formatWeight, toDisplayWeight, trimNumber } from "@/utils/units";
import { summarizeRange, overloadCandidates, overloadSeries, type ProgressRange } from "@/utils/progressStats";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";
import { Segmented } from "@/components/ui";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const RANGES: { label: string; value: ProgressRange }[] = [
  { label: "4 weeks", value: "4w" },
  { label: "3 months", value: "3m" },
  { label: "Year", value: "1y" },
];
const RANGE_NOUN: Record<ProgressRange, string> = { "4w": "4 weeks", "3m": "3 months", "1y": "year" };
const CHART_H = 132;
const LINE_W = 320;
const LINE_H = 132;

function workedExercises(h: WorkoutHistory): number {
  return h.completedExercises ?? h.exercises?.filter((e) => !e.skipped && e.setsCompleted > 0).length ?? h.exerciseCount;
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dialog = useDialog();
  const { width } = useWindowDimensions();
  const { streak, history, refreshData, personalRecords, routines, settings, premium, currentSession, deleteWorkout } = useGym();
  const wu = settings.weightUnit;
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<ProgressRange>("4w");
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [overloadEx, setOverloadEx] = useState<string | null>(null);

  const hasHistory = history.length > 0;
  const dark = colors.scheme === "dark";

  const summary = useMemo(() => summarizeRange(history, range, settings.weekStartsOn), [history, range, settings.weekStartsOn]);
  const maxBar = Math.max(...summary.bars.map((b) => b.value), 1);
  const avgBar = summary.bars.reduce((a, b) => a + b.value, 0) / Math.max(summary.bars.filter((b) => b.value > 0).length, 1);
  const deltaPct = summary.previousTotal > 0 ? Math.round(((summary.total - summary.previousTotal) / summary.previousTotal) * 100) : null;
  const focusBar = selectedBar != null ? summary.bars[selectedBar] : null;
  useEffect(() => setSelectedBar(null), [range]);

  const calendarDates = useMemo(() => getMonthCalendarDates(settings.weekStartsOn), [settings.weekStartsOn]);
  const weekdayLabels = useMemo(() => weekdayInitials(settings.weekStartsOn), [settings.weekStartsOn]);
  const today = getToday();
  const completedDatesSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);
  const monthWorkouts = calendarDates.filter((d) => d.isCurrentMonth && completedDatesSet.has(d.date)).length;
  const monthName = new Date().toLocaleString("en-US", { month: "long" });
  const cellSize = Math.min(40, Math.floor((width - 40 - 36 - 24) / 7));

  const candidates = useMemo(() => overloadCandidates(history, settings.weekStartsOn), [history, settings.weekStartsOn]);
  useEffect(() => {
    if (!overloadEx || !candidates.includes(overloadEx)) setOverloadEx(candidates[0] ?? null);
  }, [candidates, overloadEx]);
  const series = useMemo(
    () => (overloadEx ? overloadSeries(history, overloadEx, settings.weekStartsOn).map((v) => toDisplayWeight(v, wu)) : []),
    [history, overloadEx, settings.weekStartsOn, wu],
  );
  const overloadColor = useMemo(() => {
    const ex = history.flatMap((h) => h.exercises ?? []).find((e) => e.exerciseName === overloadEx);
    return ex ? muscleColor(ex.muscleGroup, colors) : colors.primary;
  }, [history, overloadEx, colors]);

  const line = useMemo(() => {
    if (series.length < 2) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const pts = series.map((v, i) => [12 + i * ((LINE_W - 24) / (series.length - 1)), 112 - ((v - min) / (max - min || 1)) * 92]);
    return {
      pts,
      poly: pts.map((p) => p.join(",")).join(" "),
      area: `M${pts[0][0]},${LINE_H} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${LINE_H} Z`,
    };
  }, [series]);
  const overloadGain = series.length > 1 ? series[series.length - 1] - series[0] : 0;

  // Muscle balance from actual completed sets, ignoring skipped work.
  const muscleDistribution = useMemo(() => {
    const counts: Partial<Record<MuscleGroup, number>> = {};
    let total = 0;
    history.forEach((h) => {
      if (h.exercises?.length) {
        h.exercises.forEach((e) => {
          if (e.skipped || e.setsCompleted <= 0) return;
          counts[e.muscleGroup] = (counts[e.muscleGroup] ?? 0) + e.setsCompleted;
          total += e.setsCompleted;
        });
      } else {
        h.muscleGroups?.forEach((mg) => {
          counts[mg] = (counts[mg] ?? 0) + 1;
          total++;
        });
      }
    });
    if (total === 0) return [];
    return (Object.entries(counts) as [MuscleGroup, number][])
      .map(([group, count]) => ({ group, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [history]);
  const maxMuscle = muscleDistribution[0]?.percentage ?? 1;

  const prEntries = useMemo(
    () =>
      Object.entries(personalRecords)
        .map(([name, pr]) => ({ name, ...pr }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.estimated1RM - a.estimated1RM),
    [personalRecords],
  );
  const muscleByExercise = useMemo(() => {
    const map = new Map<string, MuscleGroup>();
    history.forEach((h) => h.exercises?.forEach((e) => map.set(e.exerciseName, e.muscleGroup)));
    routines.forEach((r) => r.exercises.forEach((e) => map.set(e.exerciseName, e.muscleGroup)));
    return map;
  }, [history, routines]);
  // Local-date cutoff, so "new" doesn't flip a day early or late across timezones.
  const recentCutoff = dateOffsetFromToday(-7);

  const visibleHistory = showAllHistory ? history : history.slice(0, 8);
  const routineColor = useCallback(
    (h: WorkoutHistory) =>
      (routines.find((r) => r.id === h.routineId) ?? routines.find((r) => r.name === h.routineName))?.color ??
      dominantMuscleColor(h.muscleGroups ?? [], colors) ??
      colors.primary,
    [routines, colors],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshData]);

  const handleDeleteWorkout = useCallback(
    (workout: WorkoutHistory) => {
      // Close the sheet first: a dialog can't be presented over another modal.
      setSelectedWorkout(null);
      setTimeout(
        () =>
          dialog.confirm({
            title: "Delete this workout?",
            message: `“${workout.routineName}” from ${formatShortDate(workout.completedAt)} will be removed. Records, streaks and XP are recalculated from what's left.`,
            confirmLabel: "Delete",
            destructive: true,
            onConfirm: () => deleteWorkout(workout.id),
          }),
        320,
      );
    },
    [deleteWorkout, dialog],
  );

  const vol = (lbs: number) => formatVolume(lbs, wu);
  const w = (lbs: number) => trimNumber(toDisplayWeight(lbs, wu));

  const stats: { Icon: LucideIcon; v: string; l: string; color: string; tint: string }[] = [
    { Icon: Dumbbell, v: String(summary.workouts), l: "Workouts", color: colors.primaryText, tint: colors.primaryTint },
    { Icon: Trophy, v: String(summary.newPRs), l: "New records", color: colors.gold, tint: colors.goldTint },
    { Icon: Clock, v: summary.avgMinutes ? `${summary.avgMinutes} min` : "—", l: "Avg session", color: colors.success, tint: colors.successTint },
    { Icon: Timer, v: summary.totalMinutes ? formatDuration(summary.totalMinutes) : "—", l: "Total time", color: colors.flame, tint: colors.flameTint },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 36 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>Progress</Text>

        {!hasHistory ? (
          <FadeIn style={styles.empty}>
            <View style={styles.emptyIcon}>
              <BarChart3 size={26} color={colors.primaryText} />
            </View>
            <Text style={styles.emptyTitle}>Nothing to chart yet</Text>
            <Text style={styles.emptyBody}>Finish a workout and your volume, calendar and records fill in here.</Text>
            <PressableScale onPress={() => router.push("/(tabs)/(home)")} style={styles.emptyBtn} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Go to today&apos;s workout</Text>
            </PressableScale>
          </FadeIn>
        ) : (
          <>
            <Segmented options={RANGES} value={range} onChange={setRange} label="Time range" />

            {/* ─── Volume ─── */}
            <FadeIn style={[styles.card, { gap: 16 }]}>
              <View style={styles.volHead}>
                <View style={styles.flex}>
                  <Text style={styles.kicker}>{focusBar ? focusBar.label || "This period" : `Volume · last ${RANGE_NOUN[range]}`}</Text>
                  <Text style={styles.bigNumber}>{vol(focusBar ? focusBar.value : summary.total)}</Text>
                </View>
                {deltaPct != null && !focusBar && (
                  <View style={[styles.deltaPill, { backgroundColor: deltaPct >= 0 ? colors.successTint : colors.fill }]}>
                    {deltaPct >= 0 ? (
                      <TrendingUp size={14} color={colors.success} strokeWidth={2.6} />
                    ) : (
                      <TrendingDown size={14} color={colors.textSecondary} strokeWidth={2.6} />
                    )}
                    <Text style={[styles.deltaText, { color: deltaPct >= 0 ? colors.success : colors.textSecondary }]}>
                      {deltaPct >= 0 ? "+" : ""}
                      {deltaPct}%
                    </Text>
                  </View>
                )}
              </View>

              <View>
                {avgBar > 0 && (
                  <View style={[styles.avgLine, { bottom: 20 + Math.round((avgBar / maxBar) * CHART_H) }]} pointerEvents="none">
                    <Svg width="100%" height={2}>
                      <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.textTertiary} strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
                    </Svg>
                  </View>
                )}
                <View style={[styles.bars, { gap: summary.bars.length > 6 ? 5 : 12 }]}>
                  {summary.bars.map((b, i) => {
                    const h = Math.max(6, Math.round((b.value / maxBar) * CHART_H));
                    const on = selectedBar === i || (selectedBar == null && b.current);
                    return (
                      <Pressable
                        key={i}
                        style={styles.barCol}
                        onPress={() => setSelectedBar(selectedBar === i ? null : i)}
                        accessibilityRole="button"
                        accessibilityLabel={`${b.label || "Period"}: ${vol(b.value)}`}
                      >
                        {on ? (
                          <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={[styles.bar, { height: h }]} />
                        ) : (
                          <View style={[styles.bar, { height: h, backgroundColor: dark ? "rgba(96,165,250,0.26)" : "rgba(59,130,246,0.2)" }]} />
                        )}
                        <Text style={[styles.barLabel, on && { color: colors.text }]} numberOfLines={1}>{b.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Text style={styles.chartHint}>
                {deltaPct != null ? `${deltaPct >= 0 ? "Up" : "Down"} ${Math.abs(deltaPct)}% on the ${RANGE_NOUN[range]} before · ` : ""}tap a bar for its total
              </Text>
            </FadeIn>

            {/* ─── Stats ─── */}
            <FadeIn delay={60} style={styles.statGrid}>
              {stats.map(({ Icon, v, l, color, tint }) => (
                <View key={l} style={styles.statTile}>
                  <View style={[styles.statIcon, { backgroundColor: tint }]}>
                    <Icon size={19} color={color} strokeWidth={2.4} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                    <Text style={styles.statLabel} numberOfLines={1}>{l}</Text>
                  </View>
                </View>
              ))}
            </FadeIn>

            {/* ─── Pro upsell ─── */}
            {!premium.isPremium && (
              <PressableScale onPress={() => router.push("/paywall")} scaleTo={0.98} style={styles.upsell} accessibilityRole="button" accessibilityLabel="Go deeper with Pro">
                <HeroBackdrop tone="ink" radius={26} />
                <View style={styles.upsellIcon}>
                  <Sparkles size={22} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.upsellTitle}>Go deeper with Pro</Text>
                  <Text style={styles.upsellBody}>Overload trends for every exercise and your full history.</Text>
                </View>
                <View style={styles.upsellPill}>
                  <Text style={styles.upsellPillText}>Try free</Text>
                </View>
              </PressableScale>
            )}

            {/* ─── Calendar ─── */}
            <View style={[styles.card, { gap: 14 }]}>
              <View style={styles.cardHeadRow}>
                <View>
                  <Text style={styles.cardTitle}>{monthName}</Text>
                  <Text style={styles.cardSub}>
                    {monthWorkouts} workout{monthWorkouts === 1 ? "" : "s"} so far
                  </Text>
                </View>
                <View style={[styles.streakPill, streak.currentStreak > 0 && { backgroundColor: colors.flameTint }]}>
                  <Flame
                    size={14}
                    color={streak.currentStreak > 0 ? colors.flame : colors.textTertiary}
                    fill={streak.currentStreak > 0 ? colors.flame : "transparent"}
                  />
                  <Text style={[styles.streakText, streak.currentStreak > 0 && { color: colors.flame }]}>
                    {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"} · best {streak.longestStreak}
                  </Text>
                </View>
              </View>
              <View style={styles.calGrid}>
                {weekdayLabels.map((d, i) => (
                  <Text key={`${d}-${i}`} style={styles.calWeekday}>{d}</Text>
                ))}
                {calendarDates.map((c) => {
                  if (!c.isCurrentMonth) return <View key={c.date} style={styles.calCell} />;
                  const done = completedDatesSet.has(c.date);
                  const isToday = c.date === today;
                  return (
                    <View key={c.date} style={styles.calCell}>
                      <View
                        style={[
                          styles.calDay,
                          { width: cellSize - 4, height: cellSize - 4 },
                          done && { backgroundColor: colors.primaryFill },
                          isToday && !done && { borderWidth: 2, borderColor: colors.primary },
                        ]}
                        accessible
                        accessibilityLabel={`${c.date}${done ? ", worked out" : ""}${isToday ? ", today" : ""}`}
                      >
                        <Text
                          style={[
                            styles.calText,
                            c.date > today && { color: colors.textTertiary },
                            done && { color: "#fff", fontWeight: "800" },
                            isToday && !done && { color: colors.primaryText, fontWeight: "800" },
                          ]}
                        >
                          {c.dayOfMonth}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ─── Progressive overload ─── */}
            {overloadEx && line && (
              <View style={[styles.card, { gap: 14 }]}>
                <View>
                  <Text style={styles.cardTitle}>Progressive overload</Text>
                  <Text style={styles.cardSub}>Your heaviest set each week</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBleed} contentContainerStyle={styles.chips}>
                  {candidates.map((name) => {
                    const on = name === overloadEx;
                    return (
                      <PressableScale
                        key={name}
                        onPress={() => setOverloadEx(name)}
                        haptic="select"
                        style={[styles.chip, on && { backgroundColor: colors.text }]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.chipText, on && { color: colors.background }]} numberOfLines={1}>{name}</Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
                <View style={styles.ovHead}>
                  <Text style={styles.ovNow}>
                    {trimNumber(series[series.length - 1])}
                    <Text style={styles.ovUnit}> {wu}</Text>
                  </Text>
                  {overloadGain !== 0 && (
                    <View style={[styles.deltaPill, { backgroundColor: overloadGain > 0 ? colors.successTint : colors.fill }]}>
                      {overloadGain > 0 ? (
                        <TrendingUp size={14} color={colors.success} strokeWidth={2.6} />
                      ) : (
                        <TrendingDown size={14} color={colors.textSecondary} strokeWidth={2.6} />
                      )}
                      <Text style={[styles.deltaText, { color: overloadGain > 0 ? colors.success : colors.textSecondary }]}>
                        {overloadGain > 0 ? "+" : ""}
                        {trimNumber(overloadGain)} {wu}
                      </Text>
                    </View>
                  )}
                </View>
                <Svg width="100%" height={LINE_H} viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none">
                  <Defs>
                    <SvgGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={overloadColor} stopOpacity={0.3} />
                      <Stop offset="1" stopColor={overloadColor} stopOpacity={0} />
                    </SvgGradient>
                  </Defs>
                  <Path d={line.area} fill="url(#ovFill)" />
                  <Polyline points={line.poly} fill="none" stroke={overloadColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  {line.pts.map((p, i) => (
                    <Circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={i === line.pts.length - 1 ? 6 : 3.5}
                      fill={colors.cardBackground}
                      stroke={overloadColor}
                      strokeWidth={i === line.pts.length - 1 ? 3 : 2}
                    />
                  ))}
                </Svg>
                <View style={styles.ovAxis}>
                  <Text style={styles.ovAxisText}>
                    {series.length} weeks ago · {trimNumber(series[0])} {wu}
                  </Text>
                  <Text style={styles.ovAxisText}>This week</Text>
                </View>
              </View>
            )}

            {/* ─── Muscle balance ─── */}
            {muscleDistribution.length > 0 && (
              <View style={[styles.card, { gap: 13 }]}>
                <View>
                  <Text style={styles.cardTitle}>Muscle balance</Text>
                  <Text style={styles.cardSub}>Share of all sets you&apos;ve logged</Text>
                </View>
                {muscleDistribution.map((m) => (
                  <View
                    key={m.group}
                    style={styles.muscleRow}
                    accessible
                    accessibilityLabel={`${MUSCLE_GROUP_LABELS[m.group]}: ${m.percentage} percent, ${m.count} sets`}
                  >
                    <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[m.group]}</Text>
                    <View style={styles.muscleTrack}>
                      <View style={[styles.muscleFill, { width: `${(m.percentage / maxMuscle) * 100}%`, backgroundColor: muscleColor(m.group, colors) }]} />
                    </View>
                    <Text style={styles.musclePct}>{m.percentage}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ─── Personal records ─── */}
            {prEntries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Personal records</Text>
                  <Text style={styles.sectionCount}>{prEntries.length}</Text>
                </View>
                <View style={styles.listCard}>
                  {prEntries.slice(0, 6).map((pr, i) => {
                    const mg = muscleByExercise.get(pr.name);
                    const isNew = pr.date >= recentCutoff;
                    return (
                      <View key={pr.name} style={[styles.prRow, i > 0 && styles.rowBorder]}>
                        <View style={[styles.prIcon, { backgroundColor: colors.goldTint }]}>
                          <Trophy size={17} color={colors.gold} strokeWidth={2.4} />
                        </View>
                        <View style={styles.flex}>
                          <View style={styles.nameRow}>
                            <Text style={styles.rowTitle} numberOfLines={1}>{pr.name}</Text>
                            {isNew && (
                              <View style={styles.newTag}>
                                <Text style={styles.newTagText}>NEW</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.nameRow}>
                            {mg && <View style={[styles.dot7, { backgroundColor: muscleColor(mg, colors) }]} />}
                            <Text style={styles.rowMeta}>{formatRelativeDate(pr.date)}</Text>
                          </View>
                        </View>
                        <View style={styles.prValues}>
                          <Text style={styles.prValue}>{pr.weight > 0 ? `${w(pr.weight)} × ${pr.reps}` : `BW × ${pr.reps}`}</Text>
                          {pr.estimated1RM > 0 && <Text style={styles.prSub}>est. max {w(pr.estimated1RM)}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ─── Recent workouts ─── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Workout log</Text>
                <Text style={styles.sectionCount}>{history.length}</Text>
              </View>
              <View style={styles.listCard}>
                {visibleHistory.map((h, i) => {
                  const d = new Date(h.completedAt);
                  const skipped = h.skippedExercises ?? h.exercises?.filter((e) => e.skipped).length ?? 0;
                  return (
                    <Pressable
                      key={h.id}
                      style={({ pressed }) => [styles.historyRow, i > 0 && styles.rowBorder, pressed && styles.pressed]}
                      onPress={() => setSelectedWorkout(h)}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.routineName}, ${formatShortDate(h.completedAt)}. ${workedExercises(h)} exercises, ${h.duration} minutes. Tap for details.`}
                    >
                      <View style={styles.dateCol}>
                        <Text style={styles.dow}>{DOW[d.getDay()]}</Text>
                        <Text style={styles.dayNum}>{d.getDate()}</Text>
                      </View>
                      <View style={[styles.flex, { gap: 2 }]}>
                        <View style={styles.nameRow}>
                          <View style={[styles.dot8, { backgroundColor: routineColor(h) }]} />
                          <Text style={styles.rowTitle} numberOfLines={1}>{h.routineName}</Text>
                        </View>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {workedExercises(h)} exercises · {h.duration} min
                          {skipped > 0 ? ` · ${skipped} skipped` : ""}
                        </Text>
                      </View>
                      {(h.totalVolume ?? 0) > 0 && <Text style={styles.historyVol}>{vol(h.totalVolume ?? 0)}</Text>}
                      <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
                    </Pressable>
                  );
                })}
              </View>
              {history.length > 8 && (
                <Pressable style={styles.showMore} onPress={() => setShowAllHistory((v) => !v)} accessibilityRole="button">
                  <Text style={styles.showMoreText}>{showAllHistory ? "Show fewer" : `Show all ${history.length} workouts`}</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── Workout detail sheet ─── */}
      <Sheet
        visible={selectedWorkout !== null}
        onClose={() => setSelectedWorkout(null)}
        eyebrow={selectedWorkout ? formatShortDate(selectedWorkout.completedAt) : undefined}
        title={selectedWorkout?.routineName}
      >
        {selectedWorkout && (
          <>
            <View style={styles.detailStats}>
              {[
                { v: `${selectedWorkout.duration}`, l: "min" },
                { v: formatVolume(selectedWorkout.totalVolume ?? 0, wu, false), l: wu },
                { v: `${selectedWorkout.completedSets ?? selectedWorkout.exercises?.reduce((a, e) => a + e.setsCompleted, 0) ?? "—"}`, l: "sets" },
                { v: `${selectedWorkout.newPRs ?? 0}`, l: "PRs" },
              ].map((s) => (
                <View key={s.l} style={styles.detailStat}>
                  <Text style={styles.detailStatValue}>{s.v}</Text>
                  <Text style={styles.detailStatLabel}>{s.l}</Text>
                </View>
              ))}
            </View>

            <View style={styles.detailCard}>
              {selectedWorkout.exercises?.length ? (
                selectedWorkout.exercises.map((ex, i) => (
                  <View key={`${ex.exerciseName}-${i}`} style={[styles.detailEx, i > 0 && styles.rowBorder]}>
                    <View style={styles.nameRow}>
                      <View style={[styles.dot7, { backgroundColor: muscleColor(ex.muscleGroup, colors) }]} />
                      <Text style={[styles.rowTitle, styles.flex]} numberOfLines={1}>{ex.exerciseName}</Text>
                      {ex.skipped ? (
                        <View style={styles.skipTag}>
                          <Text style={styles.skipTagText}>Skipped</Text>
                        </View>
                      ) : (
                        <View style={styles.doneTag}>
                          <Check size={11} color={colors.success} strokeWidth={3.2} />
                          <Text style={[styles.skipTagText, { color: colors.success }]}>
                            {ex.setsCompleted}/{ex.totalSets}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!ex.skipped && (ex.sets?.length ?? 0) > 0 && (
                      <View style={styles.setChips}>
                        {ex.sets!.map((s, si) => (
                          <View key={si} style={styles.setChip}>
                            <Text style={styles.setChipText}>
                              {formatWeight(s.weight, wu, { withUnit: false })} × {s.reps}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {!ex.skipped && !ex.sets?.length && ex.bestSet.weight > 0 && (
                      <Text style={[styles.rowMeta, { paddingLeft: 15 }]}>
                        Best: {formatWeight(ex.bestSet.weight, wu)} × {ex.bestSet.reps}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.detailEmpty}>This entry was logged before per-exercise detail was recorded.</Text>
              )}
            </View>

            <PressableScale style={styles.deleteBtn} onPress={() => handleDeleteWorkout(selectedWorkout)} accessibilityRole="button">
              <Text style={styles.deleteBtnText}>Delete workout</Text>
            </PressableScale>
          </>
        )}
      </Sheet>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    pressed: { opacity: 0.6 },
    scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 16 },
    title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, lineHeight: 40, color: colors.text, paddingTop: 4 },
    card: { ...card(colors, 26), padding: 20 },
    kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 0.9, textTransform: "uppercase", color: colors.textTertiary },
    bigNumber: { fontSize: 38, fontWeight: "800", letterSpacing: -1.5, lineHeight: 44, color: colors.text, marginTop: 2, fontVariant: ["tabular-nums"] },
    volHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    deltaPill: { flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15 },
    deltaText: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
    avgLine: { position: "absolute", left: 0, right: 0, height: 2 },
    bars: { height: CHART_H + 20, flexDirection: "row", alignItems: "flex-end" },
    barCol: { flex: 1, minWidth: 0, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 6 },
    bar: { width: "100%", borderRadius: 9 },
    barLabel: { height: 14, fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    chartHint: { fontSize: 12, fontWeight: "500", color: colors.textTertiary, marginTop: -4 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    statTile: { ...card(colors, 22), flexBasis: "46%", flexGrow: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    statIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 21, fontWeight: "800", letterSpacing: -0.7, color: colors.text, fontVariant: ["tabular-nums"] },
    statLabel: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 1 },
    upsell: { borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden" },
    upsellIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    upsellTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: "#fff" },
    upsellBody: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    upsellPill: { backgroundColor: "#fff", height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center" },
    upsellPillText: { fontSize: 13, fontWeight: "800", color: "#1D4ED8" },
    cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    cardTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    cardSub: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 2 },
    streakPill: { flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 16, backgroundColor: colors.fill },
    streakText: { fontSize: 12, fontWeight: "800", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    calGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
    calWeekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontWeight: "800", color: colors.textTertiary, paddingBottom: 4 },
    calCell: { width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" },
    calDay: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
    calText: { fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
    chipBleed: { marginHorizontal: -20, flexGrow: 0 },
    chips: { gap: 6, paddingHorizontal: 20 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.fill, justifyContent: "center" },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
    ovHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    ovNow: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, color: colors.text, fontVariant: ["tabular-nums"] },
    ovUnit: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3, color: colors.textTertiary },
    ovAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: -6 },
    ovAxisText: { fontSize: 11, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    muscleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    muscleName: { width: 82, fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    muscleTrack: { flex: 1, height: 10, borderRadius: 999, backgroundColor: colors.fill, overflow: "hidden" },
    muscleFill: { height: "100%", borderRadius: 999 },
    musclePct: { width: 38, textAlign: "right", fontSize: 13, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    section: { gap: 12, paddingTop: 6 },
    sectionHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    sectionTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    sectionCount: { fontSize: 15, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    listCard: { ...card(colors, 24), paddingVertical: 4, paddingHorizontal: 16 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    dot8: { width: 8, height: 8, borderRadius: 4 },
    dot7: { width: 7, height: 7, borderRadius: 4 },
    rowTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2, color: colors.text, flexShrink: 1 },
    rowMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    prRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, paddingVertical: 10 },
    prIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    newTag: { paddingHorizontal: 6, height: 18, borderRadius: 6, backgroundColor: colors.successTint, justifyContent: "center" },
    newTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, color: colors.success },
    prValues: { alignItems: "flex-end", gap: 2 },
    prValue: { fontSize: 16, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    prSub: { fontSize: 11, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    historyRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 10 },
    dateCol: { width: 44, height: 46, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    dow: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, color: colors.textTertiary },
    dayNum: { fontSize: 17, fontWeight: "800", lineHeight: 20, color: colors.text, fontVariant: ["tabular-nums"] },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    historyVol: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    showMore: { height: 44, alignItems: "center", justifyContent: "center" },
    showMoreText: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
    empty: { ...card(colors, 28), paddingVertical: 34, paddingHorizontal: 24, alignItems: "center", gap: 8 },
    emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    emptyTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    emptyBody: { fontSize: 14, fontWeight: "500", lineHeight: 20, color: colors.textTertiary, textAlign: "center", maxWidth: 270 },
    emptyBtn: { height: 50, paddingHorizontal: 22, marginTop: 10, borderRadius: 16, backgroundColor: colors.primaryFill, justifyContent: "center" },
    emptyBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    detailStats: { flexDirection: "row", gap: 8 },
    detailStat: { flex: 1, backgroundColor: colors.fill, borderRadius: 16, paddingVertical: 12, alignItems: "center", gap: 1 },
    detailStatValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text, fontVariant: ["tabular-nums"] },
    detailStatLabel: { fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    detailCard: { backgroundColor: colors.card2, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 4, paddingHorizontal: 16 },
    detailEx: { gap: 9, paddingVertical: 13 },
    skipTag: { backgroundColor: colors.fill, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 },
    doneTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successTint, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 },
    skipTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    setChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 14 },
    setChip: { backgroundColor: colors.cardBackground, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
    setChipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    detailEmpty: { paddingVertical: 18, fontSize: 14, fontWeight: "600", color: colors.textTertiary, textAlign: "center" },
    deleteBtn: { height: 52, borderRadius: 16, backgroundColor: colors.errorLight, alignItems: "center", justifyContent: "center" },
    deleteBtnText: { fontSize: 15, fontWeight: "800", color: colors.error },
  });
