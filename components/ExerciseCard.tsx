import React, { useEffect, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from "react-native";
import { Check, Minus, Plus, SkipForward, RotateCcw, Play } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS, WeightUnit, ExercisePerformance, PersonalRecord } from "@/types";
import { estimateOneRepMax } from "@/utils/workoutStats";
import { formatWeight, toDisplayWeight, fromDisplayWeight, weightStep, trimNumber } from "@/utils/units";
import { elevation, muscleColor, numeric, tint } from "@/constants/theme";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import ExerciseDemoThumb from "@/components/ExerciseDemoThumb";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  exerciseId: string;
  /** The exercise the user should be working on now; it opens automatically. */
  active?: boolean;
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
  exerciseId,
  active = false,
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
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { findByName } = useExerciseLibrary();
  const demo = useMemo(() => findByName(exercise.exerciseName), [findByName, exercise.exerciseName]);

  const [expanded, setExpanded] = useState(active);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [draft, setDraft] = useState("");

  // Follow the workout: open the card when it becomes the one to do next.
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  const isSkipped = exercise.skipped === true;
  const sets = useMemo(() => exercise.setDetails ?? [], [exercise.setDetails]);
  const completedSets = useMemo(() => sets.filter((s) => s.completed).length, [sets]);
  const totalSets = sets.length || exercise.sets;
  const hasSets = sets.length > 0;
  const step = weightStep(weightUnit);
  const accent = muscleColor(exercise.muscleGroup, colors);

  // Same 1RM estimator the provider records PRs with, so the badge can't
  // disagree with what actually gets saved.
  const isPRBeaten = useMemo(() => {
    if (isSkipped || !personalRecord) return false;
    return sets.some(
      (s) => s.completed && s.weight > 0 && estimateOneRepMax(s.weight, s.reps) > personalRecord.estimated1RM
    );
  }, [sets, personalRecord, isSkipped]);

  const haptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(style);
  };

  const toggleExpanded = useCallback(() => {
    setExpanded((e) => !e);
    setEditing(null);
    haptic(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSetToggle = useCallback(
    (setNumber: number, wasCompleted: boolean) => {
      if (!onToggleSet) return;
      onToggleSet(exerciseId, setNumber);
      haptic(wasCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      if (!wasCompleted && autoStartRestTimer) onRestTimer(defaultRestTimer);
    },
    [onToggleSet, exerciseId, onRestTimer, autoStartRestTimer, defaultRestTimer]
  );

  const handleWholeToggle = useCallback(() => {
    if (Platform.OS !== "web") {
      if (!exercise.completed) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(exerciseId);
  }, [exercise.completed, onToggle, exerciseId]);

  // ── Inline editing ──
  const beginEdit = useCallback(
    (setNumber: number, field: "weight" | "reps", currentWeightLbs: number, currentReps: number) => {
      setEditing({ setNumber, field });
      setDraft(field === "weight" ? trimNumber(toDisplayWeight(currentWeightLbs, weightUnit)) : String(currentReps));
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
      const next = Math.max(0, (parseFloat(draft) || 0) + delta);
      setDraft(trimNumber(Math.round(next * 100) / 100));
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [draft]
  );

  const handleAddSet = useCallback(() => {
    onAddSet?.(exerciseId);
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [onAddSet, exerciseId]);

  const handleRemoveLastSet = useCallback(() => {
    if (sets.length <= 1) return;
    onRemoveSet?.(exerciseId, sets[sets.length - 1].setNumber);
    setEditing(null);
    haptic(Haptics.ImpactFeedbackStyle.Light);
  }, [onRemoveSet, exerciseId, sets]);

  const handleSkip = useCallback(() => {
    onSkip?.(exerciseId);
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [onSkip, exerciseId]);

  const repsTarget = sets[0]?.reps ?? exercise.reps;
  const summary = isSkipped
    ? "Skipped"
    : `${MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · ${totalSets} × ${repsTarget}`;
  const countLabel = isSkipped ? "Skipped" : exercise.completed ? "Done" : `${completedSets}/${totalSets}`;

  return (
    <View
      style={[
        styles.card,
        active && !exercise.completed && { borderColor: colors.primary, borderWidth: 1.5 },
        exercise.completed && !isSkipped && { borderColor: colors.completedBorder },
        isSkipped && styles.cardSkipped,
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={hasSets ? toggleExpanded : handleWholeToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${exercise.exerciseName}, ${countLabel}`}
        testID={`exercise-${exercise.routineExerciseId}`}
      >
        {demo ? (
          <ExerciseDemoThumb slug={demo.slug} width={36} height={64} />
        ) : (
          <View style={[styles.thumbFallback, { backgroundColor: tint(accent, 0.14) }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.name, isSkipped && styles.nameSkipped]} numberOfLines={1}>
            {exercise.exerciseName}
          </Text>
          <View style={styles.summaryRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
          </View>
        </View>
        {isPRBeaten && (
          <View style={styles.prBadge}>
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        )}
        {exercise.completed && !isSkipped ? (
          <View style={styles.doneChip}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        ) : (
          <Text style={[styles.count, isSkipped && { color: colors.amber }]}>{countLabel}</Text>
        )}
      </TouchableOpacity>

      {/* Expanded body */}
      {expanded && hasSets && (
        <View style={styles.body}>
          {demo && (
            <TouchableOpacity
              style={styles.watch}
              onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } })}
              accessibilityRole="button"
              accessibilityLabel={`Watch form for ${exercise.exerciseName}`}
            >
              <Play size={13} color={colors.primaryText} fill={colors.primaryText} />
              <Text style={styles.watchText}>Watch form</Text>
            </TouchableOpacity>
          )}

          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colSet]}>SET</Text>
            <Text style={[styles.th, styles.colPrev]}>PREVIOUS</Text>
            <Text style={[styles.th, styles.colVal]}>{weightUnit === "kg" ? "KG" : "LB"}</Text>
            <Text style={[styles.th, styles.colVal]}>REPS</Text>
            <View style={styles.colCheck} />
          </View>

          {sets.map((set) => {
            const editingThis = editing?.setNumber === set.setNumber;
            const previous = previousPerformance?.sets?.[set.setNumber - 1];
            return (
              <View key={set.setNumber}>
                <View style={[styles.row, set.completed && { backgroundColor: colors.completedCard }]}>
                  <Text style={[styles.setNum, styles.colSet]}>{set.setNumber}</Text>
                  <Text style={[styles.prev, styles.colPrev]} numberOfLines={1}>
                    {previous ? `${formatWeight(previous.weight, weightUnit, { withUnit: false })} × ${previous.reps}` : "—"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.cell, styles.colVal, editingThis && editing?.field === "weight" && styles.cellActive]}
                    onPress={() => beginEdit(set.setNumber, "weight", set.weight, set.reps)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit weight for set ${set.setNumber}, currently ${formatWeight(set.weight, weightUnit)}`}
                  >
                    <Text style={styles.cellText}>{formatWeight(set.weight, weightUnit, { withUnit: false })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cell, styles.colVal, editingThis && editing?.field === "reps" && styles.cellActive]}
                    onPress={() => beginEdit(set.setNumber, "reps", set.weight, set.reps)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit reps for set ${set.setNumber}, currently ${set.reps}`}
                  >
                    <Text style={styles.cellText}>{set.reps}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.colCheck}
                    onPress={() => handleSetToggle(set.setNumber, set.completed)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: set.completed }}
                    accessibilityLabel={`Set ${set.setNumber}, ${set.reps} reps at ${formatWeight(set.weight, weightUnit)}`}
                  >
                    <View style={[styles.check, set.completed && { backgroundColor: colors.success }]}>
                      <Check size={16} color={set.completed ? "#fff" : colors.textTertiary} strokeWidth={3} />
                    </View>
                  </TouchableOpacity>
                </View>

                {editingThis && (
                  <View style={styles.editRow}>
                    <TouchableOpacity
                      style={styles.stepper}
                      onPress={() => stepDraft(editing?.field === "weight" ? -step : -1)}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease"
                    >
                      <Minus size={16} color={colors.primaryText} />
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
                      style={styles.stepper}
                      onPress={() => stepDraft(editing?.field === "weight" ? step : 1)}
                      accessibilityRole="button"
                      accessibilityLabel="Increase"
                    >
                      <Plus size={16} color={colors.primaryText} />
                    </TouchableOpacity>
                    <Text style={styles.editUnit}>{editing?.field === "weight" ? weightUnit : "reps"}</Text>
                    <TouchableOpacity style={styles.editDone} onPress={commitEdit} accessibilityRole="button" accessibilityLabel="Done editing">
                      <Text style={styles.editDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.footer}>
            {onAddSet && (
              <TouchableOpacity style={styles.footBtn} onPress={handleAddSet} accessibilityRole="button" accessibilityLabel="Add set">
                <Plus size={14} color={colors.text} />
                <Text style={styles.footText}>Add set</Text>
              </TouchableOpacity>
            )}
            {onRemoveSet && sets.length > 1 && (
              <TouchableOpacity style={styles.footBtn} onPress={handleRemoveLastSet} accessibilityRole="button" accessibilityLabel="Remove last set">
                <Minus size={14} color={colors.text} />
                <Text style={styles.footText}>Remove set</Text>
              </TouchableOpacity>
            )}
            {onSkip && (
              <TouchableOpacity
                style={styles.footBtn}
                onPress={handleSkip}
                accessibilityRole="button"
                accessibilityLabel={isSkipped ? "Undo skip" : "Skip exercise"}
              >
                {isSkipped ? <RotateCcw size={14} color={colors.text} /> : <SkipForward size={14} color={colors.text} />}
                <Text style={styles.footText}>{isSkipped ? "Undo skip" : "Skip"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default React.memo(ExerciseCard);

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      ...elevation(1, colors),
    },
    cardSkipped: { opacity: 0.6 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 72 },
    thumbFallback: { width: 36, height: 64, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    headerInfo: { flex: 1 },
    name: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    nameSkipped: { textDecorationLine: "line-through", color: colors.textTertiary },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    summary: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, ...numeric },
    count: { fontSize: 14, fontWeight: "800", color: colors.textTertiary, ...numeric },
    doneChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
    prBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.goldTint },
    prBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: colors.gold },
    body: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
    watch: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.primaryTint,
      marginLeft: 2,
      marginBottom: 6,
    },
    watchText: { fontSize: 14, fontWeight: "800", color: colors.primaryText },
    tableHead: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, paddingBottom: 2 },
    th: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.textTertiary },
    row: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4, borderRadius: 12 },
    colSet: { width: 30, textAlign: "center" },
    colPrev: { flex: 1 },
    colVal: { width: 64, textAlign: "center" },
    colCheck: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    setNum: { fontSize: 16, fontWeight: "800", color: colors.textSecondary, ...numeric },
    prev: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, ...numeric },
    cell: { height: 44, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    cellActive: { borderWidth: 2, borderColor: colors.primary },
    cellText: { fontSize: 17, fontWeight: "800", color: colors.text, ...numeric },
    check: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.fillStrong, alignItems: "center", justifyContent: "center" },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
      marginBottom: 4,
      padding: 8,
      borderRadius: 14,
      backgroundColor: colors.card2,
    },
    stepper: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    editInput: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      ...numeric,
    },
    editUnit: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    editDone: { height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    editDoneText: { fontSize: 14, fontWeight: "800", color: "#fff" },
    footer: { flexDirection: "row", gap: 8, marginTop: 8 },
    footBtn: {
      flex: 1,
      flexDirection: "row",
      gap: 5,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.fill,
      alignItems: "center",
      justifyContent: "center",
    },
    footText: { fontSize: 13, fontWeight: "800", color: colors.text },
  });
