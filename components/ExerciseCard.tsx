import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextInput, PanResponder } from "react-native";
import { Check, ChevronDown, Minus, Plus, SkipForward, RotateCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS } from "@/types";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  exerciseId: string;
  onToggle: (id: string) => void;
  onRestTimer: (seconds?: number) => void;
  onToggleSet?: (id: string, setNumber: number) => void;
  onUpdateSetWeight?: (id: string, setNumber: number, weight: number) => void;
  onSkip?: (id: string) => void;
  previousPerformance?: { sets: { weight: number; reps: number }[] };
  personalRecord?: { weight: number; reps: number; estimated1RM: number };
  weightUnit?: string;
  defaultRestTimer?: number;
  autoStartRestTimer?: boolean;
  accentColor?: string;
}

function ExerciseCard({ exercise, index = 0, exerciseId, onToggle, onRestTimer, onToggleSet, onUpdateSetWeight, onSkip, previousPerformance, personalRecord, weightUnit = "lbs", defaultRestTimer = 60, autoStartRestTimer = true, accentColor }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const checkAnim = useRef(new Animated.Value(exercise.completed ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpen = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");

  const isSkipped = exercise.completed && exercise.completedAt === "skipped";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          swipeX.setValue(Math.max(g.dx, -80));
        } else if (swipeOpen.current) {
          swipeX.setValue(Math.min(g.dx - 64, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Animated.spring(swipeX, { toValue: -64, useNativeDriver: true, friction: 8 }).start();
          swipeOpen.current = true;
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
          swipeOpen.current = false;
        }
      },
    })
  ).current;

  const completedSets = (exercise.setDetails || []).filter((s) => s.completed).length;
  const totalSets = exercise.setDetails?.length || exercise.sets;

  // PR detection: check if any completed set in this exercise beats the existing PR
  const isPRBeaten = (() => {
    if (!personalRecord || !exercise.setDetails) return false;
    return exercise.setDetails.some((s) => {
      if (!s.completed || s.weight <= 0) return false;
      const estimated1RM = s.weight * (1 + s.reps / 30);
      return estimated1RM > personalRecord.estimated1RM;
    });
  })();

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
    onToggle(exerciseId);
  }, [exercise.completed, onToggle, exerciseId, scaleAnim]);

  const handleExpandToggle = useCallback(() => {
    const next = !expandedRef.current;
    expandedRef.current = next;
    setExpanded(next);
    Animated.spring(chevronAnim, {
      toValue: next ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [chevronAnim]);

  const handleSetToggle = useCallback((setNumber: number, wasCompleted: boolean) => {
    if (onToggleSet) {
      onToggleSet(exerciseId, setNumber);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(wasCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      }
      if (!wasCompleted && autoStartRestTimer) {
        onRestTimer(defaultRestTimer);
      }
    }
  }, [onToggleSet, exerciseId, onRestTimer, autoStartRestTimer, defaultRestTimer]);

  const handleWeightSave = useCallback((setNumber: number) => {
    if (onUpdateSetWeight && editWeight.trim()) {
      const w = parseFloat(editWeight);
      if (!isNaN(w) && w >= 0) {
        onUpdateSetWeight(exerciseId, setNumber, w);
      }
    }
    setEditingSet(null);
    setEditWeight("");
  }, [onUpdateSetWeight, exerciseId, editWeight]);

  const handleWeightStep = useCallback((setNumber: number, currentWeight: number, delta: number) => {
    const newWeight = Math.max(0, currentWeight + delta);
    if (onUpdateSetWeight) {
      onUpdateSetWeight(exerciseId, setNumber, newWeight);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [onUpdateSetWeight]);

  const backgroundColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cardBackground, colors.completedCard],
  });

  const borderColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.glassBorder, colors.completedBorder],
  });

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handleSkip = useCallback(() => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    swipeOpen.current = false;
    if (onSkip) {
      onSkip(exerciseId);
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [onSkip, exerciseId, swipeX]);

  const hasSets = exercise.setDetails && exercise.setDetails.length > 0;

  return (
    <View style={styles.swipeWrapper}>
      {/* Skip action behind */}
      <View style={[styles.skipAction, isSkipped && styles.skipActionRestore]}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          {isSkipped ? (
            <RotateCcw size={16} color={colors.white} />
          ) : (
            <SkipForward size={16} color={colors.white} />
          )}
          <Text style={styles.skipText}>{isSkipped ? "Undo" : "Skip"}</Text>
        </TouchableOpacity>
      </View>

    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          transform: [{ scale: scaleAnim }, { translateX: swipeX }],
        },
        isSkipped && styles.skippedContainer,
        accentColor && !exercise.completed ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined,
      ]}
    >
      {/* Main exercise row — PanResponder here only, not on expand/sets */}
      <View style={styles.content} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.toggleArea} onPress={handleToggle} activeOpacity={0.7} testID={`exercise-${exercise.routineExerciseId}`} accessibilityLabel={`${exercise.exerciseName}, ${completedSets} of ${totalSets} sets complete`} accessibilityRole="button">
          <Animated.View
            style={[
              styles.checkbox,
              {
                backgroundColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [accentColor ? `${accentColor}15` : `${colors.primary}15`, colors.emerald],
                }),
                borderColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [accentColor ? `${accentColor}30` : `${colors.primary}33`, colors.emerald],
                }),
              },
            ]}
          >
            {exercise.completed ? (
              <Check size={16} color={colors.white} />
            ) : (
              <Text style={[styles.indexText, accentColor ? { color: accentColor } : undefined]}>{index + 1}</Text>
            )}
          </Animated.View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.exerciseName, exercise.completed && styles.exerciseNameCompleted, isSkipped && styles.exerciseNameSkipped]} numberOfLines={1}>
                {exercise.exerciseName}
              </Text>
              {isSkipped && <Text style={styles.skippedBadge}>SKIPPED</Text>}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detail}>
                {completedSets}/{totalSets} sets
              </Text>
              <View style={styles.dot} />
              <Text style={styles.detail}>
                {(() => {
                  const sets = exercise.setDetails || [];
                  if (sets.length === 0) return exercise.weight > 0 ? `${exercise.weight} ${weightUnit}` : "BW";
                  const weights = [...new Set(sets.map((s) => s.weight))];
                  if (weights.length === 1) return weights[0] > 0 ? `${weights[0]} ${weightUnit}` : "BW";
                  return `${Math.min(...weights)}-${Math.max(...weights)} ${weightUnit}`;
                })()}
              </Text>
              <View style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
              {isPRBeaten && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR!</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {!exercise.completed && (
          <TouchableOpacity
            style={styles.restButton}
            onPress={() => {
              onRestTimer(defaultRestTimer);
              if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.restButtonText}>{defaultRestTimer}s</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Full-width expand/collapse bar */}
      {hasSets && (
        <TouchableOpacity
          style={styles.expandBar}
          onPress={handleExpandToggle}
          activeOpacity={0.6}
        >
          <Text style={styles.expandBarText}>
            {expanded ? "Hide sets" : `${totalSets} sets · Tap to ${exercise.completed ? "view" : "log"}`}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <ChevronDown size={14} color={colors.textTertiary} />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Expanded set details */}
      {expanded && exercise.setDetails && (
        <View style={styles.setsContainer}>
          {exercise.setDetails.map((set) => (
            <TouchableOpacity
              key={set.setNumber}
              style={styles.setRow}
              onPress={() => handleSetToggle(set.setNumber, set.completed)}
              activeOpacity={0.7}
            >
              <View style={[styles.setCheckbox, set.completed && styles.setCheckboxCompleted]}>
                {set.completed && <Check size={14} color={colors.white} />}
              </View>
              <Text style={[styles.setLabel, set.completed && styles.setLabelCompleted]}>
                Set {set.setNumber}
              </Text>
              <Text style={styles.setReps}>{set.reps} reps</Text>
              {editingSet === set.setNumber ? (
                <View style={styles.editWeightContainer}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => {
                      const w = parseFloat(editWeight) || 0;
                      setEditWeight(Math.max(0, w - 5).toString());
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Minus size={14} color={colors.primary} />
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => {
                      const w = parseFloat(editWeight) || 0;
                      setEditWeight((w + 5).toString());
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Plus size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.editWeightUnit}>{weightUnit}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.weightButton}
                  onPress={() => {
                    setEditingSet(set.setNumber);
                    setEditWeight(set.weight.toString());
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={[styles.setWeight, set.completed && styles.setWeightCompleted]}>
                    {set.weight > 0 ? `${set.weight} ${weightUnit}` : "BW"}
                  </Text>
                </TouchableOpacity>
              )}
              {previousPerformance?.sets?.[set.setNumber - 1] != null && !set.completed && (
                <Text style={styles.prevHint}>
                  Last: {previousPerformance.sets[set.setNumber - 1].weight} {weightUnit}×{previousPerformance.sets[set.setNumber - 1].reps}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
    </View>
  );
}

export default React.memo(ExerciseCard);

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  swipeWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  skipAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 64,
    backgroundColor: colors.amber,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  skipActionRestore: {
    backgroundColor: colors.primary,
  },
  skipButton: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  skipText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.white,
  },
  skippedContainer: {
    opacity: 0.5,
  },
  container: {
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
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
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.primary,
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
    color: colors.text,
    marginBottom: 3,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  exerciseNameCompleted: {
    color: colors.textTertiary,
    textDecorationLine: "line-through" as const,
  },
  exerciseNameSkipped: {
    color: colors.textTertiary,
    textDecorationLine: "line-through" as const,
    fontStyle: "italic" as const,
  },
  skippedBadge: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.amberDark,
    backgroundColor: colors.amberTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  detail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    color: colors.textTertiary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
    opacity: 0.3,
  },
  muscleTag: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  prBadge: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  prBadgeText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: colors.amberDark,
    letterSpacing: 0.5,
  },
  restButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.glassBorder,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginLeft: 8,
    alignItems: "center",
  },
  restButtonText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.indigo,
  },
  // ─── Full-width expand/collapse bar ───
  expandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.glassBorder,
    minHeight: 44,
  },
  expandBarText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  // ─── Set details ───
  setsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    minHeight: 48,
  },
  setCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  setCheckboxCompleted: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  setLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
    width: 50,
  },
  setLabelCompleted: {
    color: colors.textTertiary,
    textDecorationLine: "line-through" as const,
  },
  setReps: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: colors.textTertiary,
    flex: 1,
  },
  weightButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    minHeight: 32,
    justifyContent: "center",
  },
  setWeight: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  setWeightCompleted: {
    color: colors.textTertiary,
  },
  editWeightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  editWeightInput: {
    width: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
    textAlign: "center" as const,
  },
  editWeightUnit: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500" as const,
  },
  prevHint: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
    color: colors.textTertiary,
    opacity: 0.6,
    marginLeft: 4,
  },
});
