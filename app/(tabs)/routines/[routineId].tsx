import React, { useState, useCallback, useMemo, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Trash2, Search, Check, X, Timer, Bell, ChevronUp, ChevronDown } from "lucide-react-native";
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
  WEEKDAY_SHORT,
  ALL_WEEKDAYS,
  RestTimerAlert,
  WeightUnit,
} from "@/types";
import { generateId } from "@/utils/helpers";
import { formatWeight, toDisplayWeight, fromDisplayWeight, trimNumber } from "@/utils/units";
import { Layout, Space, Type, muscleColor, numeric } from "@/constants/theme";
import { Tag } from "@/components/ui";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];
const SWIPE_THRESHOLD = -56;
const REST_TIMER_DURATIONS = [30, 45, 60, 90, 120, 180];
const REST_ALERT_OPTIONS: { value: RestTimerAlert; label: string }[] = [
  { value: "vibrate", label: "Vibrate" },
  { value: "sound", label: "Sound" },
  { value: "both", label: "Both" },
  { value: "none", label: "None" },
];

const ROUTINE_COLORS: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Lime", value: "#84CC16" },
  { label: "Emerald", value: "#10B981" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Orange", value: "#F97316" },
  { label: "Pink", value: "#EC4899" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Red", value: "#EF4444" },
];

// ─── Swipeable Exercise Row ─────────────────────────────────
interface SwipeableRowProps {
  exercise: RoutineExercise;
  index: number;
  onDelete: () => void;
  onTap: () => void;
  weightUnit: WeightUnit;
  accentColor?: string;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function SwipeableExerciseRow({ exercise, index, onDelete, onTap, weightUnit, accentColor, onMove, canMoveUp, canMoveDown }: SwipeableRowProps) {
  const { colors } = useTheme();
  const swStyles = useMemo(() => createSwStyles(colors), [colors]);
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -72));
        } else if (isOpen.current) {
          translateX.setValue(Math.min(gestureState.dx - 56, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -56,
            useNativeDriver: true,
            friction: 8,
          }).start();
          isOpen.current = true;
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const handleDelete = useCallback(() => {
    closeSwipe();
    Alert.alert(
      "Remove Exercise",
      `Remove "${exercise.exerciseName}" from this routine?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onDelete },
      ]
    );
  }, [closeSwipe, onDelete, exercise.exerciseName]);

  return (
    <View style={swStyles.container}>
      {/* Delete action behind */}
      <View style={swStyles.deleteAction}>
        <TouchableOpacity style={swStyles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
          <Trash2 size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Foreground row */}
      <Animated.View
        style={[
          swStyles.foreground,
          { transform: [{ translateX }] },
          accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined,
        ]}
      >
        <TouchableOpacity
          style={swStyles.rowContent}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            } else {
              onTap();
            }
          }}
          activeOpacity={0.7}
          {...panResponder.panHandlers}
        >
          <View style={[
            swStyles.exerciseNumber,
            accentColor ? { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` } : undefined,
          ]}>
            <Text style={[swStyles.exerciseNumberText, accentColor ? { color: accentColor } : undefined]}>{index + 1}</Text>
          </View>
          <View style={swStyles.exerciseInfo}>
            <Text style={swStyles.exerciseName} numberOfLines={1}>{exercise.exerciseName}</Text>
            <Text style={swStyles.exerciseDetail} numberOfLines={1}>
              {(() => {
                const configs = exercise.setConfigs;
                if (!configs || configs.length === 0) {
                  return `${exercise.sets}×${exercise.reps} @ ${formatWeight(exercise.weight, weightUnit)}`;
                }
                // Check if all sets are identical
                const allSame = configs.every(
                  (s) => s.weight === configs[0].weight && s.reps === configs[0].reps
                );
                if (allSame) {
                  return `${configs.length} sets · ${formatWeight(configs[0].weight, weightUnit)} × ${configs[0].reps} reps`;
                }
                // Mixed sets: show compact summary
                const weights = [...new Set(configs.map((s) => s.weight))];
                const reps = [...new Set(configs.map((s) => s.reps))];
                const wStr = weights.length === 1
                  ? formatWeight(weights[0], weightUnit)
                  : `${formatWeight(Math.min(...weights), weightUnit, { withUnit: false, bodyweightLabel: false })}-${formatWeight(Math.max(...weights), weightUnit)}`;
                const rStr = reps.length === 1 ? `${reps[0]}` : `${Math.min(...reps)}-${Math.max(...reps)}`;
                return `${configs.length} sets · ${wStr} × ${rStr} reps`;
              })()}
            </Text>
          </View>
          {onMove && (
            <View style={swStyles.reorderColumn}>
              <TouchableOpacity
                onPress={() => onMove("up")}
                disabled={!canMoveUp}
                style={[swStyles.reorderBtn, !canMoveUp && swStyles.reorderBtnDisabled]}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${exercise.exerciseName} earlier`}
              >
                <ChevronUp size={15} color={canMoveUp ? colors.textTertiary : colors.glassBorder} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMove("down")}
                disabled={!canMoveDown}
                style={[swStyles.reorderBtn, !canMoveDown && swStyles.reorderBtnDisabled]}
                hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${exercise.exerciseName} later`}
              >
                <ChevronDown size={15} color={canMoveDown ? colors.textTertiary : colors.glassBorder} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createSwStyles = (colors: ColorScheme) => StyleSheet.create({
  reorderColumn: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingLeft: 4,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  container: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.error,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  foreground: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  exerciseNumber: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: `${colors.primary}14`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}26`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  exerciseDetail: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 2,
  },
});

// ─── Edit Modal ─────────────────────────────────────────────
interface SetRow {
  reps: string;
  weight: string;
}

interface EditModalProps {
  visible: boolean;
  exercise: RoutineExercise | null;
  routineColor?: string;
  weightUnit: WeightUnit;
  onSave: (id: string, sets: number, reps: number, weight: number, setConfigs: RoutineSetConfig[], color?: string) => void;
  onClose: () => void;
}

function EditExerciseModal({ visible, exercise, routineColor, weightUnit, onSave, onClose }: EditModalProps) {
  const { colors } = useTheme();
  const editStyles = useMemo(() => createEditStyles(colors), [colors]);
  const [setRows, setSetRows] = useState<SetRow[]>([]);
  const [exerciseColor, setExerciseColor] = useState<string | null>(null);

  React.useEffect(() => {
    if (exercise) {
      const rows: SetRow[] = [];
      for (let i = 0; i < exercise.sets; i++) {
        rows.push({
          reps: (exercise.setConfigs?.[i]?.reps ?? exercise.reps).toString(),
          weight: trimNumber(
            toDisplayWeight(exercise.setConfigs?.[i]?.weight ?? exercise.weight, weightUnit)
          ),
        });
      }
      setSetRows(rows);
      setExerciseColor(exercise.color ?? null);
    }
  }, [exercise, weightUnit]);

  const handleAddSet = () => {
    const lastRow = setRows[setRows.length - 1];
    setSetRows([...setRows, { reps: lastRow?.reps ?? "10", weight: lastRow?.weight ?? "0" }]);
  };

  const handleRemoveSet = (index: number) => {
    if (setRows.length <= 1) return;
    setSetRows(setRows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "reps" | "weight", value: string) => {
    setSetRows(setRows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSave = () => {
    if (!exercise) return;
    // Inputs are in the user's display unit; storage is always pounds.
    const configs: RoutineSetConfig[] = setRows.map((r) => ({
      reps: parseInt(r.reps, 10) || 1,
      weight: fromDisplayWeight(parseFloat(r.weight) || 0, weightUnit),
    }));
    const firstReps = configs[0]?.reps ?? 10;
    const firstWeight = configs[0]?.weight ?? 0;
    onSave(exercise.id, setRows.length, firstReps, firstWeight, configs, exerciseColor ?? undefined);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const activeColor = exerciseColor || routineColor;

  if (!exercise) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={editStyles.overlay}>
        <View style={editStyles.card}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>{exercise.exerciseName}</Text>
            <TouchableOpacity onPress={onClose} style={editStyles.closeBtn}>
              <X size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Column headers */}
          <View style={editStyles.columnHeaders}>
            <Text style={[editStyles.columnLabel, { width: 36 }]}>SET</Text>
            <Text style={[editStyles.columnLabel, { flex: 1 }]}>REPS</Text>
            <Text style={[editStyles.columnLabel, { flex: 1 }]}>WEIGHT ({weightUnit})</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Set rows */}
          <ScrollView style={editStyles.setList} showsVerticalScrollIndicator={false}>
            {setRows.map((row, index) => (
              <View key={index} style={editStyles.setRow}>
                <View style={editStyles.setNumber}>
                  <Text style={editStyles.setNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={editStyles.setInput}
                  value={row.reps}
                  onChangeText={(v) => updateRow(index, "reps", v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  placeholder="10"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={editStyles.setInput}
                  value={row.weight}
                  onChangeText={(v) => updateRow(index, "weight", v)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={`Weight for set ${index + 1}`}
                />
                <TouchableOpacity
                  onPress={() => handleRemoveSet(index)}
                  style={[
                    editStyles.removeSetBtn,
                    setRows.length > 1 && { backgroundColor: colors.error },
                  ]}
                  disabled={setRows.length <= 1}
                >
                  <Trash2 size={12} color={setRows.length <= 1 ? colors.textTertiary : colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Add set button */}
          <TouchableOpacity style={editStyles.addSetBtn} onPress={handleAddSet} activeOpacity={0.7}>
            <Plus size={14} color={colors.primary} />
            <Text style={editStyles.addSetText}>Add Set</Text>
          </TouchableOpacity>

          {/* Per-exercise color */}
          <View style={editStyles.colorSection}>
            <Text style={editStyles.colorSectionLabel}>Card Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={editStyles.colorRow}>
              {ROUTINE_COLORS.map((c) => {
                const isSelected = exerciseColor === c.value || (!exerciseColor && !c.value);
                return (
                  <TouchableOpacity
                    key={c.label}
                    onPress={() => {
                      setExerciseColor(c.value);
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }}
                    style={[
                      editStyles.colorDot,
                      c.value ? { backgroundColor: c.value } : editStyles.colorDotDefault,
                      isSelected && editStyles.colorDotSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Check size={12} color={c.value ? "#fff" : colors.text} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {activeColor && (
              <View style={[editStyles.colorPreview, { backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30` }]}>
                <View style={[editStyles.colorPreviewDot, { backgroundColor: activeColor }]} />
                <Text style={[editStyles.colorPreviewText, { color: activeColor }]}>
                  {exerciseColor ? "Custom color" : "Using routine color"}
                </Text>
              </View>
            )}
          </View>

          <View style={editStyles.buttons}>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
              <Text style={editStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
              <View style={[editStyles.saveBtn, { backgroundColor: colors.primary }]}>
                <Check size={18} color="#fff" />
                <Text style={editStyles.saveText}>Save</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createEditStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textAlign: "center" as const,
  },
  setList: {
    maxHeight: 240,
    marginBottom: 12,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  setNumber: {
    width: 36,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.indigo,
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    textAlign: "center" as const,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  removeSetBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: `${colors.primary}26`,
    backgroundColor: `${colors.primary}0A`,
    marginBottom: 16,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  colorSection: {
    marginBottom: 16,
  },
  colorSectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  colorRow: {
    gap: 8,
    paddingVertical: 2,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDotDefault: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: colors.text,
  },
  colorPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorPreviewText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
});

