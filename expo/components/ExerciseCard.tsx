import React, { useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { Check, Timer } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { WorkoutSessionExercise, MUSCLE_GROUP_LABELS } from "@/types";

interface Props {
  exercise: WorkoutSessionExercise;
  onToggle: () => void;
  onRestTimer: () => void;
}

function ExerciseCard({ exercise, onToggle, onRestTimer }: Props) {
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
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
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
    outputRange: [Colors.white, Colors.completedCard],
  });

  const borderColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.cardBorder, Colors.completedBorder],
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
      <TouchableOpacity style={styles.content} onPress={handleToggle} activeOpacity={0.7} testID={`exercise-${exercise.routineExerciseId}`}>
        <View style={styles.leftSection}>
          <Animated.View
            style={[
              styles.checkbox,
              {
                backgroundColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["transparent", Colors.success],
                }),
                borderColor: checkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Colors.cardBorder, Colors.success],
                }),
              },
            ]}
          >
            {exercise.completed && <Check size={14} color={Colors.white} />}
          </Animated.View>
          <View style={styles.info}>
            <Text style={[styles.exerciseName, exercise.completed && styles.exerciseNameCompleted]}>
              {exercise.exerciseName}
            </Text>
            <View style={styles.detailRow}>
              <Text style={styles.detail}>
                {exercise.sets} × {exercise.reps}
                {exercise.weight > 0 ? ` · ${exercise.weight} lbs` : ""}
              </Text>
              <View style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
            </View>
          </View>
        </View>
        {!exercise.completed && (
          <TouchableOpacity
            style={styles.timerButton}
            onPress={(e) => {
              e.stopPropagation();
              onRestTimer();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Timer size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(ExerciseCard);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  exerciseNameCompleted: {
    color: Colors.textTertiary,
    textDecorationLine: "line-through" as const,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  muscleTag: {
    backgroundColor: Colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  timerButton: {
    padding: 8,
  },
});
