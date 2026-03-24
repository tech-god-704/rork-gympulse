import React, { useState, useCallback } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Dumbbell, ChevronRight, Layers, ArrowLeft, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, WEEKDAY_SHORT } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";
import { WORKOUT_SPLITS, ROUTINE_NAME_SUGGESTIONS, type WorkoutSplit } from "@/mocks/exercises";

const ROUTINE_GRADIENTS: [string, string][] = [
  [Colors.primary, Colors.indigo],
  [Colors.indigo, Colors.violet],
  ["#06B6D4", "#10B981"],
  ["#F59E0B", "#F43F5E"],
  [Colors.violet, "#EC4899"],
  [Colors.primary, "#06B6D4"],
];

const FALLBACK_EMOJIS = ["🔥", "💪", "🦵", "⚡", "🏆", "🎯"];

export default function RoutinesScreen() {
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
          <LinearGradient
            colors={[Colors.primary, Colors.indigo]}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Dumbbell size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a custom routine or start with a proven workout split
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.indigo]}
                style={styles.emptyButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Plus size={18} color={Colors.white} />
                <Text style={styles.emptyButtonText}>Create Routine</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTemplates(true)}
              activeOpacity={0.8}
              style={styles.templateButton}
            >
              <Layers size={18} color={Colors.primary} />
              <Text style={styles.templateButtonText}>Browse Workout Splits</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {routines.map((routine, idx) => {
              const muscleGroups = getMuscleGroups(routine);
              const duration = estimateRoutineDuration(routine.exercises.length);
              const gradientColors = ROUTINE_GRADIENTS[idx % ROUTINE_GRADIENTS.length];
              const emoji = routine.emoji || FALLBACK_EMOJIS[idx % FALLBACK_EMOJIS.length];
              return (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineCard}
                  onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={gradientColors}
                    style={styles.routineIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.routineEmoji}>{emoji}</Text>
                  </LinearGradient>
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
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            {/* Browse templates link at bottom */}
            <TouchableOpacity
              onPress={() => setShowTemplates(true)}
              activeOpacity={0.7}
              style={styles.browseSplitsCard}
            >
              <Layers size={18} color={Colors.primary} />
              <Text style={styles.browseSplitsText}>Browse Workout Splits</Text>
              <ChevronRight size={16} color={Colors.textTertiary} />
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
              placeholderTextColor={Colors.textTertiary}
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
              <ArrowLeft size={20} color={Colors.text} />
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
                        <Text style={styles.splitRoutineChipEmoji}>{r.emoji || "🏋️"}</Text>
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
                    <Text style={styles.previewRoutineEmoji}>{routine.emoji || "🏋️"}</Text>
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
                <LinearGradient
                  colors={[Colors.primary, Colors.indigo]}
                  style={styles.confirmSplitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Check size={18} color={Colors.white} />
                  <Text style={styles.confirmSplitText}>
                    Add {selectedSplit.routines.length} Routine{selectedSplit.routines.length > 1 ? "s" : ""}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
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
    borderRadius: 16,
  },
  emptyButtonText: {
    color: Colors.white,
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.2)",
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  templateButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },

  // ─── Routine cards ───────────────────────────────────────
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
    gap: 14,
  },
  routineIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
  routineEmoji: {
    fontSize: 26,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  routineDetail: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: Colors.textTertiary,
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
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.12)",
    borderStyle: "dashed",
  },
  browseSplitsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },

  // ─── Create modal ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    width: "85%",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.10)",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: "rgba(99,102,241,0.04)",
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
    borderRadius: 20,
    backgroundColor: "rgba(99,102,241,0.06)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  suggestionBubbleActive: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderColor: Colors.primary,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  suggestionTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.06)",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  modalCreate: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  modalCreateDisabled: {
    opacity: 0.4,
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.white,
  },

  // ─── Template picker modal ───────────────────────────────
  templateModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  templateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  templateBackButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  templateModalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  templateList: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 14,
  },
  templateSubheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },

  // ─── Split cards ─────────────────────────────────────────
  splitCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    shadowColor: "#000",
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
    color: Colors.text,
    letterSpacing: -0.3,
  },
  splitFreqBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.10)",
  },
  splitFreqText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  splitDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  splitRoutineChipEmoji: {
    fontSize: 14,
  },
  splitRoutineChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },

  // ─── Preview detail ──────────────────────────────────────
  previewRoutineCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
  },
  previewRoutineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(99,102,241,0.08)",
  },
  previewRoutineEmoji: {
    fontSize: 20,
  },
  previewRoutineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  previewRoutineCount: {
    fontSize: 12,
    color: Colors.textTertiary,
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
    color: Colors.textTertiary,
    textAlign: "center",
  },
  previewExName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  previewExDetail: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
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
    borderRadius: 16,
  },
  confirmSplitText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
