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
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Plus, Trash2, Search, Check, X, Palette } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
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
} from "@/types";
import { generateId } from "@/utils/helpers";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];
const SWIPE_THRESHOLD = -80;

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
  weightUnit: string;
}

function SwipeableExerciseRow({ exercise, index, onDelete, onTap, weightUnit }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        } else if (isOpen.current) {
          translateX.setValue(Math.min(gestureState.dx - 80, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -80,
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
          <Trash2 size={20} color="#fff" />
          <Text style={swStyles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground row */}
      <Animated.View
        style={[swStyles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
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
        >
          <View style={swStyles.exerciseNumber}>
            <Text style={swStyles.exerciseNumberText}>{index + 1}</Text>
          </View>
          <View style={swStyles.exerciseInfo}>
            <Text style={swStyles.exerciseName} numberOfLines={1}>{exercise.exerciseName}</Text>
            <Text style={swStyles.exerciseDetail} numberOfLines={1}>
              {(() => {
                const configs = exercise.setConfigs;
                if (!configs || configs.length === 0) {
                  return `${exercise.sets}×${exercise.reps}${exercise.weight > 0 ? ` @ ${exercise.weight} ${weightUnit}` : ""}`;
                }
                // Check if all sets are identical
                const allSame = configs.every(
                  (s) => s.weight === configs[0].weight && s.reps === configs[0].reps
                );
                if (allSame) {
                  const w = configs[0].weight;
                  return `${configs.length} sets · ${w > 0 ? w + " " + weightUnit : "BW"} × ${configs[0].reps} reps`;
                }
                // Mixed sets: show compact summary
                const weights = [...new Set(configs.map((s) => s.weight))];
                const reps = [...new Set(configs.map((s) => s.reps))];
                const wStr = weights.length === 1
                  ? (weights[0] > 0 ? `${weights[0]} ${weightUnit}` : "BW")
                  : `${Math.min(...weights)}-${Math.max(...weights)} ${weightUnit}`;
                const rStr = reps.length === 1 ? `${reps[0]}` : `${Math.min(...reps)}-${Math.max(...reps)}`;
                return `${configs.length} sets · ${wStr} × ${rStr} reps`;
              })()}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const swStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.error,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    width: 80,
    height: "100%",
  },
  deleteText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  foreground: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
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
    borderRadius: 13,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(59,130,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  exerciseDetail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: Colors.textTertiary,
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
  onSave: (id: string, sets: number, reps: number, weight: number, setConfigs: RoutineSetConfig[]) => void;
  onClose: () => void;
}

function EditExerciseModal({ visible, exercise, onSave, onClose }: EditModalProps) {
  const [setRows, setSetRows] = useState<SetRow[]>([]);

  React.useEffect(() => {
    if (exercise) {
      const rows: SetRow[] = [];
      for (let i = 0; i < exercise.sets; i++) {
        rows.push({
          reps: (exercise.setConfigs?.[i]?.reps ?? exercise.reps).toString(),
          weight: (exercise.setConfigs?.[i]?.weight ?? exercise.weight).toString(),
        });
      }
      setSetRows(rows);
    }
  }, [exercise]);

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
    const configs: RoutineSetConfig[] = setRows.map((r) => ({
      reps: parseInt(r.reps, 10) || 1,
      weight: parseInt(r.weight, 10) || 0,
    }));
    const firstReps = configs[0]?.reps ?? 10;
    const firstWeight = configs[0]?.weight ?? 0;
    onSave(exercise.id, setRows.length, firstReps, firstWeight, configs);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (!exercise) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={editStyles.overlay}>
        <View style={editStyles.card}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>{exercise.exerciseName}</Text>
            <TouchableOpacity onPress={onClose} style={editStyles.closeBtn}>
              <X size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Column headers */}
          <View style={editStyles.columnHeaders}>
            <Text style={[editStyles.columnLabel, { width: 36 }]}>SET</Text>
            <Text style={[editStyles.columnLabel, { flex: 1 }]}>REPS</Text>
            <Text style={[editStyles.columnLabel, { flex: 1 }]}>WEIGHT</Text>
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
                  placeholderTextColor={Colors.textTertiary}
                />
                <TextInput
                  style={editStyles.setInput}
                  value={row.weight}
                  onChangeText={(v) => updateRow(index, "weight", v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                />
                <TouchableOpacity
                  onPress={() => handleRemoveSet(index)}
                  style={editStyles.removeSetBtn}
                  disabled={setRows.length <= 1}
                >
                  <X size={14} color={setRows.length <= 1 ? "rgba(0,0,0,0.1)" : Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Add set button */}
          <TouchableOpacity style={editStyles.addSetBtn} onPress={handleAddSet} activeOpacity={0.7}>
            <Plus size={14} color={Colors.primary} />
            <Text style={editStyles.addSetText}>Add Set</Text>
          </TouchableOpacity>

          <View style={editStyles.buttons}>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
              <Text style={editStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primary, Colors.indigo]}
                style={editStyles.saveBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Check size={18} color="#fff" />
                <Text style={editStyles.saveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
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
    color: Colors.text,
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
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
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
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.indigo,
  },
  setInput: {
    flex: 1,
    backgroundColor: "rgba(99,102,241,0.06)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center" as const,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
  },
  removeSetBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(59,130,246,0.15)",
    backgroundColor: "rgba(59,130,246,0.04)",
    marginBottom: 16,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.06)",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const {
    routines,
    allExercises,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
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

  const filteredExercises = useMemo(() => {
    return allExercises.filter(
      (e) =>
        e.muscleGroup === selectedMuscle &&
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allExercises, selectedMuscle, searchQuery]);

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
      const numWeight = parseInt(customWeight, 10) || 0;
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
    [routineId, routine, customSets, customReps, customWeight, addExerciseToRoutine]
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
    const numWeight = parseInt(customWeight, 10) || 0;
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
  }, [routineId, routine, selectedMuscle, customSets, customReps, customWeight, addCustomExercise, addExerciseToRoutine]);

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
    (exerciseId: string, sets: number, reps: number, weight: number, setConfigs: RoutineSetConfig[]) => {
      if (!routine || !routineId) return;
      const updatedExercises = routine.exercises.map((e) =>
        e.id === exerciseId ? { ...e, sets, reps, weight, setConfigs } : e
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

  const handlePickColor = useCallback((color: string | null) => {
    if (!routineId) return;
    updateRoutine(routineId, { color: color || undefined });
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
          <ArrowLeft size={24} color={Colors.text} />
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
          <Trash2 size={20} color={Colors.error} />
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
                <LinearGradient
                  colors={[Colors.primary, Colors.indigo]}
                  style={styles.dayChip}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.dayChipTextActive}>{WEEKDAY_SHORT[day]}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.dayChip, styles.dayChipInactive]}>
                  <Text style={styles.dayChipText}>{WEEKDAY_SHORT[day]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Color Picker */}
      <View style={styles.colorPickerSection}>
        <View style={styles.colorPickerHeader}>
          <Palette size={14} color={Colors.textTertiary} />
          <Text style={styles.colorPickerLabel}>Card Color</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorPickerRow}
        >
          {ROUTINE_COLORS.map((c) => {
            const isSelected = c.value === (routine.color ?? null);
            return (
              <TouchableOpacity
                key={c.label}
                onPress={() => handlePickColor(c.value)}
                activeOpacity={0.7}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c.value ?? "#FFFFFF" },
                  !c.value && styles.colorSwatchDefault,
                  isSelected && styles.colorSwatchSelected,
                ]}
              >
                {isSelected && (
                  <Check size={14} color={c.value ? "#fff" : Colors.text} strokeWidth={3} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Hint text */}
      {routine.exercises.length > 0 && (
        <Text style={styles.hintText}>Tap to edit · Swipe left to delete</Text>
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
            />
          ))
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color={Colors.primary} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Exercise Modal */}
      <EditExerciseModal
        visible={editingExercise !== null}
        exercise={editingExercise}
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
              <Text style={styles.setsRepsLabel}>Weight</Text>
              <TextInput
                style={styles.setsRepsInput}
                value={customWeight}
                onChangeText={setCustomWeight}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll} contentContainerStyle={styles.muscleScrollContent}>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                onPress={() => setSelectedMuscle(mg)}
              >
                {selectedMuscle === mg ? (
                  <LinearGradient
                    colors={[Colors.primary, Colors.indigo]}
                    style={styles.musclePill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.musclePillTextActive}>
                      {MUSCLE_GROUP_LABELS[mg]}
                    </Text>
                  </LinearGradient>
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

          <View style={styles.searchRow}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search or type custom exercise..."
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <ScrollView style={styles.exercisesList} contentContainerStyle={styles.exercisesListContent}>
            {searchQuery.trim().length > 0 && !filteredExercises.some((e) => e.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <TouchableOpacity
                style={styles.customExerciseRow}
                onPress={() => {
                  handleAddCustom(searchQuery.trim());
                }}
              >
                <Plus size={18} color={Colors.primary} />
                <Text style={styles.customExerciseText}>
                  Add "{searchQuery.trim()}" as custom exercise
                </Text>
              </TouchableOpacity>
            )}

            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseListItem}
                onPress={() => handleAddExercise(exercise)}
                activeOpacity={0.7}
              >
                <Text style={styles.exerciseListName}>{exercise.name}</Text>
                {exercise.isCustom && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                )}
                <Plus size={18} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center" as const,
    letterSpacing: -0.3,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
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
    backgroundColor: "rgba(99,102,241,0.06)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
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
    color: Colors.textTertiary,
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
    borderColor: "rgba(0,0,0,0.1)",
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: "rgba(0,0,0,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  hintText: {
    fontSize: 11,
    color: Colors.textTertiary,
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
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed" as const,
    marginTop: 8,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  modalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600" as const,
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
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
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  setsRepsInput: {
    backgroundColor: "rgba(99,102,241,0.06)",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
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
    borderRadius: 20,
  },
  musclePillInactive: {
    backgroundColor: "rgba(99,102,241,0.06)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  musclePillText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  musclePillTextActive: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
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
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  customExerciseText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
    flex: 1,
  },
  exerciseListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  exerciseListName: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  customBadge: {
    backgroundColor: "rgba(59,130,246,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
});
