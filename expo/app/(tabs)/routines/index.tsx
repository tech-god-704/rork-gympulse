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
import { Plus, Dumbbell, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS, WEEKDAY_SHORT } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";

const ROUTINE_GRADIENTS: [string, string][] = [
  [Colors.primary, Colors.indigo],
  [Colors.indigo, Colors.violet],
  ["#06B6D4", "#10B981"],
  ["#F59E0B", "#F43F5E"],
  [Colors.violet, "#EC4899"],
  [Colors.primary, "#06B6D4"],
];

const ROUTINE_EMOJIS = ["🔥", "💪", "🦵", "⚡", "🏆", "🎯"];

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routines, addRoutine } = useGym();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = useCallback(() => {
    if (newName.trim().length === 0) return;
    const routine = addRoutine(newName.trim());
    setNewName("");
    setShowCreate(false);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/(tabs)/routines/${routine.id}`);
  }, [newName, addRoutine, router]);

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
            <Text style={styles.emptySubtitle}>Create your first workout routine to get started</Text>
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
          </View>
        ) : (
          routines.map((routine, idx) => {
            const muscleGroups = getMuscleGroups(routine);
            const duration = estimateRoutineDuration(routine.exercises.length);
            const gradientColors = ROUTINE_GRADIENTS[idx % ROUTINE_GRADIENTS.length];
            const emoji = ROUTINE_EMOJIS[idx % ROUTINE_EMOJIS.length];
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
          })
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Routine name (e.g. Push Day)"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
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
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
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
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
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
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
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
});
