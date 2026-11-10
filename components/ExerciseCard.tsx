import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { Animated, View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { Check, Plus, Minus, SkipForward, RotateCcw, Play, ChevronDown, Trophy } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS, WeightUnit, ExercisePerformance, PersonalRecord, SetData } from "@/types";
import { estimateOneRepMax } from "@/utils/workoutStats";
import { formatWeight } from "@/utils/units";
import { formatRelativeDate } from "@/utils/helpers";
import { card, muscleColor } from "@/constants/theme";
import { haptic } from "@/utils/haptics";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import ExerciseDemoThumb from "@/components/ExerciseDemoThumb";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type SetField = "weight" | "reps";

interface Props {
  exercise: WorkoutSessionExercise;
  exerciseId: string;
  /** The exercise the user should be working on now; it opens automatically. */
  active?: boolean;
  onToggle: (id: string) => void;
  onRestTimer: (seconds?: number) => void;
  onToggleSet?: (id: string, setNumber: number) => void;
  /** Open the keypad for one value of one set. */
  onEditSet?: (id: string, setNumber: number, field: SetField) => void;
  onAddSet?: (id: string) => void;
  onRemoveSet?: (id: string, setNumber: number) => void;
  onSkip?: (id: string) => void;
  previousPerformance?: ExercisePerformance;
  personalRecord?: PersonalRecord;
  weightUnit?: WeightUnit;
  defaultRestTimer?: number;
  autoStartRestTimer?: boolean;
}

/** The check button for one set; it pops when the set is completed. */
function SetCheck({ done, next, onPress, label, colors }: { done: boolean; next: boolean; onPress: () => void; label: string; colors: ColorScheme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 220 }).start();
    }
    wasDone.current = done;
  }, [done, scale]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      aria-checked={done}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          checkStyles.box,
          { backgroundColor: colors.fillStrong, transform: [{ scale }] },
          next && { backgroundColor: colors.primaryTint, borderWidth: 2, borderColor: colors.primary },
          done && { backgroundColor: colors.success, borderWidth: 0 },
        ]}
      >
        <Check size={20} color={done ? "#fff" : next ? colors.primaryText : colors.textTertiary} strokeWidth={3} />
      </Animated.View>
    </Pressable>
  );
}

const checkStyles = StyleSheet.create({
  box: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});

