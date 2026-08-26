import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextInput, PanResponder } from "react-native";
import { Check, ChevronDown, Minus, Plus, SkipForward, RotateCcw, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS, WeightUnit, ExercisePerformance, PersonalRecord } from "@/types";
import { estimateOneRepMax } from "@/utils/workoutStats";
import { formatWeight, toDisplayWeight, fromDisplayWeight, weightStep, trimNumber } from "@/utils/units";
import { Layout, Radius, Space, Type, elevation, numeric, tint } from "@/constants/theme";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  exerciseId: string;
  onToggle: (id: string) => void;
  onRestTimer: (seconds?: number) => void;
  onToggleSet?: (id: string, setNumber: number) => void;
  /** Weight arrives in stored pounds. */
  onUpdateSetWeight?: (id: string, setNumber: number, weight: number) => void;
  onUpdateSetReps?: (id: string, setNumber: number, reps: number) => void;
  onAddSet?: (id: string) => void;
  onRemoveSet?: (id: string, setNumber: number) => void;
  onSkip?: (id: string) => void;
  previousPerformance?: ExercisePerformance;
  personalRecord?: PersonalRecord;
  weightUnit?: WeightUnit;
  defaultRestTimer?: number;
  autoStartRestTimer?: boolean;
  accentColor?: string;
}

type EditTarget = { setNumber: number; field: "weight" | "reps" } | null;

