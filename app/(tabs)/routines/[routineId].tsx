import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Animated,
  PanResponder,
  Switch,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Search, Check, X, Play } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import {
  MuscleGroup,
  MUSCLE_GROUP_LABELS,
  Exercise,
  RoutineExercise,
  RoutineSetConfig,
  WeekDay,
  WEEKDAY_LABELS,
  ALL_WEEKDAYS,
  RestTimerAlert,
  WeightUnit,
} from "@/types";
import { generateId } from "@/utils/helpers";
import { formatWeight, toDisplayWeight, fromDisplayWeight, weightStep, trimNumber } from "@/utils/units";
import { elevation, muscleColor } from "@/constants/theme";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import ExerciseDemoThumb from "@/components/ExerciseDemoThumb";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];
const DAY_LETTER: Record<WeekDay, string> = {
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "T",
  friday: "F",
  saturday: "S",
  sunday: "S",
};
const ROUTINE_COLORS = ["#3B82F6", "#EF4444", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981", "#6366F1", "#64748B"];
const REST_MIN = 15;
const REST_MAX = 300;
const REST_ALERT_OPTIONS: { value: RestTimerAlert; label: string }[] = [
  { value: "vibrate", label: "Vibrate" },
  { value: "sound", label: "Sound" },
  { value: "both", label: "Both" },
  { value: "none", label: "None" },
];
const DELETE_WIDTH = 88;
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

const formatRest = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

function summarize(exercise: RoutineExercise, unit: WeightUnit): string {
  const configs = Array.from({ length: Math.max(1, exercise.sets) }, (_, i) => exercise.setConfigs?.[i] ?? { reps: exercise.reps, weight: exercise.weight });
  const reps = [...new Set(configs.map((s) => s.reps))];
  const weights = [...new Set(configs.map((s) => s.weight))];
  const r = reps.length === 1 ? `${reps[0]}` : `${Math.min(...reps)}-${Math.max(...reps)}`;
  const w =
    weights.length === 1
      ? formatWeight(weights[0], unit)
      : `${formatWeight(Math.min(...weights), unit, { withUnit: false, bodyweightLabel: false })}-${formatWeight(Math.max(...weights), unit)}`;
  return `${configs.length} × ${r} · ${w}`;
}

// ─── Demo thumb with a "no demo" fallback ───────────────────
function Thumb({ name, width, height }: { name: string; width: number; height: number }) {
  const { colors } = useTheme();
  const { findByName } = useExerciseLibrary();
  if (findByName(name)) return <ExerciseDemoThumb exerciseName={name} width={width} height={height} />;
  return (
    <View style={{ width, height, borderRadius: 9, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 9, fontWeight: "800", lineHeight: 11, color: colors.textTertiary, textAlign: "center" }}>{"NO\nDEMO"}</Text>
    </View>
  );
}

// ─── Swipeable exercise row ─────────────────────────────────
interface RowProps {
  exercise: RoutineExercise;
  index: number;
  last: boolean;
  reordering: boolean;
  weightUnit: WeightUnit;
  onDelete: () => void;
  onTap: () => void;
  onMove: (dir: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ExerciseRow({ exercise, index, last, reordering, weightUnit, onDelete, onTap, onMove, canMoveUp, canMoveDown }: RowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createRowStyles(colors), [colors]);
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const snap = useCallback(
    (open: boolean) => {
      Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, friction: 8 }).start();
      isOpen.current = open;
    },
    [translateX],
  );

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        translateX.setValue(Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH - 16)));
      },
      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const open = base + g.dx < -DELETE_WIDTH / 2;
        if (open && !isOpen.current && Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, friction: 8 }).start();
        isOpen.current = open;
      },
    }),
  ).current;

  useEffect(() => {
    if (reordering) snap(false);
  }, [reordering, snap]);

  const deleteOpacity = translateX.interpolate({ inputRange: [-DELETE_WIDTH, -8, 0], outputRange: [1, 0, 0] });

  return (
    <View style={[styles.wrap, !last && styles.border]}>
      <Animated.View style={[styles.deleteAction, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            snap(false);
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exercise.exerciseName} from this routine`}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.fg, { transform: [{ translateX }] }]} {...(reordering ? {} : pan.panHandlers)}>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={reordering ? 1 : 0.7}
          onPress={() => {
            if (reordering) return;
            if (isOpen.current) snap(false);
            else onTap();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${exercise.exerciseName}, exercise ${index + 1}`}
        >
          <Thumb name={exercise.exerciseName} width={36} height={64} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{exercise.exerciseName}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.dot, { backgroundColor: muscleColor(exercise.muscleGroup, colors) }]} />
              <Text style={styles.meta} numberOfLines={1}>{summarize(exercise, weightUnit)}</Text>
            </View>
          </View>
          {reordering ? (
            <View style={styles.reorder}>
              <TouchableOpacity
                onPress={() => onMove("up")}
                disabled={!canMoveUp}
                style={[styles.reorderBtn, !canMoveUp && styles.dim]}
                accessibilityRole="button"
                accessibilityLabel={`Move ${exercise.exerciseName} earlier`}
              >
                <ChevronUp size={18} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMove("down")}
                disabled={!canMoveDown}
                style={[styles.reorderBtn, !canMoveDown && styles.dim]}
                accessibilityRole="button"
                accessibilityLabel={`Move ${exercise.exerciseName} later`}
              >
                <ChevronDown size={18} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ) : (
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createRowStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    wrap: { position: "relative", overflow: "hidden" },
    border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    deleteAction: { position: "absolute", top: 0, right: 0, bottom: 0, width: DELETE_WIDTH, backgroundColor: colors.error },
    deleteBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
    deleteText: { fontSize: 14, fontWeight: "800", color: "#fff" },
    fg: { backgroundColor: colors.cardBackground },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 12 },
    info: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 15, fontWeight: "700", color: colors.text },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    meta: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    reorder: { flexDirection: "row", gap: 4 },
    reorderBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    dim: { opacity: 0.3 },
  });

