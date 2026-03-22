import React, { useState, useCallback, useMemo } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import {
  MuscleGroup,
  MUSCLE_GROUP_LABELS,
  Exercise,
  RoutineExercise,
} from "@/types";
import { generateId } from "@/utils/helpers";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];

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
  } = useGym();

  const routine = useMemo(() => routines.find((r) => r.id === routineId), [routines, routineId]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>("chest");
  const [searchQuery, setSearchQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSets, setCustomSets] = useState("3");
  const [customReps, setCustomReps] = useState("10");
  const [customWeight, setCustomWeight] = useState("0");
  const [editingName, setEditingName] = useState(false);
  const [routineName, setRoutineName] = useState(routine?.name ?? "");

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
      const routineExercise: RoutineExercise = {
        id: generateId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: parseInt(customSets, 10) || 3,
        reps: parseInt(customReps, 10) || 10,
        weight: parseInt(customWeight, 10) || 0,
      };
      addExerciseToRoutine(routineId, routineExercise);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setShowAddModal(false);
      setSearchQuery("");
      setCustomName("");
      setCustomSets("3");
      setCustomReps("10");
      setCustomWeight("0");
    },
    [routineId, customSets, customReps, customWeight, addExerciseToRoutine]
  );

  const handleAddCustom = useCallback((nameOverride?: string) => {
    const exerciseName = nameOverride || customName.trim();
    if (!exerciseName || !routineId) return;
    const exercise = addCustomExercise(exerciseName, selectedMuscle);
    const routineExercise: RoutineExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: parseInt(customSets, 10) || 3,
      reps: parseInt(customReps, 10) || 10,
      weight: parseInt(customWeight, 10) || 0,
    };
    addExerciseToRoutine(routineId, routineExercise);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowAddModal(false);
    setSearchQuery("");
    setCustomName("");
    setCustomSets("3");
    setCustomReps("10");
    setCustomWeight("0");
  }, [customName, routineId, selectedMuscle, customSets, customReps, customWeight, addCustomExercise, addExerciseToRoutine]);

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
            <View key={exercise.id} style={styles.exerciseRow}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseDetail}>
                  {exercise.sets} sets × {exercise.reps} reps{exercise.weight > 0 ? ` · ${exercise.weight} lbs` : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveExercise(exercise.id)}
                style={styles.removeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
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

      <Modal visible={showAddModal} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setSearchQuery(""); setCustomName(""); }}>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  exerciseNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
  },
  removeButton: {
    padding: 8,
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
    borderBottomColor: "rgba(0,0,0,0.04)",
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
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
    borderBottomColor: "rgba(0,0,0,0.04)",
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
