import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONFETTI_COUNT = 60;
const CONFETTI_COLORS = ["#3B82F6", "#6366F1", "#FBBF24", "#34D399", "#F472B6", "#A78BFA", "#FB923C", "#2DD4BF", "#E879F9", "#60A5FA"];

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
        w: 8 + Math.random() * 6,
        h: 14 + Math.random() * 8,
        rounded: Math.random() > 0.5,
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
              width: anim.w,
              height: anim.h,
              borderRadius: anim.rounded ? 10 : 2,
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
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Workout{"\n"}Complete!</Text>
        <Text style={styles.subtitle}>Keep the streak alive!</Text>

        <View style={styles.statsRow}>
          {[
            { v: exerciseCount.toString(), l: "Exercises", c: Colors.indigo },
            { v: `${streak}`, l: "Day Streak", c: Colors.amber },
            { v: `${duration}m`, l: "Duration", c: Colors.emerald },
          ].map((s) => (
            <View key={s.l} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={onDismiss} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.primary, Colors.indigo]}
            style={styles.doneButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.doneButtonText}>Done ✓</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
  },
  card: {
    alignItems: "center",
    padding: 28,
    width: "85%",
  },
  emoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 28,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "900" as const,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 18,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 6,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