// ─── Bottom sheet shell ─────────────────────────────────────
function Sheet({
  visible,
  title,
  doneLabel = "Done",
  onDone,
  onDismiss,
  children,
}: {
  visible: boolean;
  title: string;
  doneLabel?: string;
  onDone: () => void;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSheetStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onDone} style={styles.done} accessibilityRole="button">
              <Text style={styles.doneText}>{doneLabel}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createSheetStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { maxHeight: "88%", backgroundColor: colors.cardBackground, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...elevation(3, colors) },
    handleRow: { alignItems: "center", paddingTop: 8 },
    handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 4, paddingBottom: 8, paddingLeft: 20, paddingRight: 12 },
    title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    done: { height: 44, paddingHorizontal: 8, justifyContent: "center" },
    doneText: { fontSize: 16, fontWeight: "800", color: colors.primaryText },
    body: { paddingHorizontal: 20, gap: 14 },
  });

// ─── Edit exercise sheet ────────────────────────────────────
interface SetRow {
  reps: string;
  weight: string;
}

function EditExerciseSheet({
  exercise,
  weightUnit,
  onSave,
  onClose,
}: {
  exercise: RoutineExercise | null;
  weightUnit: WeightUnit;
  onSave: (id: string, configs: RoutineSetConfig[]) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createEditStyles(colors), [colors]);
  const router = useRouter();
  const { findByName } = useExerciseLibrary();
  const [rows, setRows] = useState<SetRow[]>([]);
  const step = weightStep(weightUnit);

  useEffect(() => {
    if (!exercise) return;
    setRows(
      Array.from({ length: exercise.sets }, (_, i) => ({
        reps: String(exercise.setConfigs?.[i]?.reps ?? exercise.reps),
        weight: trimNumber(toDisplayWeight(exercise.setConfigs?.[i]?.weight ?? exercise.weight, weightUnit)),
      })),
    );
  }, [exercise, weightUnit]);

  const save = useCallback(() => {
    if (!exercise) return;
    // Inputs are in the user's display unit; storage is always pounds.
    const configs = rows.map((r) => ({
      reps: Math.max(1, parseInt(r.reps, 10) || 1),
      weight: fromDisplayWeight(Math.max(0, parseFloat(r.weight) || 0), weightUnit),
    }));
    onSave(exercise.id, configs.length ? configs : [{ reps: DEFAULT_REPS, weight: 0 }]);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [exercise, rows, weightUnit, onSave]);

  const update = (i: number, field: keyof SetRow, value: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const bump = (i: number, field: keyof SetRow, delta: number) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const cur = parseFloat(r[field]) || 0;
        const next = field === "reps" ? Math.max(1, Math.round(cur + delta)) : Math.max(0, cur + delta);
        return { ...r, [field]: trimNumber(next) };
      }),
    );

  const demo = exercise ? findByName(exercise.exerciseName) : undefined;

  return (
    <Sheet visible={exercise !== null} title="Edit exercise" doneLabel="Save" onDone={save} onDismiss={onClose}>
      {exercise && (
        <>
          <View style={styles.head}>
            <Thumb name={exercise.exerciseName} width={40} height={71} />
            <View style={styles.headInfo}>
              <Text style={styles.name}>{exercise.exerciseName}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.dot, { backgroundColor: muscleColor(exercise.muscleGroup, colors) }]} />
                <Text style={styles.meta}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
            </View>
            {demo && (
              <TouchableOpacity
                style={styles.watch}
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } });
                }}
                accessibilityRole="button"
              >
                <Play size={13} color={colors.primaryText} fill={colors.primaryText} />
                <Text style={styles.watchText}>Watch form</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.colHead}>
            <Text style={[styles.colLabel, { width: 38 }]}>Set</Text>
            <Text style={[styles.colLabel, styles.flexCenter]}>Weight ({weightUnit})</Text>
            <Text style={[styles.colLabel, styles.flexCenter]}>Reps</Text>
            <View style={{ width: 36 }} />
          </View>

          {rows.map((row, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setNum}>{i + 1}</Text>
              {(["weight", "reps"] as const).map((field) => (
                <View key={field} style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => bump(i, field, field === "weight" ? -step : -1)}
                    accessibilityLabel={`Decrease ${field} for set ${i + 1}`}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.stepValue}
                    value={row[field]}
                    onChangeText={(v) => update(i, field, v.replace(/[^0-9.]/g, ""))}
                    keyboardType={field === "weight" ? "decimal-pad" : "number-pad"}
                    selectTextOnFocus
                    accessibilityLabel={`${field === "weight" ? "Weight" : "Reps"} for set ${i + 1}`}
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => bump(i, field, field === "weight" ? step : 1)}
                    accessibilityLabel={`Increase ${field} for set ${i + 1}`}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.remove, rows.length <= 1 && styles.dim]}
                disabled={rows.length <= 1}
                onPress={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Remove set ${i + 1}`}
              >
                <X size={18} color={colors.error} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addSet}
            onPress={() => setRows((rs) => [...rs, rs[rs.length - 1] ?? { reps: String(DEFAULT_REPS), weight: "0" }])}
            accessibilityRole="button"
          >
            <Text style={styles.addSetText}>+ Add set</Text>
          </TouchableOpacity>
        </>
      )}
    </Sheet>
  );
}

const createEditStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    headInfo: { flex: 1, gap: 3 },
    name: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    meta: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    watch: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingLeft: 10, paddingRight: 14, borderRadius: 999, backgroundColor: colors.primaryTint },
    watchText: { fontSize: 13, fontWeight: "800", color: colors.primaryText },
    colHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
    colLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textTertiary },
    flexCenter: { flex: 1, textAlign: "center" },
    setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    setNum: { width: 38, fontSize: 15, fontWeight: "800", color: colors.textSecondary },
    stepper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.fill, borderRadius: 12, padding: 2 },
    stepBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
    stepText: { fontSize: 18, fontWeight: "700", color: colors.text },
    stepValue: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.text, padding: 0, fontVariant: ["tabular-nums"] },
    remove: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
    dim: { opacity: 0.3 },
    addSet: { height: 48, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    addSetText: { fontSize: 15, fontWeight: "700", color: colors.text },
  });

// ─── Add exercise sheet ─────────────────────────────────────
function AddExerciseSheet({
  visible,
  addedNames,
  onAdd,
  onCreateCustom,
  onClose,
}: {
  visible: boolean;
  addedNames: Set<string>;
  onAdd: (exercise: Exercise) => void;
  onCreateCustom: (name: string, group: MuscleGroup) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createAddStyles(colors), [colors]);
  const router = useRouter();
  const { allExercises } = useGym();
  const { findByName } = useExerciseLibrary();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState<MuscleGroup>("chest");

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setGroup("all");
    setShowCustom(false);
    setCustomName("");
  }, [visible]);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      allExercises
        .filter((e) => (group === "all" || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q)))
        .sort((a, b) => {
          // Prefix matches first — "bench" should surface "Bench Press"
          // before "Close-Grip Bench Press".
          if (q) {
            const d = (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1);
            if (d !== 0) return d;
          }
          // Exercises with a form demo float up when browsing.
          const demo = (findByName(a.name) ? 0 : 1) - (findByName(b.name) ? 0 : 1);
          return demo !== 0 ? demo : a.name.localeCompare(b.name);
        }),
    [allExercises, group, q, findByName],
  );

  const openCustom = () => {
    setCustomName(query.trim());
    if (group !== "all") setCustomGroup(group);
    setShowCustom(true);
  };

  const createCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onCreateCustom(name, customGroup);
    setShowCustom(false);
    setCustomName("");
    setQuery("");
  };

  return (
    <Sheet visible={visible} title="Add exercises" onDone={onClose} onDismiss={onClose}>
      <View style={styles.search}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search exercises"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <X size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {(["all", ...MUSCLE_GROUPS] as const).map((g) => {
          const on = group === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGroup(g)}
              style={[styles.chip, on && { backgroundColor: colors.text }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {g !== "all" && <View style={[styles.dot8, { backgroundColor: muscleColor(g, colors) }]} />}
              <Text style={[styles.chipText, on && { color: colors.background }]}>{g === "all" ? "All" : MUSCLE_GROUP_LABELS[g]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showCustom ? (
        <View style={styles.custom}>
          <Text style={styles.customLabel}>Custom exercise</Text>
          <TextInput
            style={styles.customInput}
            value={customName}
            onChangeText={(t) => setCustomName(t.slice(0, 60))}
            placeholder="Exercise name"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            accessibilityLabel="Custom exercise name"
          />
          <View style={styles.customChips}>
            {MUSCLE_GROUPS.map((g) => {
              const on = customGroup === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setCustomGroup(g)}
                  style={[styles.customChip, on && { backgroundColor: colors.text }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.dot7, { backgroundColor: muscleColor(g, colors) }]} />
                  <Text style={[styles.customChipText, on && { color: colors.background }]}>{MUSCLE_GROUP_LABELS[g]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.customBtn, !customName.trim() && styles.dim]}
            disabled={!customName.trim()}
            onPress={createCustom}
            accessibilityRole="button"
          >
            <Text style={styles.customBtnText}>Create &amp; add</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.customOpen} onPress={openCustom} accessibilityRole="button">
          <Plus size={16} color={colors.text} strokeWidth={2.6} />
          <Text style={styles.customOpenText}>Create custom exercise</Text>
        </TouchableOpacity>
      )}

      <View>
        {list.map((ex, i) => {
          const added = addedNames.has(ex.name.toLowerCase());
          const demo = findByName(ex.name);
          return (
            <View key={ex.id} style={[styles.item, i < list.length - 1 && styles.itemBorder]}>
              {demo ? (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } });
                  }}
                  accessibilityLabel={`Watch ${ex.name} form demo`}
                >
                  <Thumb name={ex.name} width={34} height={60} />
                </TouchableOpacity>
              ) : (
                <Thumb name={ex.name} width={34} height={60} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{ex.name}</Text>
                <View style={styles.itemMetaRow}>
                  <View style={[styles.dot7, { backgroundColor: muscleColor(ex.muscleGroup, colors) }]} />
                  <Text style={styles.itemMeta}>
                    {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                    {ex.isCustom ? " · Custom" : demo ? " · Form demo" : ""}
                  </Text>
                </View>
              </View>
              {added ? (
                <View style={[styles.addBtn, { backgroundColor: colors.successLight }]} accessibilityLabel={`${ex.name}, already in this routine`}>
                  <Check size={18} color={colors.success} strokeWidth={3} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => onAdd(ex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${ex.name}`}
                >
                  <Plus size={20} color={colors.primaryText} strokeWidth={2.6} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {list.length === 0 && <Text style={styles.empty}>No matches. Create it as a custom exercise above.</Text>}
      </View>
    </Sheet>
  );
}

const createAddStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    search: { height: 46, borderRadius: 14, backgroundColor: colors.fill, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
    searchInput: { flex: 1, height: "100%", fontSize: 16, fontWeight: "600", color: colors.text },
    bleed: { marginHorizontal: -20, flexGrow: 0 },
    chips: { gap: 6, paddingHorizontal: 20 },
    chip: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.fill, flexDirection: "row", alignItems: "center", gap: 6 },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    dot8: { width: 8, height: 8, borderRadius: 4 },
    dot7: { width: 7, height: 7, borderRadius: 4 },
    dim: { opacity: 0.4 },
    customOpen: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.fillStrong,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    customOpenText: { fontSize: 14, fontWeight: "700", color: colors.text },
    custom: { backgroundColor: colors.card2, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, padding: 14, gap: 12 },
    customLabel: { fontSize: 13, fontWeight: "800", color: colors.textTertiary },
    customInput: {
      height: 46,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 14,
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    customChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    customChip: { height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.fill, flexDirection: "row", alignItems: "center", gap: 6 },
    customChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    customBtn: { height: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    customBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    item: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 6 },
    itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    itemInfo: { flex: 1, minWidth: 0, gap: 3 },
    itemName: { fontSize: 15, fontWeight: "700", color: colors.text },
    itemMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    itemMeta: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    empty: { paddingVertical: 24, textAlign: "center", fontSize: 14, fontWeight: "600", color: colors.textTertiary },
  });