function ExerciseCard({
  exercise,
  exerciseId,
  active = false,
  onToggle,
  onRestTimer,
  onToggleSet,
  onEditSet,
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

  // Follow the workout: open the card when it becomes the one to do next,
  // and fold it away once it's finished so the next one moves up.
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(active);
  }, [active]);

  const isSkipped = exercise.skipped === true;
  const sets = useMemo<SetData[]>(() => exercise.setDetails ?? [], [exercise.setDetails]);
  const completedSets = useMemo(() => sets.filter((s) => s.completed).length, [sets]);
  const totalSets = sets.length || exercise.sets;
  const hasSets = sets.length > 0;
  const accent = muscleColor(exercise.muscleGroup, colors);
  const nextSetNumber = sets.find((s) => !s.completed)?.setNumber;

  // Same 1RM estimator the provider records PRs with, so the badge can't
  // disagree with what actually gets saved.
  const beatsPR = useCallback(
    (s: SetData) => !!personalRecord && s.weight > 0 && estimateOneRepMax(s.weight, s.reps) > personalRecord.estimated1RM,
    [personalRecord],
  );
  const isPRBeaten = !isSkipped && sets.some((s) => s.completed && beatsPR(s));

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
    haptic.light();
  }, []);

  const handleSetToggle = useCallback(
    (setNumber: number, wasCompleted: boolean) => {
      if (!onToggleSet) return;
      onToggleSet(exerciseId, setNumber);
      if (wasCompleted) haptic.light();
      else haptic.medium();
      if (!wasCompleted && autoStartRestTimer) onRestTimer(defaultRestTimer);
    },
    [onToggleSet, exerciseId, onRestTimer, autoStartRestTimer, defaultRestTimer],
  );

  const handleWholeToggle = useCallback(() => {
    if (!exercise.completed) haptic.success();
    else haptic.light();
    onToggle(exerciseId);
  }, [exercise.completed, onToggle, exerciseId]);

  const handleRemoveLastSet = useCallback(() => {
    if (sets.length <= 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onRemoveSet?.(exerciseId, sets[sets.length - 1].setNumber);
    haptic.light();
  }, [onRemoveSet, exerciseId, sets]);

  const first = sets[0];
  const summary = isSkipped
    ? "Skipped"
    : `${MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · ${totalSets} × ${first?.reps ?? exercise.reps}${
        expanded ? "" : ` · ${formatWeight(first?.weight ?? exercise.weight, weightUnit)}`
      }`;
  const countLabel = isSkipped ? "Skipped" : exercise.completed ? "Done" : `${completedSets}/${totalSets}`;
  const done = exercise.completed && !isSkipped;
  const prevBest = previousPerformance?.sets?.[0];

  return (
    <View
      style={[
        styles.card,
        active && !exercise.completed && styles.cardActive,
        done && styles.cardDone,
        isSkipped && styles.cardSkipped,
      ]}
    >
      <Pressable
        style={styles.header}
        onPress={hasSets ? toggleExpanded : handleWholeToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${exercise.exerciseName}, ${countLabel}`}
        testID={`exercise-${exercise.routineExerciseId}`}
      >
        <ExerciseDemoThumb exerciseName={exercise.exerciseName} muscleGroup={exercise.muscleGroup} width={46} height={62} radius={13} />
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
            <Trophy size={11} color={colors.gold} strokeWidth={2.6} />
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        )}
        {done ? (
          <View style={styles.doneChip}>
            <Check size={15} color="#fff" strokeWidth={3.2} />
          </View>
        ) : (
          <View style={[styles.countPill, active && { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.count, active && { color: colors.primaryText }, isSkipped && { color: colors.flame }]}>{countLabel}</Text>
          </View>
        )}
        {hasSets && (
          <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2.4} style={expanded ? styles.chevronOpen : undefined} />
        )}
      </Pressable>

      {expanded && hasSets && (
        <View style={styles.body}>
          <View style={styles.contextRow}>
            <Text style={styles.context} numberOfLines={1}>
              {prevBest && previousPerformance
                ? `Last time · ${formatWeight(prevBest.weight, weightUnit)} × ${prevBest.reps} · ${formatRelativeDate(previousPerformance.date)}`
                : "First time logging this one"}
            </Text>
            {demo && (
              <PressableScale
                style={styles.watch}
                onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } })}
                accessibilityRole="button"
                accessibilityLabel={`Watch form for ${exercise.exerciseName}`}
              >
                <Play size={11} color={colors.primaryText} fill={colors.primaryText} />
                <Text style={styles.watchText}>Form</Text>
              </PressableScale>
            )}
          </View>

          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colSet]}>SET</Text>
            <Text style={[styles.th, styles.colPrev]}>PREVIOUS</Text>
            <Text style={[styles.th, styles.colVal]}>{weightUnit === "kg" ? "KG" : "LB"}</Text>
            <Text style={[styles.th, styles.colVal]}>REPS</Text>
            <View style={styles.colCheck} />
          </View>

          {sets.map((set) => {
            const previous = previousPerformance?.sets?.[set.setNumber - 1];
            const isNext = !isSkipped && set.setNumber === nextSetNumber;
            const pr = set.completed && beatsPR(set);
            const cell = [styles.cell, isNext && styles.cellNext, set.completed && styles.cellDone];
            const cellText = [styles.cellText, isNext && { color: colors.primaryText }];
            return (
              <View key={set.setNumber} style={[styles.row, set.completed && styles.rowDone]}>
                <View style={styles.colSet}>
                  <View style={[styles.setBadge, isNext && { backgroundColor: colors.primaryFill }, set.completed && { backgroundColor: colors.successTint }]}>
                    {pr ? (
                      <Trophy size={13} color={colors.gold} strokeWidth={2.6} />
                    ) : (
                      <Text style={[styles.setNum, isNext && { color: "#fff" }, set.completed && { color: colors.success }]}>{set.setNumber}</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.prev, styles.colPrev]} numberOfLines={1}>
                  {previous ? `${formatWeight(previous.weight, weightUnit, { withUnit: false })} × ${previous.reps}` : "—"}
                </Text>
                <View style={styles.colVal}>
                  <PressableScale
                    style={cell}
                    scaleTo={0.94}
                    haptic="select"
                    onPress={() => onEditSet?.(exerciseId, set.setNumber, "weight")}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit weight for set ${set.setNumber}, currently ${formatWeight(set.weight, weightUnit)}`}
                  >
                    <Text style={cellText}>{formatWeight(set.weight, weightUnit, { withUnit: false })}</Text>
                  </PressableScale>
                </View>
                <View style={styles.colVal}>
                  <PressableScale
                    style={cell}
                    scaleTo={0.94}
                    haptic="select"
                    onPress={() => onEditSet?.(exerciseId, set.setNumber, "reps")}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit reps for set ${set.setNumber}, currently ${set.reps}`}
                  >
                    <Text style={cellText}>{set.reps}</Text>
                  </PressableScale>
                </View>
                <View style={styles.colCheck}>
                  <SetCheck
                    done={set.completed}
                    next={isNext}
                    colors={colors}
                    onPress={() => handleSetToggle(set.setNumber, set.completed)}
                    label={`Set ${set.setNumber}, ${set.reps} reps at ${formatWeight(set.weight, weightUnit)}`}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.footer}>
            {onAddSet && (
              <PressableScale
                style={styles.footBtn}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  onAddSet(exerciseId);
                }}
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel="Add set"
              >
                <Plus size={15} color={colors.text} strokeWidth={2.6} />
                <Text style={styles.footText}>Add set</Text>
              </PressableScale>
            )}
            {onRemoveSet && sets.length > 1 && (
              <PressableScale style={styles.footBtn} onPress={handleRemoveLastSet} accessibilityRole="button" accessibilityLabel="Remove last set">
                <Minus size={15} color={colors.text} strokeWidth={2.6} />
                <Text style={styles.footText}>Remove</Text>
              </PressableScale>
            )}
            {onSkip && (
              <PressableScale
                style={[styles.footBtn, styles.footGhost]}
                onPress={() => onSkip(exerciseId)}
                haptic="medium"
                accessibilityRole="button"
                accessibilityLabel={isSkipped ? "Undo skip" : "Skip exercise"}
              >
                {isSkipped ? <RotateCcw size={14} color={colors.textSecondary} /> : <SkipForward size={14} color={colors.textSecondary} />}
                <Text style={[styles.footText, { color: colors.textSecondary }]}>{isSkipped ? "Undo skip" : "Skip"}</Text>
              </PressableScale>
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
    card: { ...card(colors, 26), borderWidth: 1.5, borderColor: "transparent", overflow: "hidden" },
    cardActive: { borderColor: colors.primary },
    cardDone: { borderColor: colors.completedBorder },
    cardSkipped: { opacity: 0.6 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    headerInfo: { flex: 1, minWidth: 0, gap: 4 },
    name: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    nameSkipped: { textDecorationLine: "line-through", color: colors.textTertiary },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    summary: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    prBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, height: 24, borderRadius: 8, backgroundColor: colors.goldTint },
    prBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: colors.gold },
    doneChip: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
    countPill: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    count: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    chevronOpen: { transform: [{ rotate: "180deg" }] },
    body: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
    contextRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 34, paddingLeft: 2 },
    context: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    watch: { flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingLeft: 10, paddingRight: 12, borderRadius: 16, backgroundColor: colors.primaryTint },
    watchText: { fontSize: 13, fontWeight: "800", color: colors.primaryText },
    tableHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 2 },
    th: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9, color: colors.textTertiary },
    colSet: { width: 34, alignItems: "center", textAlign: "center" },
    colPrev: { flex: 1, minWidth: 0 },
    colVal: { width: 72, textAlign: "center" },
    colCheck: { width: 46, alignItems: "center" },
    row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 58, paddingHorizontal: 6, borderRadius: 18 },
    rowDone: { backgroundColor: colors.completedCard },
    setBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    setNum: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
    prev: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    cell: { height: 46, borderRadius: 14, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
    cellNext: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    cellDone: { backgroundColor: "transparent" },
    cellText: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: colors.text, fontVariant: ["tabular-nums"] },
    footer: { flexDirection: "row", gap: 8, paddingTop: 8 },
    footBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.fill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    footGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.fillStrong },
    footText: { fontSize: 14, fontWeight: "700", color: colors.text },
  });