// ═══ MAIN SCREEN ════════════════════════════════════════════
export default function RoutineDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const {
    routines,
    allExercises,
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>("chest");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSets, setCustomSets] = useState("3");
  const [customReps, setCustomReps] = useState("10");
  const [customWeight, setCustomWeight] = useState("0");
  const [editingName, setEditingName] = useState(false);
  const [routineName, setRoutineName] = useState(routine?.name ?? "");
  const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  /**
   * Searching used to only filter within the selected muscle tab, so typing
   * "curl" while Chest was active returned nothing even though the exercise
   * exists. A query now searches the whole library and the tabs act as the
   * browse mode when the field is empty.
   */
  const filteredExercises = useMemo(() => {
    if (trimmedQuery.length > 0) {
      return allExercises
        .filter((e) => e.name.toLowerCase().includes(trimmedQuery))
        .sort((a, b) => {
          // Prefix matches first — "bench" should surface "Bench Press"
          // before "Close-Grip Bench Press".
          const aStarts = a.name.toLowerCase().startsWith(trimmedQuery) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(trimmedQuery) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return a.name.localeCompare(b.name);
        });
    }
    return allExercises.filter((e) => e.muscleGroup === selectedMuscle);
  }, [allExercises, selectedMuscle, trimmedQuery]);

  /** Exercises already in this routine can't be added twice. */
  const addedNames = useMemo(
    () => new Set((routine?.exercises ?? []).map((e) => e.exerciseName.toLowerCase())),
    [routine]
  );

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      if (!routineId) return;
      // Guard: prevent adding duplicate exercise
      if (routine?.exercises.some((e) => e.exerciseName === exercise.name)) {
        Alert.alert("Already Added", `${exercise.name} is already in this routine.`);
        return;
      }
      const numSets = parseInt(customSets, 10) || 3;
      const numReps = parseInt(customReps, 10) || 10;
      const numWeight = fromDisplayWeight(parseFloat(customWeight) || 0, wu);
      const routineExercise: RoutineExercise = {
        id: generateId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: numSets,
        reps: numReps,
        weight: numWeight,
        setConfigs: Array.from({ length: numSets }, () => ({ reps: numReps, weight: numWeight })),
      };
      addExerciseToRoutine(routineId, routineExercise);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setShowAddModal(false);
      setSearchQuery("");
      setCustomSets("3");
      setCustomReps("10");
      setCustomWeight("0");
    },
    [routineId, routine, customSets, customReps, customWeight, wu, addExerciseToRoutine]
  );

  const handleAddCustom = useCallback((nameOverride?: string) => {
    const exerciseName = nameOverride?.trim() || "";
    if (!exerciseName || !routineId) return;
    // Guard: prevent adding duplicate exercise
    if (routine?.exercises.some((e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase())) {
      Alert.alert("Already Added", `${exerciseName} is already in this routine.`);
      return;
    }
    const exercise = addCustomExercise(exerciseName, selectedMuscle);
    if (!exercise) return;
    const numSets = parseInt(customSets, 10) || 3;
    const numReps = parseInt(customReps, 10) || 10;
    const numWeight = fromDisplayWeight(parseFloat(customWeight) || 0, wu);
    const routineExercise: RoutineExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: numSets,
      reps: numReps,
      weight: numWeight,
      setConfigs: Array.from({ length: numSets }, () => ({ reps: numReps, weight: numWeight })),
    };
    addExerciseToRoutine(routineId, routineExercise);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowAddModal(false);
    setSearchQuery("");
    setCustomSets("3");
    setCustomReps("10");
    setCustomWeight("0");
  }, [routineId, routine, selectedMuscle, customSets, customReps, customWeight, wu, addCustomExercise, addExerciseToRoutine]);

  const handleRemoveExercise = useCallback(
    (exerciseId: string) => {
      if (!routineId) return;
      removeExerciseFromRoutine(routineId, exerciseId);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [routineId, removeExerciseFromRoutine]
  );

  const handleEditSave = useCallback(
    (exerciseId: string, sets: number, reps: number, weight: number, setConfigs: RoutineSetConfig[], color?: string) => {
      if (!routine || !routineId) return;
      const updatedExercises = routine.exercises.map((e) =>
        e.id === exerciseId ? { ...e, sets, reps, weight, setConfigs, color } : e
      );
      updateRoutine(routineId, { exercises: updatedExercises });
      setEditingExercise(null);
    },
    [routine, routineId, updateRoutine]
  );

  const handleDeleteRoutine = useCallback(() => {
    Alert.alert("Delete Routine", "Are you sure you want to delete this routine?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (routineId) {
            deleteRoutine(routineId);
            router.back();
          }
        },
      },
    ]);
  }, [routineId, deleteRoutine, router]);

  const handleSaveName = useCallback(() => {
    if (routineId && routineName.trim()) {
      updateRoutine(routineId, { name: routineName.trim() });
    }
    setEditingName(false);
  }, [routineId, routineName, updateRoutine]);

  const handleToggleDay = useCallback((day: WeekDay) => {
    if (!routine || !routineId) return;
    const current = routine.scheduledDays || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateRoutine(routineId, { scheduledDays: updated });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [routine, routineId, updateRoutine]);

  const handleToggleRestTimer = useCallback(() => {
    if (!routineId || !routine) return;
    const current = routine.restTimerEnabled !== false; // default true
    updateRoutine(routineId, { restTimerEnabled: !current });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [routineId, routine, updateRoutine]);

  const handleSetRestDuration = useCallback((duration: number) => {
    if (!routineId) return;
    updateRoutine(routineId, { restTimerDuration: duration });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [routineId, updateRoutine]);

  const handleSetRestAlert = useCallback((alert: RestTimerAlert) => {
    if (!routineId) return;
    updateRoutine(routineId, { restTimerAlert: alert });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [routineId, updateRoutine]);

  if (!routine) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Routine not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        {editingName ? (
          <TextInput
            style={styles.nameInput}
            value={routineName}
            onChangeText={setRoutineName}
            onBlur={handleSaveName}
            onSubmitEditing={handleSaveName}
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => { setRoutineName(routine.name); setEditingName(true); }} style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{routine.name}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDeleteRoutine} style={styles.deleteButton}>
          <Trash2 size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Day Scheduler */}
      <View style={styles.dayPickerRow}>
        {ALL_WEEKDAYS.map((day) => {
          const active = routine.scheduledDays?.includes(day);
          return (
            <TouchableOpacity
              key={day}
              onPress={() => handleToggleDay(day)}
              activeOpacity={0.7}
            >
              {active ? (
                <View style={[styles.dayChip, { backgroundColor: colors.primary }]}>
                  <Text style={styles.dayChipTextActive}>{WEEKDAY_SHORT[day]}</Text>
                </View>
              ) : (
                <View style={[styles.dayChip, styles.dayChipInactive]}>
                  <Text style={styles.dayChipText}>{WEEKDAY_SHORT[day]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rest Timer Settings */}
      <View style={styles.colorPickerSection}>
        <TouchableOpacity
          style={styles.restTimerToggleRow}
          onPress={handleToggleRestTimer}
          activeOpacity={0.7}
        >
          <Timer size={14} color={colors.textTertiary} />
          <Text style={styles.colorPickerLabel}>Rest Timer</Text>
          <View style={[styles.toggleTrack, routine.restTimerEnabled !== false && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, routine.restTimerEnabled !== false && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {routine.restTimerEnabled !== false && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerRow}
            >
              {REST_TIMER_DURATIONS.map((dur) => {
                const isActive = (routine.restTimerDuration ?? 60) === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    onPress={() => handleSetRestDuration(dur)}
                    activeOpacity={0.7}
                    style={[styles.restDurPill, isActive && styles.restDurPillActive]}
                  >
                    <Text style={[styles.restDurText, isActive && styles.restDurTextActive]}>
                      {dur < 60 ? `${dur}s` : dur % 60 === 0 ? `${dur / 60}m` : `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.restAlertRow}>
              <Bell size={12} color={colors.textTertiary} />
              <Text style={styles.restAlertLabel}>Alert:</Text>
              {REST_ALERT_OPTIONS.map((opt) => {
                const isActive = (routine.restTimerAlert ?? "vibrate") === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSetRestAlert(opt.value)}
                    activeOpacity={0.7}
                    style={[styles.restAlertChip, isActive && styles.restAlertChipActive]}
                  >
                    <Text style={[styles.restAlertChipText, isActive && styles.restAlertChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Hint text */}
      {routine.exercises.length > 0 && (
        <Text style={styles.hintText}>Tap to edit · Swipe left to delete · Arrows reorder</Text>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routine.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>Add exercises to build your routine</Text>
          </View>
        ) : (
          routine.exercises.map((exercise, index) => (
            <SwipeableExerciseRow
              key={exercise.id}
              exercise={exercise}
              index={index}
              onDelete={() => handleRemoveExercise(exercise.id)}
              onTap={() => setEditingExercise(exercise)}
              weightUnit={wu}
              accentColor={exercise.color || routine.color}
              onMove={
                routine.exercises.length > 1
                  ? (direction) => {
                      if (!routineId) return;
                      reorderExerciseInRoutine(routineId, exercise.id, direction);
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }
                  : undefined
              }
              canMoveUp={index > 0}
              canMoveDown={index < routine.exercises.length - 1}
            />
          ))
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.primary} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Exercise Modal */}
      <EditExerciseModal
        visible={editingExercise !== null}
        exercise={editingExercise}
        routineColor={routine.color}
        weightUnit={wu}
        onSave={handleEditSave}
        onClose={() => setEditingExercise(null)}
      />

      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setSearchQuery(""); }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.setsRepsRow}>
            <View style={styles.setsRepsField}>
              <Text style={styles.setsRepsLabel}>Sets</Text>
              <TextInput
                style={styles.setsRepsInput}
                value={customSets}
                onChangeText={setCustomSets}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.setsRepsField}>
              <Text style={styles.setsRepsLabel}>Reps</Text>
              <TextInput
                style={styles.setsRepsInput}
                value={customReps}
                onChangeText={setCustomReps}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.setsRepsField}>
              <Text style={styles.setsRepsLabel}>Weight ({wu})</Text>
              <TextInput
                style={styles.setsRepsInput}
                value={customWeight}
                onChangeText={setCustomWeight}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {trimmedQuery.length === 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll} contentContainerStyle={styles.muscleScrollContent}>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                onPress={() => setSelectedMuscle(mg)}
              >
                {selectedMuscle === mg ? (
                  <View style={[styles.musclePill, { backgroundColor: muscleColor(mg, colors) }]}>
                    <Text style={styles.musclePillTextActive}>
                      {MUSCLE_GROUP_LABELS[mg]}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.musclePill, styles.musclePillInactive]}>
                    <Text style={styles.musclePillText}>
                      {MUSCLE_GROUP_LABELS[mg]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          )}

          <View style={styles.searchRow}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search all exercises, or name a new one"
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search exercises"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          {trimmedQuery.length > 0 && (
            <Text style={styles.searchCount}>
              {filteredExercises.length} match{filteredExercises.length === 1 ? "" : "es"} across all muscle groups
            </Text>
          )}

          <ScrollView style={styles.exercisesList} contentContainerStyle={styles.exercisesListContent}>
            {searchQuery.trim().length > 0 && !filteredExercises.some((e) => e.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <TouchableOpacity
                style={styles.customExerciseRow}
                onPress={() => {
                  handleAddCustom(searchQuery.trim());
                }}
              >
                <Plus size={18} color={colors.primary} />
                <Text style={styles.customExerciseText}>
                  Add &ldquo;{searchQuery.trim()}&rdquo; as custom exercise
                </Text>
              </TouchableOpacity>
            )}

            {filteredExercises.length === 0 && trimmedQuery.length === 0 && (
              <Text style={styles.pickerEmpty}>
                No exercises in this group yet. Type a name above to create one.
              </Text>
            )}

            {filteredExercises.map((exercise) => {
              const added = addedNames.has(exercise.name.toLowerCase());
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseListItem, added && styles.exerciseListItemAdded]}
                  onPress={() => handleAddExercise(exercise)}
                  activeOpacity={added ? 1 : 0.7}
                  disabled={added}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: added }}
                  accessibilityLabel={
                    added
                      ? `${exercise.name}, already in this routine`
                      : `Add ${exercise.name}, ${MUSCLE_GROUP_LABELS[exercise.muscleGroup]}`
                  }
                >
                  <View style={styles.exerciseListInfo}>
                    <Text style={styles.exerciseListName} numberOfLines={1}>{exercise.name}</Text>
                    {/* Searching spans every group, so name the group on each row. */}
                    <Text style={styles.exerciseListGroup}>
                      {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
                    </Text>
                  </View>
                  {exercise.isCustom && <Tag label="Custom" color={colors.violet} size="sm" />}
                  {added ? (
                    <Check size={18} color={colors.emerald} />
                  ) : (
                    <Plus size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  exerciseListInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseListGroup: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  exerciseListItemAdded: {
    opacity: 0.5,
  },
  searchCount: {
    ...Type.caption,
    ...numeric,
    color: colors.textTertiary,
    paddingHorizontal: Layout.gutter,
    paddingBottom: Space.sm,
  },
  pickerEmpty: {
    ...Type.subhead,
    color: colors.textTertiary,
    textAlign: "center",
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.xl,
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    textAlign: "center" as const,
    letterSpacing: -0.3,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    flex: 1,
    textAlign: "center" as const,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 42,
    alignItems: "center",
  },
  dayChipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textTertiary,
  },
  dayChipTextActive: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fff",
  },
  colorPickerSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  colorPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  colorPickerLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  colorPickerRow: {
    gap: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchDefault: {
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  emojiSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  emojiSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  emojiSwatchText: {
    fontSize: 18,
  },
  restTimerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 2,
    marginLeft: "auto",
  },
  toggleTrackOn: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  restDurPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  restDurPillActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: colors.primary,
  },
  restDurText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  restDurTextActive: {
    color: colors.primary,
  },
  restAlertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  restAlertLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "600" as const,
    marginRight: 2,
  },
  restAlertChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  restAlertChipActive: {
    backgroundColor: `${colors.primary}1A`,
  },
  restAlertChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  restAlertChipTextActive: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  hintText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed" as const,
    marginTop: 8,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  modalClose: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600" as const,
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  setsRepsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  setsRepsField: {
    flex: 1,
  },
  setsRepsLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  setsRepsInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  muscleScroll: {
    maxHeight: 48,
    marginTop: 16,
  },
  muscleScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  musclePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  musclePillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  musclePillText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  musclePillTextActive: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.white,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  exercisesList: {
    flex: 1,
    marginTop: 12,
  },
  exercisesListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  customExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: `${colors.primary}0F`,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}26`,
  },
  customExerciseText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.primary,
    flex: 1,
  },
  exerciseListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
    minHeight: Layout.rowHeight,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
  },
  exerciseListName: {
    ...Type.body,
    fontWeight: "600",
    color: colors.text,
  },
  customBadge: {
    backgroundColor: `${colors.primary}14`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primary,
  },
});
