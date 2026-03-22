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
import { Plus, Clock, Dumbbell, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/types";
import { estimateRoutineDuration } from "@/utils/helpers";

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: Colors.muscleChest,
  back: Colors.muscleBack,
  shoulders: Colors.muscleShoulders,
  arms: Colors.muscleArms,
  legs: Colors.muscleLegs,
  core: Colors.muscleCore,
  cardio: Colors.muscleCardio,
};

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
          style={styles.addButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color={Colors.white} />
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
              style={styles.emptyButton}
              onPress={() => setShowCreate(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Create Routine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routines.map((routine) => {
            const muscleGroups = getMuscleGroups(routine);
            const duration = estimateRoutineDuration(routine.exercises.length);
            return (
              <TouchableOpacity
                key={routine.id}
                style={styles.routineCard}
                onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.routineCardHeader}>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </View>
                <View style={styles.routineDetails}>
                  <View style={styles.routineDetailItem}>
                    <Dumbbell size={14} color={Colors.textSecondary} />
                    <Text style={styles.routineDetailText}>{routine.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.routineDetailItem}>
                    <Clock size={14} color={Colors.textSecondary} />
                    <Text style={styles.routineDetailText}>~{duration} min</Text>
                  </View>
                </View>
                {muscleGroups.length > 0 && (
                  <View style={styles.tagsRow}>
                    {muscleGroups.map((mg) => (
                      <View
                        key={mg}
                        style={[styles.muscleTag, { backgroundColor: MUSCLE_COLORS[mg] + "18" }]}
                      >
                        <Text style={[styles.muscleTagText, { color: MUSCLE_COLORS[mg] }]}>
                          {MUSCLE_GROUP_LABELS[mg]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
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
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
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
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  routineCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  routineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  routineName: {
    fontSize: 19,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  routineDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  routineDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routineDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
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
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.cardBackground,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
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
    borderRadius: 12,
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
