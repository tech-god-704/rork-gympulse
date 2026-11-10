import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Modal, Platform, KeyboardAvoidingView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, LayoutGrid, ListPlus, Play, PlayCircle, CalendarDays } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TextInput } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card, dominantMuscleColor, glow, gradient, muscleColor } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, Routine, WeekDay, WEEKDAY_SHORT } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";
import { planSchedule } from "@/utils/routinePlanning";
import { haptic } from "@/utils/haptics";
import { WORKOUT_SPLITS, ROUTINE_NAME_SUGGESTIONS, type WorkoutSplit } from "@/mocks/exercises";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";
import ExerciseDemoThumb from "@/components/ExerciseDemoThumb";
import { useStartWorkout } from "@/hooks/useStartWorkout";

const WEEK: { day: WeekDay; letter: string }[] = [
  { day: "monday", letter: "M" },
  { day: "tuesday", letter: "T" },
  { day: "wednesday", letter: "W" },
  { day: "thursday", letter: "T" },
  { day: "friday", letter: "F" },
  { day: "saturday", letter: "S" },
  { day: "sunday", letter: "S" },
];

/** The first four splits are GymPulse's own programs; the rest are the classics. */
const FEATURED_COUNT = 4;

const stripDays = (desc: string) => {
  const rest = desc.replace(/^\d+ days per week\s*[—-]\s*/i, "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

export default function RoutinesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ open?: string }>();
  const { routines, addRoutine, addRoutinesFromTemplates, reorderRoutine, currentSession } = useGym();
  const startRoutine = useStartWorkout();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);
  const [reordering, setReordering] = useState(false);

  // Today's empty state links straight into the splits browser or the new-routine dialog.
  useEffect(() => {
    if (params.open === "splits") setShowTemplates(true);
    else if (params.open === "create") setShowCreate(true);
    if (params.open) router.setParams({ open: undefined });
  }, [params.open, router]);

  const handleCreate = useCallback(() => {
    if (newName.trim().length === 0) return;
    const routine = addRoutine(newName.trim());
    if (!routine) return;
    setNewName("");
    setShowCreate(false);
    haptic.medium();
    router.push(`/(tabs)/routines/${routine.id}`);
  }, [newName, addRoutine, router]);

  const handleConfirmSplit = useCallback(() => {
    if (!selectedSplit) return;
    addRoutinesFromTemplates(selectedSplit.routines, { daysPerWeek: selectedSplit.daysPerWeek });
    haptic.success();
    setSelectedSplit(null);
    setShowTemplates(false);
  }, [selectedSplit, addRoutinesFromTemplates]);

  const describe = useCallback((routine: Routine) => {
    const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
    if (routine.exercises.length === 0) return "Empty · tap to add exercises";
    const mins = estimateRoutineDuration(routine.exercises.length, setCount);
    return `${routine.exercises.length} exercises · ${setCount} sets · ~${mins} min`;
  }, []);

  const closeTemplates = useCallback(() => {
    if (selectedSplit) setSelectedSplit(null);
    else setShowTemplates(false);
  }, [selectedSplit]);

  const move = useCallback(
    (id: string, dir: "up" | "down") => {
      reorderRoutine(id, dir);
      haptic.select();
    },
    [reorderRoutine],
  );

  const takenDays = useMemo(() => routines.flatMap((r) => r.scheduledDays ?? []), [routines]);
  const previewSchedule = useMemo(
    () => (selectedSplit ? planSchedule(selectedSplit.routines.length, selectedSplit.daysPerWeek, takenDays) : []),
    [selectedSplit, takenDays],
  );

  const featured = WORKOUT_SPLITS.slice(0, FEATURED_COUNT);
  const classic = WORKOUT_SPLITS.slice(FEATURED_COUNT);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Routines</Text>
          <View style={styles.headerActions}>
            {routines.length > 1 && (
              <Pressable
                onPress={() => setReordering((r) => !r)}
                style={styles.textBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={reordering ? "Done reordering" : "Reorder routines"}
              >
                <Text style={styles.textBtnLabel}>{reordering ? "Done" : "Reorder"}</Text>
              </Pressable>
            )}
            <PressableScale
              onPress={() => setShowCreate(true)}
              haptic="light"
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Create a new routine"
            >
              <Plus size={22} color="#fff" strokeWidth={2.6} />
            </PressableScale>
          </View>
        </View>

        <FadeIn>
          <PressableScale
            onPress={() => setShowTemplates(true)}
            scaleTo={0.98}
            style={[styles.splitsCard, glow("#1D46D8", colors, 0.28)]}
            accessibilityRole="button"
            accessibilityLabel="Browse workout splits"
          >
            <HeroBackdrop tone="ink" radius={26} />
            <View style={styles.splitsIcon}>
              <LayoutGrid size={22} color="#fff" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.splitsTitle}>Workout splits</Text>
              <Text style={styles.splitsSub}>{WORKOUT_SPLITS.length} proven programs, added in one tap</Text>
            </View>
            <View style={styles.splitsGo}>
              <ChevronRight size={18} color="#0F1F66" strokeWidth={2.8} />
            </View>
          </PressableScale>
        </FadeIn>

        {routines.length === 0 ? (
          <FadeIn delay={80} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <ListPlus size={26} color={colors.primaryText} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyBody}>Add a whole split in one tap, or build a routine exercise by exercise.</Text>
            <PressableScale onPress={() => setShowCreate(true)} style={styles.emptyBtn} accessibilityRole="button">
              <Plus size={16} color={colors.primaryText} strokeWidth={2.6} />
              <Text style={styles.emptyBtnText}>Create routine</Text>
            </PressableScale>
          </FadeIn>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>My routines · {routines.length}</Text>
            {routines.map((routine, idx) => {
              const groups = [...new Set(routine.exercises.map((e) => e.muscleGroup))];
              const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
              const scheduled = routine.scheduledDays ?? [];
              const first = idx === 0;
              const last = idx === routines.length - 1;
              const peek = routine.exercises.slice(0, 3);

              return (
                <FadeIn key={routine.id} delay={80 + idx * 50}>
                  <PressableScale
                    style={styles.routineCard}
                    scaleTo={0.985}
                    disabled={false}
                    onPress={() => !reordering && router.push(`/(tabs)/routines/${routine.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${routine.name}. ${describe(routine)}. Edit routine.`}
                  >
                    <View style={[styles.accentBar, { backgroundColor: accent }]} />
                    <View style={styles.routineTop}>
                      <View style={styles.flex}>
                        <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
                        <Text style={styles.routineMeta} numberOfLines={1}>{describe(routine)}</Text>
                      </View>
                      {reordering ? (
                        <View style={styles.reorder}>
                          <PressableScale
                            onPress={() => move(routine.id, "up")}
                            disabled={first}
                            style={styles.reorderBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${routine.name} up`}
                          >
                            <ChevronUp size={18} color={colors.text} strokeWidth={2.6} />
                          </PressableScale>
                          <PressableScale
                            onPress={() => move(routine.id, "down")}
                            disabled={last}
                            style={styles.reorderBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${routine.name} down`}
                          >
                            <ChevronDown size={18} color={colors.text} strokeWidth={2.6} />
                          </PressableScale>
                        </View>
                      ) : (
                        peek.length > 0 && (
                          <View style={styles.peek}>
                            {peek.map((e, i) => (
                              <View key={e.id} style={[styles.peekThumb, i > 0 && styles.peekOverlap]}>
                                <ExerciseDemoThumb exerciseName={e.exerciseName} muscleGroup={e.muscleGroup} width={34} height={44} radius={10} interactive={false} />
                              </View>
                            ))}
                          </View>
                        )
                      )}
                    </View>

                    {groups.length > 0 && (
                      <View style={styles.tags}>
                        {groups.map((mg) => (
                          <View key={mg} style={styles.tag}>
                            <View style={[styles.tagDot, { backgroundColor: muscleColor(mg, colors) }]} />
                            <Text style={styles.tagText}>{MUSCLE_GROUP_LABELS[mg]}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.routineBottom}>
                      <View style={styles.days}>
                        {WEEK.map(({ day, letter }) => {
                          const on = scheduled.includes(day);
                          return (
                            <View key={day} style={[styles.day, on && { backgroundColor: accent }]}>
                              <Text style={[styles.dayText, on && { color: "#fff" }]}>{letter}</Text>
                            </View>
                          );
                        })}
                      </View>
                      {!reordering && routine.exercises.length > 0 && (
                        <PressableScale
                          onPress={() => startRoutine(routine)}
                          style={styles.startBtn}
                          scaleTo={0.94}
                          accessibilityRole="button"
                          accessibilityLabel={`Start ${routine.name}`}
                        >
                          <Play size={12} color={colors.primaryText} fill={colors.primaryText} />
                          <Text style={styles.startText}>Start</Text>
                        </PressableScale>
                      )}
                    </View>
                  </PressableScale>
                </FadeIn>
              );
            })}
          </View>
        )}

        <PressableScale
          onPress={() => router.push("/exercise")}
          scaleTo={0.98}
          style={styles.libraryRow}
          accessibilityRole="button"
          accessibilityLabel="Open the exercise library"
        >
          <View style={styles.libraryIcon}>
            <PlayCircle size={20} color={colors.primaryText} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.libraryTitle}>Exercise library</Text>
            <Text style={styles.librarySub}>Form demos for every move</Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
        </PressableScale>
      </ScrollView>

      {/* ─── Create Routine ─────────────────────────────────── */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)} accessibilityLabel="Close" />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>New routine</Text>
            <TextInput
              style={styles.dialogInput}
              value={newName}
              onChangeText={(t) => setNewName(t.slice(0, 50))}
              placeholder="Routine name"
              maxLength={50}
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              accessibilityLabel="Routine name"
            />
            <View style={styles.suggestions}>
              {ROUTINE_NAME_SUGGESTIONS.map((name) => {
                const active = newName === name;
                return (
                  <PressableScale
                    key={name}
                    style={[styles.suggestion, active && { backgroundColor: colors.primaryFill }]}
                    haptic="select"
                    onPress={() => setNewName(name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.suggestionText, active && { color: "#fff" }]}>{name}</Text>
                  </PressableScale>
                );
              })}
            </View>
            <View style={styles.dialogActions}>
              <PressableScale
                style={[styles.dialogBtn, { backgroundColor: colors.fill }]}
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.dialogBtnText, { color: colors.text, fontWeight: "700" }]}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.dialogBtn, { backgroundColor: colors.primaryFill }]}
                onPress={handleCreate}
                disabled={!newName.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.dialogBtnText}>Create</Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Workout Splits / Split Preview ─────────────────── */}
      <Modal visible={showTemplates} animationType="slide" onRequestClose={closeTemplates}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {!selectedSplit ? (
            <ScrollView contentContainerStyle={[styles.scroll, { gap: 14, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
              <Pressable onPress={closeTemplates} style={styles.back} hitSlop={6} accessibilityRole="button" accessibilityLabel="Back to routines">
                <ChevronLeft size={22} color={colors.primaryText} strokeWidth={2.6} />
                <Text style={styles.backText}>Routines</Text>
              </Pressable>
              <View style={styles.pageHead}>
                <Text style={styles.title}>Workout splits</Text>
                <Text style={styles.pageSub}>Add a split and every routine lands in your list, already scheduled.</Text>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.primaryText, paddingTop: 8 }]}>GymPulse programs</Text>
              {featured.map((split) => (
                <PressableScale
                  key={split.id}
                  style={styles.featuredCard}
                  scaleTo={0.98}
                  onPress={() => setSelectedSplit(split)}
                  accessibilityRole="button"
                  accessibilityLabel={`${split.name}. ${split.daysPerWeek} days a week. ${split.shortDescription}`}
                >
                  <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.daysBadge}>
                    <Text style={styles.daysBadgeNum}>{split.daysPerWeek}</Text>
                    <Text style={styles.daysBadgeLabel}>days</Text>
                  </LinearGradient>
                  <View style={[styles.flex, { gap: 3 }]}>
                    <Text style={styles.featuredName}>{split.name}</Text>
                    <Text style={styles.featuredDesc}>{stripDays(split.shortDescription)}</Text>
                    <Text style={styles.featuredRoutines} numberOfLines={1}>
                      {split.routines.map((r) => r.name).join(" · ")}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
                </PressableScale>
              ))}

              <Text style={[styles.sectionLabel, { paddingTop: 12 }]}>Classic splits</Text>
              <View style={styles.classicCard}>
                {classic.map((split, i) => (
                  <Pressable
                    key={split.id}
                    style={({ pressed }) => [styles.classicRow, i < classic.length - 1 && styles.rowBorder, pressed && styles.pressed]}
                    onPress={() => setSelectedSplit(split)}
                    accessibilityRole="button"
                    accessibilityLabel={`${split.name}. ${split.daysPerWeek} days a week.`}
                  >
                    <View style={styles.classicDays}>
                      <Text style={styles.classicDaysNum}>{split.daysPerWeek}</Text>
                      <Text style={styles.classicDaysLabel}>days</Text>
                    </View>
                    <View style={[styles.flex, { gap: 2 }]}>
                      <Text style={styles.classicName}>{split.name}</Text>
                      <Text style={styles.featuredDesc}>{stripDays(split.shortDescription)}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.flex}>
              <ScrollView contentContainerStyle={[styles.scroll, { gap: 14, paddingBottom: 130 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                <Pressable onPress={closeTemplates} style={styles.back} hitSlop={6} accessibilityRole="button" accessibilityLabel="Back to splits">
                  <ChevronLeft size={22} color={colors.primaryText} strokeWidth={2.6} />
                  <Text style={styles.backText}>Splits</Text>
                </Pressable>
                <View style={[styles.pageHead, { gap: 8 }]}>
                  <View style={styles.daysPill}>
                    <CalendarDays size={13} color={colors.primaryText} strokeWidth={2.4} />
                    <Text style={styles.daysPillText}>{selectedSplit.daysPerWeek} days a week</Text>
                  </View>
                  <Text style={styles.title}>{selectedSplit.name}</Text>
                  <Text style={styles.pageSub}>{stripDays(selectedSplit.shortDescription)}</Text>
                </View>
                {selectedSplit.routines.map((routine, rIdx) => {
                  const sets = routine.exercises.reduce((s, e) => s + e.sets, 0);
                  const days = previewSchedule[rIdx] ?? [];
                  return (
                    <View key={`${routine.name}-${rIdx}`} style={styles.previewCard}>
                      <View style={styles.previewHead}>
                        <View style={styles.flex}>
                          <Text style={styles.previewName} numberOfLines={1}>{routine.name}</Text>
                          <Text style={styles.previewMeta}>{routine.exercises.length} exercises · {sets} sets</Text>
                        </View>
                        {days.length > 0 && (
                          <View style={styles.previewDays}>
                            <Text style={styles.previewDaysText}>{days.map((d) => WEEKDAY_SHORT[d]).join(" · ")}</Text>
                          </View>
                        )}
                      </View>
                      {routine.exercises.map((ex, eIdx) => (
                        <View key={`${ex.name}-${eIdx}`} style={[styles.previewRow, styles.rowTopBorder]}>
                          <View style={[styles.tagDot, { backgroundColor: muscleColor(ex.muscleGroup as MuscleGroup, colors) }]} />
                          <Text style={styles.previewEx} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.previewScheme}>{ex.sets} × {ex.reps}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>

              <LinearGradient
                colors={[colors.scheme === "dark" ? "rgba(7,8,11,0)" : "rgba(243,244,247,0)", colors.background, colors.background]}
                locations={[0, 0.3, 1]}
                style={[styles.confirmBar, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}
                pointerEvents="box-none"
              >
                <PressableScale onPress={handleConfirmSplit} style={[styles.confirmWrap, glow("#2563EB", colors, 0.3)]} accessibilityRole="button" testID="add-split">
                  <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmBtn}>
                    <Text style={styles.confirmText}>
                      Add {selectedSplit.routines.length === 1 ? "this routine" : `all ${selectedSplit.routines.length} routines`}
                    </Text>
                  </LinearGradient>
                </PressableScale>
              </LinearGradient>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    pressed: { opacity: 0.6 },
    scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 18 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 4 },
    title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, lineHeight: 40, color: colors.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    textBtn: { height: 44, paddingHorizontal: 10, justifyContent: "center" },
    textBtnLabel: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
    addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryFill, alignItems: "center", justifyContent: "center" },
    splitsCard: { borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden" },
    splitsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    splitsTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: "#fff" },
    splitsSub: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.78)", marginTop: 2 },
    splitsGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
    list: { gap: 12 },
    sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: colors.textTertiary, paddingLeft: 2 },
    routineCard: { ...card(colors, 26), padding: 18, paddingLeft: 22, gap: 14, overflow: "hidden" },
    accentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
    routineTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    routineName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    routineMeta: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, marginTop: 3, fontVariant: ["tabular-nums"] },
    peek: { flexDirection: "row" },
    peekThumb: { borderRadius: 12, borderWidth: 2, borderColor: colors.cardBackground },
    peekOverlap: { marginLeft: -12 },
    reorder: { flexDirection: "row", gap: 6 },
    reorderBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.fill, paddingVertical: 5, paddingLeft: 9, paddingRight: 11, borderRadius: 999 },
    tagDot: { width: 7, height: 7, borderRadius: 4 },
    tagText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    routineBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
    days: { flex: 1, flexDirection: "row", gap: 5 },
    day: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill },
    dayText: { fontSize: 11, fontWeight: "800", color: colors.textTertiary },
    startBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingLeft: 13, paddingRight: 15, borderRadius: 19, backgroundColor: colors.primaryTint },
    startText: { fontSize: 14, fontWeight: "800", color: colors.primaryText },
    empty: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.fillStrong,
      borderRadius: 26,
      paddingVertical: 30,
      paddingHorizontal: 22,
      alignItems: "center",
      gap: 8,
    },
    emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    emptyBody: { fontSize: 14, fontWeight: "500", lineHeight: 20, color: colors.textTertiary, textAlign: "center", maxWidth: 270 },
    emptyBtn: { flexDirection: "row", alignItems: "center", gap: 7, height: 48, paddingHorizontal: 20, marginTop: 8, borderRadius: 16, backgroundColor: colors.primaryTint },
    emptyBtnText: { fontSize: 15, fontWeight: "800", color: colors.primaryText },
    libraryRow: { ...card(colors, 22), flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    libraryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    libraryTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    librarySub: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 1 },
    overlay: { flex: 1, backgroundColor: colors.scheme === "dark" ? "rgba(0,0,0,0.7)" : "rgba(9,12,20,0.45)", justifyContent: "center", padding: 24 },
    dialog: {
      backgroundColor: colors.sheet,
      borderRadius: 28,
      padding: 22,
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.24,
      shadowRadius: 32,
      elevation: 24,
    },
    dialogTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    dialogInput: { height: 54, borderRadius: 16, backgroundColor: colors.fill, paddingHorizontal: 16, fontSize: 17, fontWeight: "700", color: colors.text },
    suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    suggestion: { height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.fill, justifyContent: "center" },
    suggestionText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    dialogActions: { flexDirection: "row", gap: 10, paddingTop: 4 },
    dialogBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    dialogBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    back: { height: 44, alignSelf: "flex-start", marginLeft: -6, flexDirection: "row", alignItems: "center", gap: 2 },
    backText: { fontSize: 16, fontWeight: "700", color: colors.primaryText },
    pageHead: { gap: 6, marginTop: -4 },
    pageSub: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: colors.textSecondary },
    featuredCard: { ...card(colors, 24), padding: 14, flexDirection: "row", alignItems: "center", gap: 14 },
    daysBadge: { width: 58, height: 68, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    daysBadgeNum: { fontSize: 28, fontWeight: "800", lineHeight: 30, color: "#fff" },
    daysBadgeLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" },
    featuredName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    featuredDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary },
    featuredRoutines: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    classicCard: { ...card(colors, 24), paddingVertical: 4, paddingHorizontal: 16 },
    classicRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 70, paddingVertical: 10 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    rowTopBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    classicDays: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    classicDaysNum: { fontSize: 18, fontWeight: "800", lineHeight: 20, color: colors.text },
    classicDaysLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", color: colors.textTertiary },
    classicName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    daysPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryTint, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
    daysPillText: { fontSize: 12, fontWeight: "800", color: colors.primaryText },
    previewCard: { ...card(colors, 24), paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    previewHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12 },
    previewName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    previewMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 2 },
    previewDays: { backgroundColor: colors.primaryTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    previewDaysText: { fontSize: 12, fontWeight: "800", color: colors.primaryText },
    previewRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 42 },
    previewEx: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    previewScheme: { fontSize: 13, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    confirmBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 30, paddingHorizontal: 20 },
    confirmWrap: { borderRadius: 20 },
    confirmBtn: { height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    confirmText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