function ExerciseCard({
  exercise,
  index = 0,
  exerciseId,
  onToggle,
  onRestTimer,
  onToggleSet,
  onUpdateSetWeight,
  onUpdateSetReps,
  onAddSet,
  onRemoveSet,
  onSkip,
  previousPerformance,
  personalRecord,
  weightUnit = "lbs",
  defaultRestTimer = 60,
  autoStartRestTimer = true,
  accentColor,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const checkAnim = useRef(new Animated.Value(exercise.completed ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpen = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [draft, setDraft] = useState("");

  const isSkipped = exercise.skipped === true;

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

  const sets = useMemo(() => exercise.setDetails ?? [], [exercise.setDetails]);
  const completedSets = useMemo(() => sets.filter((s) => s.completed).length, [sets]);
  const totalSets = sets.length || exercise.sets;

  const volume = useMemo(
    () => sets.filter((s) => s.completed).reduce((sum, s) => sum + s.weight * s.reps, 0),
    [sets]
  );

  // Does any completed set beat the standing record? Uses the same 1RM
  // estimator the provider records PRs with, so the badge can't disagree
  // with what actually gets saved.
  const isPRBeaten = useMemo(() => {
    if (isSkipped || !personalRecord) return false;
    return sets.some(
      (s) => s.completed && s.weight > 0 && estimateOneRepMax(s.weight, s.reps) > personalRecord.estimated1RM
    );
  }, [sets, personalRecord, isSkipped]);

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
    setEditing(null);
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

  const handleSetToggle = useCallback(
    (setNumber: number, wasCompleted: boolean) => {
      if (!onToggleSet) return;
      onToggleSet(exerciseId, setNumber);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(
          wasCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        );
      }
      if (!wasCompleted && autoStartRestTimer) {
        onRestTimer(defaultRestTimer);
      }
    },
    [onToggleSet, exerciseId, onRestTimer, autoStartRestTimer, defaultRestTimer]
  );

  // ── Inline editing ──────────────────────────────────────
  const beginEdit = useCallback(
    (setNumber: number, field: "weight" | "reps", currentWeightLbs: number, currentReps: number) => {
      setEditing({ setNumber, field });
      setDraft(
        field === "weight"
          ? trimNumber(toDisplayWeight(currentWeightLbs, weightUnit))
          : String(currentReps)
      );
    },
    [weightUnit]
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const value = parseFloat(draft);
    if (Number.isFinite(value) && value >= 0) {
      if (editing.field === "weight") {
        onUpdateSetWeight?.(exerciseId, editing.setNumber, fromDisplayWeight(value, weightUnit));
      } else {
        onUpdateSetReps?.(exerciseId, editing.setNumber, Math.round(value));
      }
    }
    setEditing(null);
    setDraft("");
  }, [editing, draft, onUpdateSetWeight, onUpdateSetReps, exerciseId, weightUnit]);

  const stepDraft = useCallback(
    (delta: number) => {
      const current = parseFloat(draft) || 0;
      const next = Math.max(0, current + delta);
      setDraft(trimNumber(Math.round(next * 100) / 100));
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [draft]
  );

  const handleAddSet = useCallback(() => {
    onAddSet?.(exerciseId);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onAddSet, exerciseId]);

  const handleRemoveSet = useCallback(
    (setNumber: number) => {
      onRemoveSet?.(exerciseId, setNumber);
      setEditing(null);
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [onRemoveSet, exerciseId]
  );

  const handleSkip = useCallback(() => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    swipeOpen.current = false;
    if (onSkip) {
      onSkip(exerciseId);
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [onSkip, exerciseId, swipeX]);

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

  const hasSets = sets.length > 0;
  const step = weightStep(weightUnit);

  // Summarise the loaded weight across sets: one figure when uniform, a range otherwise.
  const weightSummary = useMemo(() => {
    if (sets.length === 0) return formatWeight(exercise.weight, weightUnit);
    const unique = [...new Set(sets.map((s) => s.weight))];
    if (unique.length === 1) return formatWeight(unique[0], weightUnit);
    return `${formatWeight(Math.min(...unique), weightUnit, { withUnit: false, bodyweightLabel: false })}–${formatWeight(Math.max(...unique), weightUnit)}`;
  }, [sets, exercise.weight, weightUnit]);

  const statusLabel = isSkipped
    ? "skipped"
    : `${completedSets} of ${totalSets} sets complete`;

  return (
    <View style={styles.shadowHost}>
      <View style={styles.swipeWrapper}>
      {/* Skip action behind */}
      <View style={[styles.skipAction, isSkipped && styles.skipActionRestore]}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isSkipped ? `Undo skip for ${exercise.exerciseName}` : `Skip ${exercise.exerciseName}`}
        >
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
          <TouchableOpacity
            style={styles.toggleArea}
            onPress={handleToggle}
            activeOpacity={0.7}
            testID={`exercise-${exercise.routineExerciseId}`}
            accessibilityLabel={`${exercise.exerciseName}, ${statusLabel}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: exercise.completed }}
          >
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
                <Text
                  style={[
                    styles.exerciseName,
                    exercise.completed && !isSkipped && styles.exerciseNameCompleted,
                    isSkipped && styles.exerciseNameSkipped,
                  ]}
                  numberOfLines={1}
                >
                  {exercise.exerciseName}
                </Text>
                {isSkipped && <Text style={styles.skippedBadge}>SKIPPED</Text>}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detail}>{completedSets}/{totalSets} sets</Text>
                <View style={styles.dot} />
                <Text style={styles.detail}>{weightSummary}</Text>
                {volume > 0 && (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.detail}>{Math.round(volume).toLocaleString()} vol</Text>
                  </>
                )}
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
              accessibilityRole="button"
              accessibilityLabel={`Start ${defaultRestTimer} second rest timer`}
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
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? "Hide sets" : `Show ${totalSets} sets`}
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
        {expanded && hasSets && (
          <View style={styles.setsContainer}>
            {sets.map((set) => {
              const editingThis = editing?.setNumber === set.setNumber;
              const previous = previousPerformance?.sets?.[set.setNumber - 1];
              return (
                <View key={set.setNumber} style={styles.setBlock}>
                  <View style={styles.setRow}>
                    <TouchableOpacity
                      style={styles.setCheckTouch}
                      onPress={() => handleSetToggle(set.setNumber, set.completed)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.completed }}
                      accessibilityLabel={`Set ${set.setNumber}, ${set.reps} reps at ${formatWeight(set.weight, weightUnit)}`}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <View style={[styles.setCheckbox, set.completed && styles.setCheckboxCompleted]}>
                        {set.completed && <Check size={14} color={colors.white} />}
                      </View>
                    </TouchableOpacity>

                    <Text style={[styles.setLabel, set.completed && styles.setLabelCompleted]}>
                      {set.setNumber}
                    </Text>

                    {editingThis ? (
                      <View style={styles.editRow}>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => stepDraft(editing?.field === "weight" ? -step : -1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel="Decrease"
                        >
                          <Minus size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.editInput}
                          value={draft}
                          onChangeText={setDraft}
                          keyboardType={editing?.field === "weight" ? "decimal-pad" : "number-pad"}
                          autoFocus
                          selectTextOnFocus
                          returnKeyType="done"
                          onBlur={commitEdit}
                          onSubmitEditing={commitEdit}
                          accessibilityLabel={editing?.field === "weight" ? "Weight" : "Reps"}
                        />
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => stepDraft(editing?.field === "weight" ? step : 1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel="Increase"
                        >
                          <Plus size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.editUnit}>
                          {editing?.field === "weight" ? weightUnit : "reps"}
                        </Text>
                        <TouchableOpacity
                          style={styles.doneButton}
                          onPress={commitEdit}
                          accessibilityRole="button"
                          accessibilityLabel="Done editing"
                        >
                          <Check size={14} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.valuePill}
                          onPress={() => beginEdit(set.setNumber, "weight", set.weight, set.reps)}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit weight for set ${set.setNumber}, currently ${formatWeight(set.weight, weightUnit)}`}
                        >
                          <Text style={[styles.valuePillText, set.completed && styles.valueMuted]}>
                            {formatWeight(set.weight, weightUnit)}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.times}>×</Text>

                        <TouchableOpacity
                          style={styles.valuePill}
                          onPress={() => beginEdit(set.setNumber, "reps", set.weight, set.reps)}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit reps for set ${set.setNumber}, currently ${set.reps}`}
                        >
                          <Text style={[styles.valuePillText, set.completed && styles.valueMuted]}>
                            {set.reps}
                          </Text>
                        </TouchableOpacity>

                        {sets.length > 1 && onRemoveSet && (
                          <TouchableOpacity
                            style={styles.removeSetButton}
                            onPress={() => handleRemoveSet(set.setNumber)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove set ${set.setNumber}`}
                          >
                            <Trash2 size={13} color={colors.textTertiary} />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>

                  {previous && !set.completed && (
                    <Text style={styles.prevHint}>
                      Last time: {formatWeight(previous.weight, weightUnit)} × {previous.reps}
                    </Text>
                  )}
                </View>
              );
            })}

            {onAddSet && (
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={handleAddSet}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Add a set to ${exercise.exerciseName}`}
              >
                <Plus size={14} color={colors.primary} />
                <Text style={styles.addSetText}>Add set</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
      </View>
    </View>
  );
}

export default React.memo(ExerciseCard);

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  /**
    * Carries the elevation. It must not clip: on iOS `overflow: hidden` sets
    * masksToBounds, which clips the layer's own shadow as well as its children,
    * so a card that both rounds and clips loses its shadow entirely.
    */
  shadowHost: {
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceBase,
    ...elevation(1, colors),
  },
  swipeWrapper: {
    borderRadius: Radius.md,
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
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  skipActionRestore: {
    backgroundColor: colors.primary,
  },
  skipButton: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingVertical: Space.md,
    paddingHorizontal: Space.sm,
  },
  skipText: {
    ...Type.caption,
    fontWeight: "800",
    color: "#fff",
  },
  skippedContainer: {
    opacity: 0.55,
  },
  container: {
    borderRadius: Radius.md,
    borderWidth: Layout.hairline,
    // Clipping stays here so the expand bar respects the rounded bottom
    // corners; the shadow lives on `shadowHost` above.
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Space.md + 2,
  },
  toggleArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Space.md,
    minHeight: Layout.touchTarget,
  },
  checkbox: {
    width: 38,
    height: 38,
    borderRadius: Radius.xs + 2,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    ...Type.callout,
    ...numeric,
    fontWeight: "800",
    color: colors.primary,
    opacity: 0.65,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
  },
  exerciseName: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
    flexShrink: 1,
  },
  exerciseNameCompleted: {
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  exerciseNameSkipped: {
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  skippedBadge: {
    ...Type.caption,
    fontWeight: "800",
    color: colors.amberDark,
    backgroundColor: tint(colors.amber, 0.2),
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
    borderRadius: Radius.xs - 2,
    overflow: "hidden",
    marginBottom: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
    flexWrap: "wrap",
  },
  detail: {
    ...Type.caption,
    ...numeric,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    opacity: 0.4,
  },
  muscleTag: {
    backgroundColor: tint(colors.primary, 0.12),
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  muscleTagText: {
    ...Type.caption,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  prBadge: {
    backgroundColor: tint(colors.amber, 0.2),
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: tint(colors.amber, 0.4),
  },
  prBadgeText: {
    ...Type.caption,
    fontWeight: "900",
    color: colors.amberDark,
    letterSpacing: 0.5,
  },
  restButton: {
    paddingHorizontal: Space.sm + 2,
    paddingVertical: Space.sm,
    borderRadius: Radius.xs + 2,
    backgroundColor: colors.fill,
    marginLeft: Space.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    minWidth: 40,
  },
  restButtonText: {
    ...Type.caption,
    ...numeric,
    fontWeight: "800",
    color: colors.primary,
  },
  // ─── Expand bar ───
  expandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.xs + 2,
    paddingVertical: Space.md,
    borderTopWidth: Layout.hairline,
    borderTopColor: colors.separator,
    backgroundColor: colors.fill,
    minHeight: Layout.touchTarget,
  },
  expandBarText: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  // ─── Set details ───
  setsContainer: {
    borderTopWidth: Layout.hairline,
    borderTopColor: colors.separator,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 2,
  },
  setBlock: {
    paddingVertical: 2,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Space.sm,
    gap: Space.sm + 2,
    minHeight: 48,
  },
  setCheckTouch: {
    justifyContent: "center",
    alignItems: "center",
  },
  setCheckbox: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs + 2,
    borderWidth: 1.5,
    borderColor: colors.separator,
    backgroundColor: colors.fill,
    justifyContent: "center",
    alignItems: "center",
  },
  setCheckboxCompleted: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  setLabel: {
    ...Type.footnote,
    ...numeric,
    fontWeight: "800",
    color: colors.textTertiary,
    width: 16,
    textAlign: "center",
  },
  setLabelCompleted: {
    opacity: 0.6,
  },
  valuePill: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.xs + 2,
    backgroundColor: tint(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: tint(colors.primary, 0.18),
    minHeight: 36,
    minWidth: 62,
    justifyContent: "center",
    alignItems: "center",
  },
  valuePillText: {
    ...Type.subhead,
    ...numeric,
    fontWeight: "700",
    color: colors.primary,
  },
  valueMuted: {
    color: colors.textTertiary,
  },
  times: {
    ...Type.footnote,
    color: colors.textTertiary,
    fontWeight: "600",
  },
  removeSetButton: {
    marginLeft: "auto",
    padding: Space.xs + 2,
    borderRadius: Radius.xs,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 2,
    flex: 1,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.xs + 2,
    backgroundColor: tint(colors.primary, 0.12),
    borderWidth: 1,
    borderColor: tint(colors.primary, 0.2),
    justifyContent: "center",
    alignItems: "center",
  },
  editInput: {
    width: 62,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 7,
    borderRadius: Radius.xs + 2,
    backgroundColor: colors.surfaceBase,
    borderWidth: 2,
    borderColor: colors.primary,
    ...Type.callout,
    ...numeric,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  editUnit: {
    ...Type.caption,
    color: colors.textTertiary,
    fontWeight: "700",
  },
  doneButton: {
    marginLeft: "auto",
    width: 34,
    height: 34,
    borderRadius: Radius.xs + 2,
    backgroundColor: colors.emerald,
    justifyContent: "center",
    alignItems: "center",
  },
  prevHint: {
    ...Type.caption,
    ...numeric,
    fontSize: 11,
    fontWeight: "500",
    color: colors.textTertiary,
    opacity: 0.85,
    marginLeft: 58,
    marginBottom: Space.xs,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.xs + 2,
    marginTop: Space.xs,
    marginBottom: Space.xs + 2,
    paddingVertical: Space.md - 1,
    borderRadius: Radius.xs + 2,
    borderWidth: 1,
    borderColor: tint(colors.primary, 0.3),
    borderStyle: "dashed",
    minHeight: Layout.touchTarget,
  },
  addSetText: {
    ...Type.footnote,
    fontWeight: "800",
    color: colors.primary,
  },
});
