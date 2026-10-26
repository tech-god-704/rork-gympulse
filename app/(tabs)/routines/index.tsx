import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, LayoutGrid, List, PlayCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { dominantMuscleColor, elevation, glow, gradient, muscleColor } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, Routine, WeekDay } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";
import { WORKOUT_SPLITS, ROUTINE_NAME_SUGGESTIONS, type WorkoutSplit } from "@/mocks/exercises";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";

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
  const { routines, addRoutine, addRoutinesFromTemplates, reorderRoutine, currentSession } = useGym();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleCreate = useCallback(() => {
    if (newName.trim().length === 0) return;
    const routine = addRoutine(newName.trim());
    if (!routine) return;
    setNewName("");
    setShowCreate(false);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(tabs)/routines/${routine.id}`);
  }, [newName, addRoutine, router]);

  const handleConfirmSplit = useCallback(() => {
    if (!selectedSplit) return;
    const created = addRoutinesFromTemplates(selectedSplit.routines);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedSplit(null);
    setShowTemplates(false);
    if (created.length > 0) {
      router.push(`/(tabs)/routines/${created[created.length - 1].id}`);
    }
  }, [selectedSplit, addRoutinesFromTemplates, router]);

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
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [reorderRoutine],
  );

  const featured = WORKOUT_SPLITS.slice(0, FEATURED_COUNT);
  const classic = WORKOUT_SPLITS.slice(FEATURED_COUNT);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Routines</Text>
          <View style={styles.headerActions}>
            {routines.length > 1 && (
              <TouchableOpacity
                onPress={() => setReordering((r) => !r)}
                style={styles.textBtn}
                accessibilityRole="button"
                accessibilityLabel={reordering ? "Done reordering" : "Reorder routines"}
              >
                <Text style={styles.textBtnLabel}>{reordering ? "Done" : "Reorder"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Create a new routine"
            >
              <Plus size={22} color={colors.primaryText} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowTemplates(true)}
          activeOpacity={0.85}
          style={[styles.splitsCardWrap, glow("#2563EB", colors, 0.3)]}
          accessibilityRole="button"
          accessibilityLabel="Browse workout splits"
        >
          <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.splitsCard}>
            <View style={styles.splitsIcon}>
              <LayoutGrid size={24} color="#fff" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.splitsTitle}>Browse workout splits</Text>
              <Text style={styles.splitsSub}>{WORKOUT_SPLITS.length} proven programs, 3 to 6 days a week</Text>
            </View>
            <ChevronRight size={20} color="#fff" strokeWidth={2.4} />
          </LinearGradient>
        </TouchableOpacity>

        {routines.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <List size={26} color={colors.primaryText} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyBody}>Add a whole split in one tap, or build a routine exercise by exercise.</Text>
            <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.emptyBtn} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Create routine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>My routines · {routines.length}</Text>
            {routines.map((routine, idx) => {
              const groups = [...new Set(routine.exercises.map((e) => e.muscleGroup))];
              const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
              const scheduled = routine.scheduledDays ?? [];
              const first = idx === 0;
              const last = idx === routines.length - 1;

              return (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineCard}
                  onPress={() => !reordering && router.push(`/(tabs)/routines/${routine.id}`)}
                  activeOpacity={reordering ? 1 : 0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${routine.name}. ${describe(routine)}. Edit routine.`}
                >
                  <View style={styles.routineTop}>
                    <View style={[styles.mark, { backgroundColor: accent }]} />
                    <View style={styles.flex}>
                      <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
                      <Text style={styles.routineMeta} numberOfLines={1}>{describe(routine)}</Text>
                    </View>
                    {reordering ? (
                      <View style={styles.reorder}>
                        <TouchableOpacity
                          onPress={() => move(routine.id, "up")}
                          disabled={first}
                          style={[styles.reorderBtn, first && styles.dim]}
                          accessibilityRole="button"
                          accessibilityLabel={`Move ${routine.name} up`}
                        >
                          <ChevronUp size={18} color={colors.text} strokeWidth={2.4} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => move(routine.id, "down")}
                          disabled={last}
                          style={[styles.reorderBtn, last && styles.dim]}
                          accessibilityRole="button"
                          accessibilityLabel={`Move ${routine.name} down`}
                        >
                          <ChevronDown size={18} color={colors.text} strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
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

                  <View style={styles.days}>
                    {WEEK.map(({ day, letter }) => {
                      const on = scheduled.includes(day);
                      return (
                        <View key={day} style={[styles.day, { backgroundColor: on ? accent : colors.fill }]}>
                          <Text style={[styles.dayText, { color: on ? "#fff" : colors.textTertiary }]}>{letter}</Text>
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/exercise")}
          activeOpacity={0.7}
          style={styles.libraryRow}
          accessibilityRole="button"
          accessibilityLabel="Open the exercise library"
        >
          <PlayCircle size={18} color={colors.primaryText} />
          <Text style={styles.libraryText}>Exercise library · form demos</Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Create Routine ─────────────────────────────────── */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowCreate(false)} />
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
                  <TouchableOpacity
                    key={name}
                    style={[styles.suggestion, active && { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setNewName(name);
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.suggestionText, active && { color: "#fff" }]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.fill }]}
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.dialogBtnText, { color: colors.text, fontWeight: "700" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.primary }, !newName.trim() && styles.dim]}
                onPress={handleCreate}
                disabled={!newName.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.dialogBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Workout Splits / Split Preview ─────────────────── */}
      <Modal visible={showTemplates} animationType="slide" onRequestClose={closeTemplates}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {!selectedSplit ? (
            <ScrollView contentContainerStyle={[styles.scroll, { gap: 16, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
              <TouchableOpacity onPress={closeTemplates} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to routines">
                <ChevronLeft size={22} color={colors.primaryText} strokeWidth={2.4} />
                <Text style={styles.backText}>Routines</Text>
              </TouchableOpacity>
              <View style={styles.pageHead}>
                <Text style={styles.title}>Workout splits</Text>
                <Text style={styles.pageSub}>Add a split and every routine lands in your list, already scheduled.</Text>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.primaryText, paddingTop: 6 }]}>GymPulse programs</Text>
              {featured.map((split) => (
                <TouchableOpacity
                  key={split.id}
                  style={styles.featuredCard}
                  onPress={() => setSelectedSplit(split)}
                  activeOpacity={0.85}
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
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionLabel, { paddingTop: 10 }]}>Classic splits</Text>
              <View style={styles.classicCard}>
                {classic.map((split, i) => (
                  <TouchableOpacity
                    key={split.id}
                    style={[styles.classicRow, i < classic.length - 1 && styles.rowBorder]}
                    onPress={() => setSelectedSplit(split)}
                    accessibilityRole="button"
                    accessibilityLabel={`${split.name}. ${split.daysPerWeek} days a week.`}
                  >
                    <View style={styles.classicDays}>
                      <Text style={styles.classicDaysNum}>{split.daysPerWeek}</Text>
                      <Text style={styles.classicDaysLabel}>days/wk</Text>
                    </View>
                    <View style={[styles.flex, { gap: 2 }]}>
                      <Text style={styles.classicName}>{split.name}</Text>
                      <Text style={styles.featuredDesc}>{stripDays(split.shortDescription)}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.flex}>
              <ScrollView contentContainerStyle={[styles.scroll, { gap: 16, paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={closeTemplates} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to splits">
                  <ChevronLeft size={22} color={colors.primaryText} strokeWidth={2.4} />
                  <Text style={styles.backText}>Splits</Text>
                </TouchableOpacity>
                <View style={[styles.pageHead, { gap: 8 }]}>
                  <View style={styles.daysPill}>
                    <Text style={styles.daysPillText}>{selectedSplit.daysPerWeek} days / week</Text>
                  </View>
                  <Text style={styles.title}>{selectedSplit.name}</Text>
                  <Text style={styles.pageSub}>{stripDays(selectedSplit.shortDescription)}</Text>
                </View>
                {selectedSplit.routines.map((routine, rIdx) => {
                  const sets = routine.exercises.reduce((s, e) => s + e.sets, 0);
                  return (
                    <View key={`${routine.name}-${rIdx}`} style={styles.previewCard}>
                      <View style={styles.previewHead}>
                        <Text style={styles.previewName} numberOfLines={1}>{routine.name}</Text>
                        <Text style={styles.previewMeta}>{routine.exercises.length} exercises · {sets} sets</Text>
                      </View>
                      {routine.exercises.map((ex, eIdx) => (
                        <View
                          key={`${ex.name}-${eIdx}`}
                          style={[styles.previewRow, eIdx < routine.exercises.length - 1 && styles.rowBorder]}
                        >
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
                colors={["transparent", colors.background, colors.background]}
                locations={[0, 0.3, 1]}
                style={[styles.confirmBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
                pointerEvents="box-none"
              >
                <TouchableOpacity onPress={handleConfirmSplit} activeOpacity={0.85} style={[{ borderRadius: 18 }, glow("#2563EB", colors, 0.3)]} accessibilityRole="button">
                  <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmBtn}>
                    <Text style={styles.confirmText}>
                      Add all {selectedSplit.routines.length} routine{selectedSplit.routines.length > 1 ? "s" : ""}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
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
    dim: { opacity: 0.3 },
    scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 4 },
    title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.1, lineHeight: 38, color: colors.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    textBtn: { height: 44, paddingHorizontal: 10, justifyContent: "center" },
    textBtnLabel: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    splitsCardWrap: { borderRadius: 22 },
    splitsCard: { borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
    splitsIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
    splitsTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
    splitsSub: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.82)", marginTop: 2 },
    list: { gap: 12 },
    sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textTertiary, paddingLeft: 2 },
    routineCard: { ...card, padding: 16, paddingLeft: 18, gap: 12 },
    routineTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    mark: { width: 14, height: 14, borderRadius: 5 },
    routineName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    routineMeta: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, marginTop: 2 },
    reorder: { flexDirection: "row", gap: 4 },
    reorderBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.fill, paddingVertical: 5, paddingLeft: 8, paddingRight: 10, borderRadius: 999 },
    tagDot: { width: 7, height: 7, borderRadius: 4 },
    tagText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    days: { flexDirection: "row", gap: 6, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    day: { flex: 1, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    dayText: { fontSize: 12, fontWeight: "800" },
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
    libraryRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.fill },
    libraryText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
    dialog: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, gap: 14, ...elevation(3, colors) },
    dialogTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    dialogInput: {
      height: 50,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      backgroundColor: colors.fill,
      paddingHorizontal: 14,
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    suggestion: { height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.fill, justifyContent: "center" },
    suggestionText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    dialogActions: { flexDirection: "row", gap: 8, paddingTop: 4 },
    dialogBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    dialogBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    back: { height: 44, alignSelf: "flex-start", marginLeft: -6, flexDirection: "row", alignItems: "center", gap: 2 },
    backText: { fontSize: 16, fontWeight: "600", color: colors.primaryText },
    pageHead: { gap: 6, marginTop: -6 },
    pageSub: { fontSize: 15, fontWeight: "500", color: colors.textSecondary },
    featuredCard: { ...card, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
    daysBadge: { width: 56, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    daysBadgeNum: { fontSize: 26, fontWeight: "800", lineHeight: 28, color: "#fff" },
    daysBadgeLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" },
    featuredName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    featuredDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary },
    featuredRoutines: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    classicCard: { ...card, paddingVertical: 4, paddingHorizontal: 16 },
    classicRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68, paddingVertical: 10 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    classicDays: { width: 52, alignItems: "center", paddingRight: 12, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.separator },
    classicDaysNum: { fontSize: 22, fontWeight: "800", lineHeight: 26, color: colors.text },
    classicDaysLabel: { fontSize: 10, fontWeight: "700", color: colors.textTertiary },
    classicName: { fontSize: 16, fontWeight: "800", color: colors.text },
    daysPill: { alignSelf: "flex-start", backgroundColor: colors.primaryTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    daysPillText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, color: colors.primaryText },
    previewCard: { ...card, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 6, gap: 6 },
    previewHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
    previewName: { flex: 1, fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    previewMeta: { fontSize: 12, fontWeight: "700", color: colors.textTertiary },
    previewRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 },
    previewEx: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    previewScheme: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    confirmBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: 20 },
    confirmBtn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    confirmText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
};
