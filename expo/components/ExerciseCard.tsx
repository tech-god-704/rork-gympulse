import React, { useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS } from "@/types";

interface Props {
  exercise: WorkoutSessionExercise;
  index?: number;
  onToggle: () => void;
  onRestTimer: () => void;
}

function ExerciseCard({ exercise, index = 0, onToggle, onRestTimer }: Props) {
  const checkAnim = useRef(new Animated.Value(exercise.completed ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
                {exercise.sets}×{exercise.reps}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.detail}>
                {exercise.weight > 0 ? `${exercise.weight} lbs` : "BW"}
              </Text>
              <View style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {!exercise.completed && (
          <View style={styles.restButtons}>
            {[60, 90].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.restButton}
                onPress={() => onRestTimer()}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.restButtonText}>{s}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
});