// ─── Screen ─────────────────────────────────────────────────
export default function RoutineDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const {
    routines,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    reorderExerciseInRoutine,
    deleteRoutine,
    addCustomExercise,
    updateRoutine,
    settings,
  } = useGym();

  const wu = settings.weightUnit;
  const routine = useMemo(() => routines.find((r) => r.id === routineId), [routines, routineId]);

  const [name, setName] = useState(routine?.name ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  const [reordering, setReordering] = useState(false);

  /** Exercises already in this routine can't be added twice. */
  const addedNames = useMemo(
    () => new Set((routine?.exercises ?? []).map((e) => e.exerciseName.toLowerCase())),
    [routine],
  );

  const buildEntry = useCallback(
    (exercise: Exercise): RoutineExercise => ({
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: DEFAULT_SETS,
      reps: DEFAULT_REPS,
      weight: 0,
      setConfigs: Array.from({ length: DEFAULT_SETS }, () => ({ reps: DEFAULT_REPS, weight: 0 })),
    }),
    [],
  );

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      if (!routineId || addedNames.has(exercise.name.toLowerCase())) return;
      addExerciseToRoutine(routineId, buildEntry(exercise));
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [routineId, addedNames, addExerciseToRoutine, buildEntry],
  );

  const handleCreateCustom = useCallback(
    (exerciseName: string, group: MuscleGroup) => {
      if (!routineId) return;
      if (addedNames.has(exerciseName.toLowerCase())) {
        Alert.alert("Already added", `${exerciseName} is already in this routine.`);
        return;
      }
      const exercise = addCustomExercise(exerciseName, group);
      if (!exercise) return;
      addExerciseToRoutine(routineId, buildEntry(exercise));
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [routineId, addedNames, addCustomExercise, addExerciseToRoutine, buildEntry],
  );

  const handleEditSave = useCallback(
    (exerciseId: string, configs: RoutineSetConfig[]) => {
      if (!routine || !routineId) return;
      const exercises = routine.exercises.map((e) =>
        e.id === exerciseId
          ? { ...e, sets: configs.length, reps: configs[0].reps, weight: configs[0].weight, setConfigs: configs }
          : e,
      );
      updateRoutine(routineId, { exercises });
      setEditing(null);
    },
    [routine, routineId, updateRoutine],
  );

  const handleDeleteRoutine = useCallback(() => {
    if (!routine) return;
    Alert.alert(`Delete “${routine.name}”?`, "This removes the routine and its schedule. Past workouts stay in your history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete routine",
        style: "destructive",
        onPress: () => {
          deleteRoutine(routine.id);
          router.back();
        },
      },
    ]);
  }, [routine, deleteRoutine, router]);

  const saveName = useCallback(() => {
    if (!routineId || !routine) return;
    const trimmed = name.trim();
    if (trimmed && trimmed !== routine.name) updateRoutine(routineId, { name: trimmed });
    else setName(routine.name);
  }, [routineId, routine, name, updateRoutine]);

  const toggleDay = useCallback(
    (day: WeekDay) => {
      if (!routine || !routineId) return;
      const current = routine.scheduledDays ?? [];
      const updated = current.includes(day) ? current.filter((d) => d !== day) : ALL_WEEKDAYS.filter((d) => d === day || current.includes(d));
      updateRoutine(routineId, { scheduledDays: updated });
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [routine, routineId, updateRoutine],
  );

  if (!routine) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Routine not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.textBtn}>
          <Text style={styles.textBtnLabel}>Back to routines</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accent = routine.color ?? colors.primary;
  const scheduled = routine.scheduledDays ?? [];
  const restOn = routine.restTimerEnabled !== false;
  // Falls back to the user's configured default so the stepper agrees with the timer.
  const rest = routine.restTimerDuration ?? settings.defaultRestTimer;
  const setRest = (next: number) => {
    updateRoutine(routine.id, { restTimerDuration: Math.min(REST_MAX, Math.max(REST_MIN, next)) });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to routines">
            <ChevronLeft size={22} color={colors.primaryText} strokeWidth={2.4} />
            <Text style={styles.backText}>Routines</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              saveName();
              router.back();
            }}
            style={styles.textBtn}
            accessibilityRole="button"
          >
            <Text style={[styles.textBtnLabel, { fontWeight: "800" }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={(t) => setName(t.slice(0, 50))}
          onBlur={saveName}
          onSubmitEditing={saveName}
          returnKeyType="done"
          placeholder="Routine name"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Routine name"
        />

        <View style={styles.card}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Color</Text>
            <View style={styles.swatches}>
              {ROUTINE_COLORS.map((c) => {
                const on = routine.color === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      updateRoutine(routine.id, { color: c });
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }}
                    style={[styles.swatchRing, on && { borderColor: c }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Routine color ${c}`}
                  >
                    <View style={[styles.swatch, { backgroundColor: c }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.block, styles.blockDivider]}>
            <Text style={styles.blockLabel}>Schedule</Text>
            <View style={styles.dayRow}>
              {ALL_WEEKDAYS.map((day) => {
                const on = scheduled.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayBtn, { backgroundColor: on ? accent : colors.fill }]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Schedule on ${WEEKDAY_LABELS[day]}`}
                  >
                    <Text style={[styles.dayText, { color: on ? "#fff" : colors.textSecondary }]}>{DAY_LETTER[day]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.settingRow, styles.blockDivider]}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Rest timer</Text>
              <Text style={styles.settingSub}>Between sets in this routine</Text>
            </View>
            <Switch
              value={restOn}
              onValueChange={(v) => updateRoutine(routine.id, { restTimerEnabled: v })}
              trackColor={{ true: colors.primary, false: colors.fillStrong }}
              thumbColor="#fff"
              accessibilityLabel="Rest timer for this routine"
            />
          </View>

          {restOn && (
            <View style={styles.alertRow}>
              <Text style={styles.settingSub}>Duration</Text>
              <View style={styles.restStepper}>
                <TouchableOpacity style={styles.restBtn} onPress={() => setRest(rest - 15)} accessibilityLabel="Shorter rest">
                  <Text style={styles.restBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.restValue}>{formatRest(rest)}</Text>
                <TouchableOpacity style={styles.restBtn} onPress={() => setRest(rest + 15)} accessibilityLabel="Longer rest">
                  <Text style={styles.restBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {restOn && (
            <View style={styles.alertRow}>
              <Text style={styles.settingSub}>Alert</Text>
              <View style={styles.alertChips}>
                {REST_ALERT_OPTIONS.map((opt) => {
                  const on = (routine.restTimerAlert ?? "vibrate") === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => updateRoutine(routine.id, { restTimerAlert: opt.value })}
                      style={[styles.alertChip, on && { backgroundColor: colors.primaryTint }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.alertChipText, on && { color: colors.primaryText }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.exHead}>
          <Text style={styles.sectionLabel}>Exercises · {routine.exercises.length}</Text>
          {routine.exercises.length > 1 && (
            <TouchableOpacity onPress={() => setReordering((r) => !r)} accessibilityRole="button">
              <Text style={styles.textBtnLabel}>{reordering ? "Done" : "Reorder"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {routine.exercises.length > 0 ? (
          <>
            <View style={[styles.card, styles.listCard]}>
              {routine.exercises.map((exercise, index) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  last={index === routine.exercises.length - 1}
                  reordering={reordering}
                  weightUnit={wu}
                  onDelete={() => {
                    removeExerciseFromRoutine(routine.id, exercise.id);
                    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onTap={() => setEditing(exercise)}
                  onMove={(dir) => {
                    reorderExerciseInRoutine(routine.id, exercise.id, dir);
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                  canMoveUp={index > 0}
                  canMoveDown={index < routine.exercises.length - 1}
                />
              ))}
            </View>
            <Text style={styles.hint}>Tap to edit sets · swipe left to delete</Text>
          </>
        ) : (
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>No exercises yet. Add your first one below.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addExercise} onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel="Add an exercise to this routine">
          <Plus size={18} color={colors.primaryText} strokeWidth={2.6} />
          <Text style={styles.addExerciseText}>Add exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteRoutine} onPress={handleDeleteRoutine} accessibilityRole="button">
          <Text style={styles.deleteRoutineText}>Delete routine</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditExerciseSheet exercise={editing} weightUnit={wu} onSave={handleEditSave} onClose={() => setEditing(null)} />
      <AddExerciseSheet
        visible={showAdd}
        addedNames={addedNames}
        onAdd={handleAddExercise}
        onCreateCustom={handleCreateCustom}
        onClose={() => setShowAdd(false)}
      />
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", gap: 8 },
    notFound: { fontSize: 17, fontWeight: "700", color: colors.textSecondary },
    flex: { flex: 1, minWidth: 0 },
    scroll: { paddingHorizontal: 20, gap: 16 },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { height: 44, marginLeft: -6, flexDirection: "row", alignItems: "center", gap: 2 },
    backText: { fontSize: 16, fontWeight: "600", color: colors.primaryText },
    textBtn: { height: 44, paddingHorizontal: 4, justifyContent: "center" },
    textBtnLabel: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
    nameInput: {
      height: 52,
      marginTop: -8,
      borderBottomWidth: 2,
      borderBottomColor: colors.separator,
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -1,
      color: colors.text,
      padding: 0,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      padding: 16,
      gap: 16,
      ...elevation(1, colors),
    },
    listCard: { padding: 0, gap: 0, overflow: "hidden" },
    block: { gap: 10 },
    blockDivider: { paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    blockLabel: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    swatches: { flexDirection: "row", justifyContent: "space-between", gap: 2 },
    swatchRing: { flex: 1, maxWidth: 42, aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
    swatch: { width: "76%", height: "76%", borderRadius: 999 },
    dayRow: { flexDirection: "row", gap: 6 },
    dayBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    dayText: { fontSize: 14, fontWeight: "800" },
    settingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    settingTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    settingSub: { fontSize: 12, fontWeight: "500", color: colors.textTertiary, marginTop: 2 },
    restStepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.fill, borderRadius: 12, padding: 2 },
    restBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
    restBtnText: { fontSize: 20, fontWeight: "700", color: colors.text },
    restValue: { minWidth: 40, textAlign: "center", fontSize: 15, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    alertRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: -4 },
    alertChips: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "flex-end" },
    alertChip: { height: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.fill, justifyContent: "center" },
    alertChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    exHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingHorizontal: 2, minHeight: 36 },
    sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textTertiary },
    hint: { fontSize: 12, fontWeight: "500", color: colors.textTertiary, textAlign: "center", marginTop: -6 },
    emptyList: { padding: 22, borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: colors.fillStrong },
    emptyText: { textAlign: "center", fontSize: 14, fontWeight: "600", color: colors.textTertiary },
    addExercise: {
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    addExerciseText: { fontSize: 15, fontWeight: "800", color: colors.primaryText },
    deleteRoutine: { height: 48, alignItems: "center", justifyContent: "center" },
    deleteRoutineText: { fontSize: 15, fontWeight: "700", color: colors.error },
  });
