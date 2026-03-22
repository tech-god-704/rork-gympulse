import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native";
import { Trophy } from "lucide-react-native";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONFETTI_COUNT = 50;
const CONFETTI_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

interface Props {
  visible: boolean;
  exerciseCount: number;
  duration: number;
  streak: number;
  onDismiss: () => void;
}

export default function ConfettiOverlay({ visible, exerciseCount, duration, streak, onDismiss }: Props) {
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  const confettiAnims = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
      })),
    []
  );

  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      scaleAnim.setValue(0.5);

      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]).start();

      confettiAnims.forEach((anim) => {
        anim.x.setValue(Math.random() * SCREEN_WIDTH);
        anim.y.setValue(-20);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);

        const fallDuration = 2000 + Math.random() * 2000;
        const delay = Math.random() * 500;

        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: SCREEN_HEIGHT + 20,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.x, {
            toValue: Math.random() * SCREEN_WIDTH,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 10,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: fallDuration,
            delay: delay + fallDuration * 0.6,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible, overlayAnim, scaleAnim, confettiAnims]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      {confettiAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: 8 + Math.random() * 6,
              height: 14 + Math.random() * 8,
              borderRadius: Math.random() > 0.5 ? 10 : 2,
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 10],
                    outputRange: ["0deg", "3600deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.trophyCircle}>
          <Trophy size={40} color={Colors.white} />
        </View>
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.subtitle}>Great job crushing it today</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{exerciseCount}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{duration}m</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "85%",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.cardBorder,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
});
