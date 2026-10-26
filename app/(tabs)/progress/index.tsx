import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { BarChart3, ChevronRight, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { dominantMuscleColor, elevation, gradient, muscleColor } from "@/constants/theme";
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
import { summarizeRange, formatDelta, overloadCandidates, overloadSeries, type ProgressRange } from "@/utils/progressStats";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";
import { Segmented } from "@/components/ui";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const RANGES: { label: string; value: ProgressRange }[] = [
  { label: "4 weeks", value: "4w" },
  { label: "3 months", value: "3m" },
  { label: "Year", value: "1y" },
];
const CHART_H = 112;
const LINE_W = 320;
const LINE_H = 120;

function workedExercises(h: WorkoutHistory): number {
  return h.completedExercises ?? h.exercises?.filter((e) => !e.skipped && e.setsCompleted > 0).length ?? h.exerciseCount;
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { streak, history, refreshData, personalRecords, routines, settings, premium, currentSession, deleteWorkout } = useGym();
  const wu = settings.weightUnit;
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<ProgressRange>("4w");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [overloadEx, setOverloadEx] = useState<string | null>(null);

  const hasHistory = history.length > 0;
  const dark = colors.scheme === "dark";

  const summary = useMemo(() => summarizeRange(history, range, settings.weekStartsOn), [history, range, settings.weekStartsOn]);
  const delta = formatDelta(summary.total, summary.previousTotal);
  const maxBar = Math.max(...summary.bars.map((b) => b.value), 1);

  const calendarDates = useMemo(() => getMonthCalendarDates(settings.weekStartsOn), [settings.weekStartsOn]);
  const weekdayLabels = useMemo(() => weekdayInitials(settings.weekStartsOn), [settings.weekStartsOn]);
  const today = getToday();
  const completedDatesSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);
  const monthWorkouts = calendarDates.filter((d) => d.isCurrentMonth && completedDatesSet.has(d.date)).length;
  const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const cellSize = Math.min(38, Math.floor((width - 40 - 36 - 24) / 7));

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
    const pts = series.map((v, i) => [10 + i * ((LINE_W - 20) / (series.length - 1)), 104 - ((v - min) / (max - min || 1)) * 84]);
    const poly = pts.map((p) => p.join(",")).join(" ");
    return {
      poly,
      area: `M${pts[0][0]},${CHART_H} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${CHART_H} Z`,
      last: pts[pts.length - 1],
    };
  }, [series]);

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

  const visibleHistory = showAllHistory ? history : history.slice(0, 10);
  const routineColor = useCallback(
    (h: WorkoutHistory) =>
      (routines.find((r) => r.id === h.routineId) ?? routines.find((r) => r.name === h.routineName))?.color ?? dominantMuscleColor(h.muscleGroups ?? [], colors) ?? colors.primary,
    [routines, colors],
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
        ],
      );
    },
    [deleteWorkout],
  );

  const vol = (lbs: number) => formatVolume(lbs, wu);
  const w = (lbs: number) => trimNumber(toDisplayWeight(lbs, wu));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>Progress</Text>

        {!hasHistory ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <BarChart3 size={26} color={colors.primaryText} />
            </View>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyBody}>Your charts, calendar and records fill in as you train.</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/(home)")} style={styles.emptyBtn} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Start a workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Segmented options={RANGES} value={range} onChange={setRange} label="Time range" />

            {/* ─── Volume ─── */}
            <View style={[styles.card, { gap: 14 }]}>
              <View style={{ gap: 2 }}>
                <Text style={styles.cardKicker}>Total volume</Text>
                <Text style={styles.bigNumber}>{vol(summary.total)}</Text>
                {delta && (
                  <Text style={[styles.delta, { color: delta.startsWith("-") ? colors.textTertiary : colors.success }]}>{delta}</Text>
                )}
              </View>
              <View style={[styles.bars, { gap: summary.bars.length > 6 ? 6 : 14 }]}>
                {summary.bars.map((b, i) => {
                  const h = Math.max(4, Math.round((b.value / maxBar) * CHART_H));
                  return (
                    <View
                      key={i}
                      style={styles.barCol}
                      accessible
                      accessibilityLabel={`${b.label || "Period"}: ${vol(b.value)}`}
                    >
                      {b.current ? (
                        <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={[styles.bar, { height: h }]} />
                      ) : (
                        <View style={[styles.bar, { height: h, backgroundColor: dark ? "rgba(96,165,250,0.3)" : "rgba(59,130,246,0.22)" }]} />
                      )}
                      <Text style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ─── Stats ─── */}
            <View style={styles.statGrid}>
              {[
                [String(summary.workouts), "Workouts"],
                [String(summary.newPRs), "New PRs"],
                [summary.avgMinutes ? `${summary.avgMinutes} min` : "—", "Avg session"],
                [summary.totalMinutes ? formatDuration(summary.totalMinutes) : "—", "Total time"],
              ].map(([v, l]) => (
                <View key={l} style={styles.statTile}>
                  <Text style={styles.statValue}>{v}</Text>
                  <Text style={styles.statLabel}>{l}</Text>
                </View>
              ))}
            </View>

            {/* ─── Pro upsell ─── */}
            {!premium.isPremium && (
              <TouchableOpacity onPress={() => router.push("/paywall")} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Go deeper with Pro">
                <LinearGradient colors={["#0B1220", "#1E3A8A", "#4F46E5"]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsell}>
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
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ─── Calendar ─── */}
            <View style={[styles.card, { gap: 14 }]}>
              <View style={styles.cardHeadRow}>
                <Text style={styles.cardTitle}>{monthName}</Text>
                <Text style={styles.cardMeta}>{monthWorkouts} workout{monthWorkouts === 1 ? "" : "s"}</Text>
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
                          done && { backgroundColor: colors.primary },
                          isToday && !done && { borderWidth: 2, borderColor: colors.primary },
                        ]}
                        accessible
                        accessibilityLabel={`${c.date}${done ? ", worked out" : ""}${isToday ? ", today" : ""}`}
                      >
                        <Text
                          style={[
                            styles.calText,
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
                <Text style={styles.cardTitle}>Progressive overload</Text>
                <View style={styles.chips}>
                  {candidates.map((name) => {
                    const on = name === overloadEx;
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setOverloadEx(name)}
                        style={[styles.chip, on && { backgroundColor: colors.text }]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.chipText, on && { color: colors.background }]} numberOfLines={1}>{name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.ovHead}>
                  <View style={styles.flex}>
                    <Text style={styles.ovKicker} numberOfLines={1}>Top set · {overloadEx}</Text>
                    <Text style={styles.ovNow}>
                      {trimNumber(series[series.length - 1])} {wu}
                    </Text>
                  </View>
                  {series[series.length - 1] !== series[0] && (
                    <View style={[styles.ovDelta, { backgroundColor: colors.successLight }]}>
                      <Text style={[styles.ovDeltaText, { color: colors.success }]}>
                        {series[series.length - 1] > series[0] ? "+" : ""}
                        {trimNumber(series[series.length - 1] - series[0])} {wu} in {series.length} weeks
                      </Text>
                    </View>
                  )}
                </View>
                <Svg width="100%" height={LINE_H} viewBox={`0 0 ${LINE_W} ${LINE_H}`} preserveAspectRatio="none">
                  <Path d={line.area} fill={overloadColor} opacity={0.14} />
                  <Polyline points={line.poly} fill="none" stroke={overloadColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={line.last[0]} cy={line.last[1]} r={6} fill={colors.cardBackground} stroke={overloadColor} strokeWidth={3} />
                </Svg>
                <View style={styles.ovAxis}>
                  <Text style={styles.ovAxisText}>{series.length} weeks ago</Text>
                  <Text style={styles.ovAxisText}>This week</Text>
                </View>
              </View>
            )}

            {/* ─── Muscle balance ─── */}
            {muscleDistribution.length > 0 && (
              <View style={[styles.card, { gap: 12 }]}>
                <View style={styles.cardHeadRow}>
                  <Text style={styles.cardTitle}>Muscle balance</Text>
                  <Text style={styles.cardMeta}>by sets</Text>
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
                <Text style={styles.sectionTitle}>Personal records</Text>
                <View style={styles.listCard}>
                  {prEntries.slice(0, 8).map((pr, i, a) => {
                    const mg = muscleByExercise.get(pr.name);
                    const isNew = pr.date >= recentCutoff;
                    return (
                      <View key={pr.name} style={[styles.prRow, i < a.length - 1 && styles.rowBorder]}>
                        <View style={[styles.dot8, { backgroundColor: mg ? muscleColor(mg, colors) : colors.textTertiary }]} />
                        <View style={styles.flex}>
                          <Text style={styles.rowTitle} numberOfLines={1}>{pr.name}</Text>
                          <Text style={styles.rowMeta}>{formatRelativeDate(pr.date)}</Text>
                        </View>
                        <View style={styles.prValues}>
                          <Text style={styles.prValue}>
                            {pr.weight > 0 ? `${w(pr.weight)} × ${pr.reps}` : `BW × ${pr.reps}`}
                          </Text>
                          {isNew ? (
                            <Text style={[styles.prSub, { color: colors.success }]}>New</Text>
                          ) : pr.estimated1RM > 0 ? (
                            <Text style={styles.prSub}>e1RM {w(pr.estimated1RM)}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ─── Recent workouts ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent workouts</Text>
              <View style={styles.listCard}>
                {visibleHistory.map((h, i) => {
                  const d = new Date(h.completedAt);
                  const skipped = h.skippedExercises ?? h.exercises?.filter((e) => e.skipped).length ?? 0;
                  return (
                    <TouchableOpacity
                      key={h.id}
                      style={[styles.historyRow, i < visibleHistory.length - 1 && styles.rowBorder]}
                      onPress={() => setSelectedWorkout(h)}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.routineName}, ${formatShortDate(h.completedAt)}. ${workedExercises(h)} exercises, ${h.duration} minutes. Tap for details.`}
                    >
                      <View style={styles.dateCol}>
                        <Text style={styles.dow}>{DOW[d.getDay()]}</Text>
                        <Text style={styles.dayNum}>{d.getDate()}</Text>
                      </View>
                      <View style={[styles.flex, { gap: 3 }]}>
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
                    </TouchableOpacity>
                  );
                })}
              </View>
              {history.length > 10 && (
                <TouchableOpacity style={styles.showMore} onPress={() => setShowAllHistory((v) => !v)} accessibilityRole="button">
                  <Text style={styles.showMoreText}>{showAllHistory ? "Show less" : `Show all ${history.length}`}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── Workout detail sheet ─── */}
      <Modal visible={selectedWorkout !== null} transparent animationType="slide" onRequestClose={() => setSelectedWorkout(null)}>
        <View style={styles.sheetRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedWorkout(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetKicker}>Workout</Text>
              <TouchableOpacity onPress={() => setSelectedWorkout(null)} style={styles.sheetDone} accessibilityRole="button">
                <Text style={styles.sheetDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            {selectedWorkout && (
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 4, marginTop: -4 }}>
                  <View style={styles.nameRow}>
                    <View style={[styles.sheetMark, { backgroundColor: routineColor(selectedWorkout) }]} />
                    <Text style={styles.sheetTitle} numberOfLines={2}>{selectedWorkout.routineName}</Text>
                  </View>
                  <Text style={styles.sheetMeta}>
                    {formatShortDate(selectedWorkout.completedAt)} · {selectedWorkout.duration} min
                    {(selectedWorkout.totalVolume ?? 0) > 0 ? ` · ${vol(selectedWorkout.totalVolume ?? 0)}` : ""}
                    {(selectedWorkout.newPRs ?? 0) > 0 ? ` · ${selectedWorkout.newPRs} PR${(selectedWorkout.newPRs ?? 0) > 1 ? "s" : ""}` : ""}
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  {selectedWorkout.exercises?.length ? (
                    selectedWorkout.exercises.map((ex, i, a) => (
                      <View key={`${ex.exerciseName}-${i}`} style={[styles.detailEx, i < a.length - 1 && styles.rowBorder]}>
                        <View style={styles.nameRow}>
                          <View style={[styles.dot7, { backgroundColor: muscleColor(ex.muscleGroup, colors) }]} />
                          <Text style={[styles.rowTitle, styles.flex]} numberOfLines={1}>{ex.exerciseName}</Text>
                          {ex.skipped && (
                            <View style={styles.skipTag}>
                              <Text style={styles.skipTagText}>Skipped</Text>
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

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteWorkout(selectedWorkout)} accessibilityRole="button">
                  <Text style={styles.deleteBtnText}>Delete workout</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => {
  const card = {
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...elevation(1, colors),
  };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
    title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.1, lineHeight: 38, color: colors.text, paddingTop: 4 },
    card: { ...card, padding: 18 },
    cardKicker: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    bigNumber: { fontSize: 32, fontWeight: "800", letterSpacing: -1.1, lineHeight: 36, color: colors.text, fontVariant: ["tabular-nums"] },
    delta: { fontSize: 13, fontWeight: "700" },
    bars: { height: CHART_H + 20, flexDirection: "row", alignItems: "flex-end" },
    barCol: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
    bar: { width: "100%", borderRadius: 7 },
    barLabel: { height: 14, fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statTile: { ...card, borderRadius: 18, flexBasis: "47%", flexGrow: 1, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
    statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text, fontVariant: ["tabular-nums"] },
    statLabel: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    upsell: { borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
    upsellIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    upsellTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
    upsellBody: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.8)", marginTop: 2 },
    upsellPill: { backgroundColor: "#fff", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999 },
    upsellPillText: { fontSize: 13, fontWeight: "800", color: "#1D4ED8" },
    cardHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    cardMeta: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    calGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
    calWeekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontWeight: "800", color: colors.textTertiary, paddingBottom: 4 },
    calCell: { width: `${100 / 7}%`, height: 38, alignItems: "center", justifyContent: "center" },
    calDay: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
    calText: { fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.fill, justifyContent: "center", maxWidth: "100%" },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
    ovHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
    ovKicker: { fontSize: 12, fontWeight: "700", color: colors.textTertiary },
    ovNow: { fontSize: 28, fontWeight: "800", letterSpacing: -1, color: colors.text, fontVariant: ["tabular-nums"] },
    ovDelta: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, marginBottom: 6 },
    ovDeltaText: { fontSize: 13, fontWeight: "800" },
    ovAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: -6 },
    ovAxisText: { fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    muscleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    muscleName: { width: 80, fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    muscleTrack: { flex: 1, height: 10, borderRadius: 999, backgroundColor: colors.fill, overflow: "hidden" },
    muscleFill: { height: "100%", borderRadius: 999 },
    musclePct: { width: 38, textAlign: "right", fontSize: 13, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    section: { gap: 10 },
    sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    listCard: { ...card, paddingVertical: 4, paddingHorizontal: 16 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    dot8: { width: 8, height: 8, borderRadius: 4 },
    dot7: { width: 7, height: 7, borderRadius: 4 },
    rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
    rowMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    prRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, paddingVertical: 8 },
    prValues: { alignItems: "flex-end", gap: 2 },
    prValue: { fontSize: 15, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    prSub: { fontSize: 12, fontWeight: "800", color: colors.textTertiary },
    historyRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 8 },
    dateCol: { width: 52, alignItems: "center", paddingRight: 12, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.separator },
    dow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: colors.textTertiary },
    dayNum: { fontSize: 20, fontWeight: "800", lineHeight: 24, color: colors.text, fontVariant: ["tabular-nums"] },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    historyVol: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    showMore: { height: 44, alignItems: "center", justifyContent: "center" },
    showMoreText: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
    empty: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.fillStrong,
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 22,
      alignItems: "center",
      gap: 10,
    },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    emptyBody: { fontSize: 14, fontWeight: "500", color: colors.textTertiary, textAlign: "center", maxWidth: 260 },
    emptyBtn: { height: 48, paddingHorizontal: 22, marginTop: 6, borderRadius: 14, backgroundColor: colors.fill, justifyContent: "center" },
    emptyBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },
    sheetRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { maxHeight: "86%", backgroundColor: colors.cardBackground, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...elevation(3, colors) },
    handleRow: { alignItems: "center", paddingTop: 8 },
    handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong },
    sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingBottom: 4, paddingLeft: 20, paddingRight: 12 },
    sheetKicker: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textTertiary },
    sheetDone: { height: 44, paddingHorizontal: 8, justifyContent: "center" },
    sheetDoneText: { fontSize: 16, fontWeight: "800", color: colors.primaryText },
    sheetBody: { paddingHorizontal: 20, gap: 14 },
    sheetMark: { width: 12, height: 12, borderRadius: 4 },
    sheetTitle: { flexShrink: 1, fontSize: 26, fontWeight: "800", letterSpacing: -0.8, color: colors.text },
    sheetMeta: { fontSize: 14, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    detailCard: { backgroundColor: colors.card2, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 4, paddingHorizontal: 16 },
    detailEx: { gap: 8, paddingVertical: 12 },
    skipTag: { backgroundColor: colors.fill, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    skipTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: colors.textTertiary },
    setChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 15 },
    setChip: { backgroundColor: colors.cardBackground, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 9 },
    setChipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    detailEmpty: { paddingVertical: 16, fontSize: 14, fontWeight: "600", color: colors.textTertiary, textAlign: "center" },
    deleteBtn: { height: 50, borderRadius: 14, backgroundColor: colors.errorLight, alignItems: "center", justifyContent: "center" },
    deleteBtnText: { fontSize: 15, fontWeight: "800", color: colors.error },
  });
};
