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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Dumbbell, ChevronRight, Layers, ArrowLeft, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, WEEKDAY_SHORT } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";
import { WORKOUT_SPLITS, ROUTINE_NAME_SUGGESTIONS, type WorkoutSplit } from "@/mocks/exercises";

export default function RoutinesScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ROUTINE_COLORS: string[] = [
    colors.primary,
    colors.indigo,
    "#06B6D4",
    "#F59E0B",
    "#8B5CF6",
    "#10B981",
  ];

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routines, addRoutine, addRoutinesFromTemplates } = useGym();
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
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/(tabs)/routines/${routine.id}`);
  }, [newName, addRoutine, router]);

  const handlePickSplit = useCallback((split: WorkoutSplit) => {
    setSelectedSplit(split);
  }, []);

  const handleConfirmSplit = useCallback(() => {
    if (!selectedSplit) return;
    const created = addRoutinesFromTemplates(selectedSplit.routines);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSelectedSplit(null);
    setShowTemplates(false);
    if (created.length > 0) {
      router.push(`/(tabs)/routines/${created[created.length - 1].id}`);
    }
  }, [selectedSplit, addRoutinesFromTemplates, router]);

  const getMuscleGroups = useCallback((routine: typeof routines[number]) => {
    const groups = new Set<MuscleGroup>();
    routine.exercises.forEach((e) => groups.add(e.muscleGroup));
    return Array.from(groups);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Routines</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <View style={styles.addButton}>
            <Plus size={20} color={colors.white} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Dumbbell size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a custom routine or start with a proven workout split
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              activeOpacity={0.8}
            >
              <View style={styles.emptyButton}>
                <Plus size={18} color={colors.white} />
                <Text style={styles.emptyButtonText}>Create Routine</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTemplates(true)}
              activeOpacity={0.8}
              style={styles.templateButton}
            >
              <Layers size={18} color={colors.primary} />
              <Text style={styles.templateButtonText}>Browse Workout Splits</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {routines.map((routine, idx) => {
              const muscleGroups = getMuscleGroups(routine);
              const duration = estimateRoutineDuration(routine.exercises.length);
              const routineColor = routine.color || ROUTINE_COLORS[idx % ROUTINE_COLORS.length];
              const initial = routine.name ? routine.name.charAt(0).toUpperCase() : "R";
              return (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineCard}
                  onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.routineIcon, { backgroundColor: routineColor }]}
                  >
                    <Text style={styles.routineInitial}>{initial}</Text>
                  </View>
                  <View style={styles.routineInfo}>
                    <Text style={styles.routineName}>{routine.name}</Text>
                    <Text style={styles.routineDetail}>
                      {routine.exercises.length} exercises · ~{duration + 10} min
                      {routine.scheduledDays && routine.scheduledDays.length > 0
                        ? ` · ${routine.scheduledDays.map((d) => WEEKDAY_SHORT[d]).join(", ")}`
                        : ""}
                    </Text>
                    {muscleGroups.length > 0 && (
                      <View style={styles.tagsRow}>
                        {muscleGroups.map((mg) => (
                          <View key={mg} style={styles.muscleTag}>
                            <Text style={styles.muscleTagText}>
                              {MUSCLE_GROUP_LABELS[mg]}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            {/* Browse templates link at bottom */}
            <TouchableOpacity
              onPress={() => setShowTemplates(true)}
              activeOpacity={0.7}
              style={styles.browseSplitsCard}
            >
              <Layers size={18} color={colors.primary} />
              <Text style={styles.browseSplitsText}>Browse Workout Splits</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ─── Create Routine Modal ──────────────────────────────── */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={(t) => setNewName(t.slice(0, 50))}
              placeholder="Routine name (e.g. Push Day)"
              maxLength={50}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />

            {/* Quick-tap name suggestions */}
            <View style={styles.suggestionsWrap}>
              {ROUTINE_NAME_SUGGESTIONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.suggestionBubble,
                    newName === name && styles.suggestionBubbleActive,
                  ]}
                  onPress={() => {
                    setNewName(name);
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      newName === name && styles.suggestionTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !newName.trim() && styles.modalCreateDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Workout Splits Template Picker Modal ─────────────── */}
      <Modal visible={showTemplates} transparent animationType="slide">
        <View style={[styles.templateModalContainer, { paddingTop: insets.top }]}>
          <View style={styles.templateModalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (selectedSplit) {
                  setSelectedSplit(null);
                } else {
                  setShowTemplates(false);
                }
              }}
              activeOpacity={0.7}
              style={styles.templateBackButton}
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.templateModalTitle}>
              {selectedSplit ? selectedSplit.name : "Workout Splits"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {!selectedSplit ? (
            <ScrollView contentContainerStyle={styles.templateList} showsVerticalScrollIndicator={false}>
              <Text style={styles.templateSubheading}>
                Choose a proven split. All exercises are pre-filled — you can customize them after.
              </Text>
              {WORKOUT_SPLITS.map((split) => (
                <TouchableOpacity
                  key={split.id}
                  style={styles.splitCard}
                  onPress={() => handlePickSplit(split)}
                  activeOpacity={0.7}
                >
                  <View style={styles.splitCardTop}>
                    <Text style={styles.splitName}>{split.name}</Text>
                    <View style={styles.splitFreqBadge}>
                      <Text style={styles.splitFreqText}>{split.daysPerWeek}×/wk</Text>
                    </View>
                  </View>
                  <Text style={styles.splitDesc}>{split.shortDescription}</Text>
                  <View style={styles.splitRoutinePreview}>
                    {split.routines.map((r, i) => (
                      <View key={i} style={styles.splitRoutineChip}>
                        <Text style={styles.splitRoutineChipInitial}>
                          {r.name ? r.name.charAt(0).toUpperCase() : "R"}
                        </Text>
                        <Text style={styles.splitRoutineChipText}>{r.name}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.templateList} showsVerticalScrollIndicator={false}>
              <Text style={styles.templateSubheading}>
                {selectedSplit.shortDescription}
              </Text>
              {selectedSplit.routines.map((routine, rIdx) => (
                <View key={rIdx} style={styles.previewRoutineCard}>
                  <View style={styles.previewRoutineHeader}>
                    <Text style={styles.previewRoutineInitial}>
                      {routine.name ? routine.name.charAt(0).toUpperCase() : "R"}
                    </Text>
                    <Text style={styles.previewRoutineName}>{routine.name}</Text>
                    <Text style={styles.previewRoutineCount}>
                      {routine.exercises.length} exercises
                    </Text>
                  </View>
                  {routine.exercises.map((ex, eIdx) => (
                    <View key={eIdx} style={styles.previewExerciseRow}>
                      <Text style={styles.previewExNum}>{eIdx + 1}</Text>
                      <Text style={styles.previewExName}>{ex.name}</Text>
                      <Text style={styles.previewExDetail}>
                        {ex.sets}×{ex.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}

              <TouchableOpacity
                onPress={handleConfirmSplit}
                activeOpacity={0.8}
                style={styles.confirmSplitButton}
              >
                <View style={styles.confirmSplitGradient}>
                  <Check size={18} color={colors.white} />
                  <Text style={styles.confirmSplitText}>
                    Add {selectedSplit.routines.length} Routine{selectedSplit.routines.length > 1 ? "s" : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 12,
  },

  // ─── Empty state ─────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBorder,
  },
  templateButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.primary,
  },

  // ─── Routine cards ───────────────────────────────────────
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  routineIcon: {
    width: 54,
    height: 54,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  routineInitial: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.white,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  routineDetail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.glassBorder,
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },

  // ─── Browse splits link ──────────────────────────────────
  browseSplitsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: "dashed",
  },
  browseSplitsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.primary,
  },

  // ─── Create modal ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    width: "85%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  suggestionBubble: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.glassBorder,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  suggestionBubbleActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: colors.textSecondary,
  },
  suggestionTextActive: {
    color: colors.primary,
    fontWeight: "600" as const,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.glassBorder,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  modalCreate: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  modalCreateDisabled: {
    opacity: 0.4,
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.white,
  },

  // ─── Template picker modal ───────────────────────────────
  templateModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  templateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  templateBackButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  templateModalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  templateList: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 14,
  },
  templateSubheading: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },

  // ─── Split cards ─────────────────────────────────────────
  splitCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  splitCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  splitName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  splitFreqBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.glassBorder,
  },
  splitFreqText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  splitDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  splitRoutinePreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  splitRoutineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.glassBorder,
  },
  splitRoutineChipInitial: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  splitRoutineChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },

  // ─── Preview detail ──────────────────────────────────────
  previewRoutineCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  previewRoutineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  previewRoutineInitial: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  previewRoutineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  previewRoutineCount: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "600" as const,
  },
  previewExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  previewExNum: {
    width: 20,
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    textAlign: "center",
  },
  previewExName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.text,
  },
  previewExDetail: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textTertiary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  confirmSplitButton: {
    marginTop: 4,
  },
  confirmSplitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  confirmSplitText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
