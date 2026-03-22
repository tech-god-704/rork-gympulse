import React, { useRef, useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextInput } from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { WorkoutSessionExercise, SetData, MUSCLE_GROUP_LABELS } from "@/types";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  onToggle: () => void;
  onRestTimer: (seconds?: number) => void;
  onToggleSet?: (setNumber: number) => void;
  onUpdateSetWeight?: (setNumber: number, weight: number) => void;
  previousPerformance?: { sets: { weight: number; reps: number }[] };
}

function ExerciseCard({ exercise, index = 0, onToggle, onRestTimer, onToggleSet, onUpdateSetWeight, previousPerformance }: Props) {
  const checkAnim = useRef(new Animated.Value(exercise.completed ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");

  const completedSets = (exercise.setDetails || []).filter((s) => s.completed).length;
  const totalSets = exercise.setDetails?.length || exercise.sets;

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
        onRestTimer(60);
      }
    }
  }, [onToggleSet, onRestTimer]);

  const handleWeightSave = useCallback((setNumber: number) => {
    if (onUpdateSetWeight && editWeight.trim()) {
      const w = parseInt(editWeight, 10);
      if (!isNaN(w) && w >= 0) {
        onUpdateSetWeight(setNumber, w);
      }
    }
    setEditingSet(null);
    setEditWeight("");
  }, [onUpdateSetWeight, editWeight]);

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
        <TouchableOpacity style={styles.toggleArea} onPress={handleToggle} activeOpacity={0.7} testID={`exercise-${exercise.routineExerciseId}`}>
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
            <Text style={[styles.exerciseName, exercise.completed && styles.exerciseNameCompleted]}>
              {exercise.exerciseName}
            </Text>
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
          </View>
        </TouchableOpacity>
        <View style={styles.rightActions}>
          {!exercise.completed && (
            <View style={styles.restButtons}>
              {[60, 90].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.restButton}
                  onPress={() => onRestTimer(s)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.restButtonText}>{s}s</Text>
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
                    keyboardType="number-pad"
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
              {/* Previous performance hint */}
              {previousPerformance?.sets[set.setNumber - 1] && !set.completed && (
                <Text style={styles.prevHint}>
                  Last: {previousPerformance.sets[set.setNumber - 1].weight}×{previousPerformance.sets[set.setNumber - 1].reps}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
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
  prevHint: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    color: Colors.textTertiary,
    opacity: 0.6,
    marginLeft: 4,
  },
});
