import React, { useRef, useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextInput } from "react-native";
import { Check, ChevronDown, ChevronUp, Calculator, FileText, TrendingUp, TrendingDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { WorkoutSessionExercise, SetData, MUSCLE_GROUP_LABELS } from "@/types";
import PlateCalculator from "./PlateCalculator";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  onToggle: () => void;
  onRestTimer: (seconds?: number) => void;
  onToggleSet?: (setNumber: number) => void;
  onUpdateSetWeight?: (setNumber: number, weight: number) => void;
  previousPerformance?: { sets: { weight: number; reps: number }[] };
  onUpdateNote?: (note: string) => void;
  restSeconds?: number; // Per-exercise rest time
  lastNote?: string; // Note from last time this exercise was done
  showAdvanced?: boolean; // Whether to show advanced features (plate calc, notes, overload arrows)
}

function ExerciseCard({
  exercise,
  index = 0,
  onToggle,
  onRestTimer,
  onToggleSet,
  onUpdateSetWeight,
  previousPerformance,
  onUpdateNote,
  restSeconds,
  lastNote,
  showAdvanced = true,
}: Props) {
  const checkAnim = useRef(new Animated.Value(exercise.completed ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState(0);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(exercise.note || "");

  const completedSets = (exercise.setDetails || []).filter((s) => s.completed).length;
  const totalSets = exercise.setDetails?.length || exercise.sets;

  // Calculate progressive overload comparison
  const overloadComparison = React.useMemo(() => {
    if (!previousPerformance || !exercise.setDetails) return null;
    const currentTotalVolume = exercise.setDetails
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + s.weight * s.reps, 0);
    const prevTotalVolume = previousPerformance.sets.reduce(
      (sum, s) => sum + s.weight * s.reps,
      0
    );
    if (currentTotalVolume === 0 || prevTotalVolume === 0) return null;
    const diff = currentTotalVolume - prevTotalVolume;
    return { diff, isUp: diff > 0, isDown: diff < 0 };
  }, [exercise.setDetails, previousPerformance]);

  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: exercise.completed ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [exercise.completed, checkAnim]);

  const handleToggle = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== "web") {
      if (!exercise.completed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    onToggle();
  }, [exercise.completed, onToggle, scaleAnim]);

  const handleSetToggle = useCallback((setNumber: number, wasCompleted: boolean) => {
    if (onToggleSet) {
      onToggleSet(setNumber);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(wasCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      }
      // Auto-start rest timer when completing a set (not when unchecking)
      if (!wasCompleted) {
        onRestTimer(restSeconds ?? 60);
      }
    }
  }, [onToggleSet, onRestTimer, restSeconds]);

  const handleWeightSave = useCallback((setNumber: number) => {
    if (onUpdateSetWeight && editWeight.trim()) {
      const w = parseFloat(editWeight);
      if (!isNaN(w) && w >= 0) {
        onUpdateSetWeight(setNumber, w);
      }
    }
    setEditingSet(null);
    setEditWeight("");
  }, [onUpdateSetWeight, editWeight]);

  const handleNoteSave = useCallback(() => {
    if (onUpdateNote) {
      onUpdateNote(noteText);
    }
    setShowNoteInput(false);
  }, [onUpdateNote, noteText]);

  const backgroundColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.5)", "rgba(16,185,129,0.06)"],
  });

  const borderColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.7)", "rgba(16,185,129,0.2)"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Main exercise row */}
      <View style={styles.content}>
        <TouchableOpacity style={styles.toggleArea} onPress={handleToggle} activeOpacity={0.7} testID={`exercise-${exercise.routineExerciseId}`} accessibilityLabel={`${exercise.exerciseName}, ${completedSets} of ${totalSets} sets complete`} accessibilityRole="button">
          <Animated.View
            style={[
              styles.checkbox,
              {
                backgroundColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["rgba(59,130,246,0.08)", Colors.emerald],
                }),
                borderColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["rgba(59,130,246,0.2)", Colors.emerald],
                }),
              },
            ]}
          >
            {exercise.completed ? (
              <Check size={16} color={Colors.white} />
            ) : (
              <Text style={styles.indexText}>{index + 1}</Text>
            )}
          </Animated.View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.exerciseName, exercise.completed && styles.exerciseNameCompleted]}>
                {exercise.exerciseName}
              </Text>
              {/* Progressive overload indicator (advanced only) */}
              {showAdvanced && overloadComparison && exercise.completed && (
                <View style={styles.overloadBadge}>
                  {overloadComparison.isUp ? (
                    <TrendingUp size={12} color={Colors.emerald} />
                  ) : overloadComparison.isDown ? (
                    <TrendingDown size={12} color={Colors.amber} />
                  ) : null}
                </View>
              )}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detail}>
                {completedSets}/{totalSets} sets
              </Text>
              <View style={styles.dot} />
              <Text style={styles.detail}>
                {(() => {
                  const sets = exercise.setDetails || [];
                  if (sets.length === 0) return exercise.weight > 0 ? `${exercise.weight} lbs` : "BW";
                  const weights = [...new Set(sets.map((s) => s.weight))];
                  if (weights.length === 1) return weights[0] > 0 ? `${weights[0]} lbs` : "BW";
                  return `${Math.min(...weights)}-${Math.max(...weights)} lbs`;
                })()}
              </Text>
              <View style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
            </View>
            {/* Previous performance hint */}
            {previousPerformance && !exercise.completed && previousPerformance.sets.length > 0 && (
              <Text style={styles.lastTimeHint}>
                Last: {previousPerformance.sets.map((s) => `${s.weight}x${s.reps}`).slice(0, 3).join(", ")}
                {previousPerformance.sets.length > 3 ? "..." : ""}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.rightActions}>
          {!exercise.completed && (
            <View style={styles.restButtons}>
              {[restSeconds ?? 60, restSeconds ? Math.round(restSeconds * 1.5) : 90].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.restButton}
                  onPress={() => onRestTimer(s)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.restButtonText}>{s >= 60 ? `${Math.floor(s / 60)}m${s % 60 > 0 ? s % 60 : ""}` : `${s}s`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {exercise.setDetails && exercise.setDetails.length > 0 && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpanded(!expanded)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {expanded ? (
                <ChevronUp size={16} color={Colors.textTertiary} />
              ) : (
                <ChevronDown size={16} color={Colors.textTertiary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Last note from previous session (advanced only) */}
      {showAdvanced && lastNote && !exercise.note && !showNoteInput && (
        <View style={styles.lastNoteContainer}>
          <Text style={styles.lastNoteText}>Previous note: {lastNote}</Text>
        </View>
      )}

      {/* Expanded set details */}
      {expanded && exercise.setDetails && (
        <View style={styles.setsContainer}>
          {exercise.setDetails.map((set) => (
            <View key={set.setNumber} style={styles.setRow}>
              <TouchableOpacity
                style={[styles.setCheckbox, set.completed && styles.setCheckboxCompleted]}
                onPress={() => handleSetToggle(set.setNumber, set.completed)}
                activeOpacity={0.7}
              >
                {set.completed && <Check size={12} color="#fff" />}
              </TouchableOpacity>
              <Text style={[styles.setLabel, set.completed && styles.setLabelCompleted]}>
                Set {set.setNumber}
              </Text>
              <Text style={styles.setReps}>{set.reps} reps</Text>
              {editingSet === set.setNumber ? (
                <View style={styles.editWeightContainer}>
                  <TextInput
                    style={styles.editWeightInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="decimal-pad"
                    autoFocus
                    selectTextOnFocus
                    onBlur={() => handleWeightSave(set.setNumber)}
                    onSubmitEditing={() => handleWeightSave(set.setNumber)}
                  />
                  <Text style={styles.editWeightUnit}>lbs</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.weightButton}
                  onPress={() => {
                    setEditingSet(set.setNumber);
                    setEditWeight(set.weight.toString());
                  }}
                >
                  <Text style={[styles.setWeight, set.completed && styles.setWeightCompleted]}>
                    {set.weight > 0 ? `${set.weight} lbs` : "BW"}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Plate calculator button (advanced only) */}
              {showAdvanced && set.weight >= 45 && !set.completed && (
                <TouchableOpacity
                  style={styles.plateCalcButton}
                  onPress={() => {
                    setPlateCalcWeight(set.weight);
                    setShowPlateCalc(true);
                  }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Calculator size={14} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
              {/* Previous performance hint */}
              {previousPerformance?.sets[set.setNumber - 1] && !set.completed && (
                <Text style={styles.prevHint}>
                  Last: {previousPerformance.sets[set.setNumber - 1].weight}x{previousPerformance.sets[set.setNumber - 1].reps}
                </Text>
              )}
            </View>
          ))}

          {/* Note section (advanced only) */}
          {showAdvanced && <View style={styles.noteSection}>
            {showNoteInput ? (
              <View style={styles.noteInputContainer}>
                <TextInput
                  style={styles.noteInput}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add a note about this exercise..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  autoFocus
                  onBlur={handleNoteSave}
                />
                <TouchableOpacity style={styles.noteSaveButton} onPress={handleNoteSave}>
                  <Text style={styles.noteSaveText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={() => {
                  setNoteText(exercise.note || "");
                  setShowNoteInput(true);
                }}
              >
                <FileText size={12} color={Colors.textTertiary} />
                <Text style={styles.addNoteText}>
                  {exercise.note ? exercise.note : "Add note"}
                </Text>
              </TouchableOpacity>
            )}
          </View>}
        </View>
      )}

      {/* Plate Calculator Modal */}
      <PlateCalculator
        visible={showPlateCalc}
        weight={plateCalcWeight}
        onClose={() => setShowPlateCalc(false)}
      />
    </Animated.View>
  );
}

export default React.memo(ExerciseCard);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    paddingHorizontal: 14,
  },
  toggleArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.primary,
    opacity: 0.6,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  exerciseNameCompleted: {
    color: Colors.textTertiary,
    textDecorationLine: "line-through" as const,
  },
  overloadBadge: {
    marginBottom: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
    opacity: 0.3,
  },
  muscleTag: {
    backgroundColor: "rgba(59,130,246,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  lastTimeHint: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    color: Colors.indigo,
    opacity: 0.7,
    marginTop: 3,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  restButtons: {
    flexDirection: "row",
    gap: 4,
  },
  restButton: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  restButtonText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
  },
  expandButton: {
    padding: 4,
  },
  // ─── Last note from previous session ───
  lastNoteContainer: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  lastNoteText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: "italic" as const,
    opacity: 0.7,
  },
  // ─── Set details ───
  setsContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  setCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(0,0,0,0.02)",
    justifyContent: "center",
    alignItems: "center",
  },
  setCheckboxCompleted: {
    backgroundColor: Colors.emerald,
    borderColor: Colors.emerald,
  },
  setLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    width: 50,
  },
  setLabelCompleted: {
    color: Colors.textTertiary,
    textDecorationLine: "line-through" as const,
  },
  setReps: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: Colors.textTertiary,
    flex: 1,
  },
  weightButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.1)",
  },
  setWeight: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  setWeightCompleted: {
    color: Colors.textTertiary,
  },
  editWeightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editWeightInput: {
    width: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: Colors.primary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center" as const,
  },
  editWeightUnit: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  plateCalcButton: {
    padding: 4,
    marginLeft: 2,
  },
  prevHint: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    color: Colors.textTertiary,
    opacity: 0.6,
    marginLeft: 4,
  },
  // ─── Notes ───
  noteSection: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  addNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  addNoteText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  noteInputContainer: {
    gap: 8,
  },
  noteInput: {
    fontSize: 13,
    color: Colors.text,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    minHeight: 40,
    maxHeight: 80,
  },
  noteSaveButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  noteSaveText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
