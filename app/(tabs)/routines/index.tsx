import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  Dumbbell,
  ChevronRight,
  Layers,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  CalendarDays,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import {
  Layout,
  Radius,
  Space,
  Type,
  dominantMuscleColor,
  glow,
  muscleColor,
  numeric,
  onColor,
  surface,
  tint,
} from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, WEEKDAY_SHORT, Routine } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";
import { WORKOUT_SPLITS, ROUTINE_NAME_SUGGESTIONS, type WorkoutSplit } from "@/mocks/exercises";
import { Button, Card, EmptyState, ScreenHeader, Tag } from "@/components/ui";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";

export default function RoutinesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routines, addRoutine, addRoutinesFromTemplates, reorderRoutine, currentSession } = useGym();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);

  const handleCreate = useCallback(() => {
    if (newName.trim().length === 0) return;
    const routine = addRoutine(newName.trim());
    if (!routine) return;
    setNewName("");
    setShowCreate(false);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(tabs)/routines/${routine.id}`);
  }, [newName, addRoutine, router]);

  const handleConfirmSplit = useCallback(() => {
    if (!selectedSplit) return;
    const created = addRoutinesFromTemplates(selectedSplit.routines);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedSplit(null);
    setShowTemplates(false);
    if (created.length > 0) {
      router.push(`/(tabs)/routines/${created[created.length - 1].id}`);
    }
  }, [selectedSplit, addRoutinesFromTemplates, router]);

  const describe = useCallback((routine: Routine) => {
    const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
    if (routine.exercises.length === 0) return "Empty — tap to add exercises";
    const mins = estimateRoutineDuration(routine.exercises.length, setCount);
    return `${routine.exercises.length} exercises · ${setCount} sets · ~${mins} min`;
  }, []);

  const closeTemplates = useCallback(() => {
    if (selectedSplit) setSelectedSplit(null);
    else setShowTemplates(false);
  }, [selectedSplit]);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title="Routines"
          subtitle={routines.length > 0 ? `${routines.length} saved` : undefined}
          action={
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create a new routine"
              style={[styles.addButton, glow(colors.primary, colors)]}
            >
              <Plus size={21} color="#fff" />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + Space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {routines.length === 0 ? (
          <Card padding={0}>
            <EmptyState
              icon={<Dumbbell size={30} color={colors.primary} />}
              title="No routines yet"
              body="Start from a proven split — every exercise, set and rep is pre-filled and fully editable — or build one from scratch."
              action={
                <Button
                  label="Browse workout splits"
                  onPress={() => setShowTemplates(true)}
                  icon={<Layers size={17} color="#fff" />}
                  haptic="medium"
                />
              }
              secondaryAction={
                <Button
                  label="Create from scratch"
                  variant="ghost"
                  size="sm"
                  icon={<Plus size={15} color={colors.primary} />}
                  onPress={() => setShowCreate(true)}
                />
              }
            />
          </Card>
        ) : (
          <>
            {routines.map((routine, idx) => {
              const groups = [...new Set(routine.exercises.map((e) => e.muscleGroup))];
              const accent = routine.color ?? dominantMuscleColor(groups, colors) ?? colors.primary;
              const fg = onColor(accent);
              const scheduled = routine.scheduledDays ?? [];

              return (
                <TouchableOpacity
                  key={routine.id}
                  style={[styles.routineCard, surface(colors, 1, Radius.md)]}
                  onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`${routine.name}. ${describe(routine)}. Edit routine.`}
                >
                  <View style={[styles.mark, { backgroundColor: accent }]}>
                    <Text style={[styles.markText, { color: fg }]}>
                      {routine.name ? routine.name.charAt(0).toUpperCase() : "R"}
                    </Text>
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{routine.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{describe(routine)}</Text>

                    {groups.length > 0 && (
                      <View style={styles.tagRow}>
                        {groups.slice(0, 4).map((mg) => (
                          <Tag
                            key={mg}
                            label={MUSCLE_GROUP_LABELS[mg]}
                            color={muscleColor(mg, colors)}
                            size="sm"
                          />
                        ))}
                        {groups.length > 4 && <Text style={styles.moreTags}>+{groups.length - 4}</Text>}
                      </View>
                    )}

                    {scheduled.length > 0 && (
                      <View style={styles.scheduleRow}>
                        <CalendarDays size={11} color={colors.textTertiary} />
                        <Text style={styles.scheduleText}>
                          {scheduled.map((d) => WEEKDAY_SHORT[d]).join(" · ")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {routines.length > 1 && (
                    <View style={styles.reorder}>
                      <TouchableOpacity
                        onPress={() => {
                          reorderRoutine(routine.id, "up");
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                        }}
                        style={[styles.reorderBtn, idx === 0 && styles.reorderDisabled]}
                        disabled={idx === 0}
                        hitSlop={{ top: 10, bottom: 4, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${routine.name} up`}
                      >
                        <ChevronUp size={16} color={idx === 0 ? colors.separator : colors.textTertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          reorderRoutine(routine.id, "down");
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                        }}
                        style={[styles.reorderBtn, idx === routines.length - 1 && styles.reorderDisabled]}
                        disabled={idx === routines.length - 1}
                        hitSlop={{ top: 4, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${routine.name} down`}
                      >
                        <ChevronDown
                          size={16}
                          color={idx === routines.length - 1 ? colors.separator : colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  <ChevronRight size={17} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setShowTemplates(true)}
              activeOpacity={0.7}
              style={styles.browseCard}
              accessibilityRole="button"
              accessibilityLabel="Browse workout splits"
            >
              <Layers size={17} color={colors.primary} />
              <Text style={styles.browseText}>Browse workout splits</Text>
              <ChevronRight size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ─── Create Routine ─────────────────────────────────── */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.createCard, surface(colors, 3, Radius.lg)]}>
            <Text style={styles.createTitle}>New routine</Text>
            <Text style={styles.createSubtitle}>Give it a name — you can add exercises next.</Text>

            <TextInput
              style={styles.createInput}
              value={newName}
              onChangeText={(t) => setNewName(t.slice(0, 50))}
              placeholder="e.g. Push Day"
              maxLength={50}
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              accessibilityLabel="Routine name"
            />

            <Text style={styles.suggestLabel}>QUICK PICKS</Text>
            <View style={styles.suggestions}>
              {ROUTINE_NAME_SUGGESTIONS.map((name) => {
                const active = newName === name;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.suggestion, active && styles.suggestionActive]}
                    onPress={() => {
                      setNewName(name);
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.suggestionText, active && styles.suggestionTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.createActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                style={styles.flexButton}
                haptic="none"
              />
              <Button
                label="Create"
                onPress={handleCreate}
                disabled={!newName.trim()}
                style={styles.flexButton}
                haptic="medium"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Workout Splits ─────────────────────────────────── */}
      <Modal visible={showTemplates} animationType="slide" onRequestClose={closeTemplates}>
        <View style={[styles.templateScreen, { paddingTop: insets.top }]}>
          <View style={styles.templateHeader}>
            <TouchableOpacity
              onPress={closeTemplates}
              activeOpacity={0.7}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={selectedSplit ? "Back to splits" : "Close"}
            >
              <ArrowLeft size={19} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.templateTitle} numberOfLines={1}>
              {selectedSplit ? selectedSplit.name : "Workout splits"}
            </Text>
            <View style={styles.backButtonSpacer} />
          </View>

          {!selectedSplit ? (
            <ScrollView
              contentContainerStyle={styles.templateList}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.templateIntro}>
                Proven training structures with every exercise, set and rep filled in.
                Pick one to preview it — nothing is added until you confirm.
              </Text>
              {WORKOUT_SPLITS.map((split) => {
                const totalExercises = split.routines.reduce((s, r) => s + r.exercises.length, 0);
                return (
                  <TouchableOpacity
                    key={split.id}
                    style={[styles.splitCard, surface(colors, 1, Radius.md)]}
                    onPress={() => setSelectedSplit(split)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`${split.name}. ${split.shortDescription}`}
                  >
                    <View style={styles.splitTop}>
                      <Text style={styles.splitName} numberOfLines={1}>{split.name}</Text>
                      <Tag label={`${split.daysPerWeek}×/wk`} color={colors.primary} size="sm" />
                    </View>
                    <Text style={styles.splitDesc}>{split.shortDescription}</Text>
                    <View style={styles.splitChips}>
                      {split.routines.map((r, i) => (
                        <View key={`${r.name}-${i}`} style={styles.splitChip}>
                          <Text style={styles.splitChipText} numberOfLines={1}>{r.name}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.splitFooter}>
                      {split.routines.length} routines · {totalExercises} exercises
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.templateList}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.templateIntro}>{selectedSplit.shortDescription}</Text>
                {selectedSplit.routines.map((routine, rIdx) => {
                  const groups = [...new Set(routine.exercises.map((e) => e.muscleGroup as MuscleGroup))];
                  const accent = dominantMuscleColor(groups, colors) ?? colors.primary;
                  return (
                    <View key={`${routine.name}-${rIdx}`} style={[styles.previewCard, surface(colors, 1, Radius.md)]}>
                      <View style={styles.previewHead}>
                        <View style={[styles.previewMark, { backgroundColor: accent }]}>
                          <Text style={[styles.previewMarkText, { color: onColor(accent) }]}>
                            {routine.name ? routine.name.charAt(0).toUpperCase() : "R"}
                          </Text>
                        </View>
                        <Text style={styles.previewName} numberOfLines={1}>{routine.name}</Text>
                        <Text style={styles.previewCount}>{routine.exercises.length}</Text>
                      </View>
                      {routine.exercises.map((ex, eIdx) => (
                        <View key={`${ex.name}-${eIdx}`} style={styles.previewRow}>
                          <Text style={styles.previewNum}>{eIdx + 1}</Text>
                          <Text style={styles.previewExName} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.previewSets}>{ex.sets}×{ex.reps}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={[styles.confirmBar, { paddingBottom: Math.max(insets.bottom, Space.base) }]}>
                <Button
                  label={`Add ${selectedSplit.routines.length} routine${selectedSplit.routines.length > 1 ? "s" : ""}`}
                  onPress={handleConfirmSplit}
                  icon={<Check size={18} color="#fff" />}
                  size="lg"
                  fullWidth
                  haptic="medium"
                />
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addButton: {
    width: Layout.touchTarget,
    height: Layout.touchTarget,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.gutter,
    gap: Space.md,
  },
  // ── Routine card ──
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.base - 2,
  },
  mark: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  markText: {
    ...Type.title2,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...Type.headline,
    color: colors.text,
  },
  meta: {
    ...Type.caption,
    ...numeric,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Space.xs + 2,
    marginTop: Space.xs,
  },
  moreTags: {
    ...Type.caption,
    color: colors.textTertiary,
    fontWeight: "700",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs + 1,
    marginTop: Space.xs,
  },
  scheduleText: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  reorder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderDisabled: {
    opacity: 0.3,
  },
  browseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.base,
    paddingHorizontal: Space.base,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: tint(colors.primary, 0.3),
    borderStyle: "dashed",
    minHeight: Layout.touchTarget + 8,
  },
  browseText: {
    flex: 1,
    ...Type.callout,
    fontWeight: "700",
    color: colors.primary,
  },
  // ── Create modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: Space.xl,
  },
  createCard: {
    padding: Space.xl,
  },
  createTitle: {
    ...Type.title2,
    color: colors.text,
  },
  createSubtitle: {
    ...Type.subhead,
    color: colors.textTertiary,
    marginTop: Space.xs,
    marginBottom: Space.lg,
  },
  createInput: {
    ...Type.body,
    fontWeight: "600",
    color: colors.text,
    backgroundColor: colors.fill,
    borderWidth: 1.5,
    borderColor: colors.separator,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md + 2,
    minHeight: Layout.touchTarget + 4,
  },
  suggestLabel: {
    ...Type.overline,
    color: colors.textTertiary,
    marginTop: Space.lg,
    marginBottom: Space.sm,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    marginBottom: Space.xl,
  },
  suggestion: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.xs + 2,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  suggestionActive: {
    backgroundColor: tint(colors.primary, 0.12),
    borderColor: tint(colors.primary, 0.45),
  },
  suggestionText: {
    ...Type.subhead,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  suggestionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  createActions: {
    flexDirection: "row",
    gap: Space.md,
  },
  flexButton: {
    flex: 1,
  },
  // ── Template picker ──
  templateScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
    paddingHorizontal: Layout.gutter,
    paddingVertical: Space.md,
  },
  backButton: {
    width: Layout.touchTarget,
    height: Layout.touchTarget,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonSpacer: {
    width: Layout.touchTarget,
  },
  templateTitle: {
    ...Type.title3,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  templateList: {
    paddingHorizontal: Layout.gutter,
    paddingBottom: Space.xxxl,
    gap: Space.md,
  },
  templateIntro: {
    ...Type.subhead,
    color: colors.textTertiary,
    lineHeight: 19,
    marginBottom: Space.xs,
  },
  splitCard: {
    padding: Space.base,
    gap: Space.sm,
  },
  splitTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  splitName: {
    ...Type.headline,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  splitDesc: {
    ...Type.subhead,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  splitChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs + 2,
  },
  splitChip: {
    paddingHorizontal: Space.md - 2,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    backgroundColor: colors.fill,
  },
  splitChipText: {
    ...Type.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  splitFooter: {
    ...Type.caption,
    ...numeric,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  // ── Split preview ──
  previewCard: {
    padding: Space.base,
  },
  previewHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingBottom: Space.md,
    marginBottom: Space.xs,
    borderBottomWidth: Layout.hairline,
    borderBottomColor: colors.separator,
  },
  previewMark: {
    width: 34,
    height: 34,
    borderRadius: Radius.xs + 2,
    justifyContent: "center",
    alignItems: "center",
  },
  previewMarkText: {
    ...Type.callout,
    fontWeight: "800",
  },
  previewName: {
    flex: 1,
    ...Type.headline,
    color: colors.text,
  },
  previewCount: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.sm - 1,
  },
  previewNum: {
    ...Type.caption,
    ...numeric,
    width: 16,
    fontWeight: "700",
    color: colors.textTertiary,
    textAlign: "center",
  },
  previewExName: {
    flex: 1,
    ...Type.subhead,
    fontWeight: "600",
    color: colors.text,
  },
  previewSets: {
    ...Type.caption,
    ...numeric,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  confirmBar: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Space.md,
    borderTopWidth: Layout.hairline,
    borderTopColor: colors.separator,
    backgroundColor: colors.surfaceBase,
  },
});
