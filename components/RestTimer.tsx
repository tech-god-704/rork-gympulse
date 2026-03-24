import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform, Vibration } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Play, Pause } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { RestTimerAlert } from "@/types";

const PRESETS = [30, 60, 90, 120];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialDuration?: number;
  alertType?: RestTimerAlert;
}

export default function RestTimer({ visible, onClose, initialDuration = 60, alertType = "vibrate" }: Props) {
  const [seconds, setSeconds] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(
    (duration: number) => {
      setTimeLeft(duration);
      setSeconds(duration);
      setIsRunning(true);
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    []
  );

  // Reset timer when opened (pick up latest initialDuration) & auto-start
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setSeconds(initialDuration);
      setTimeLeft(initialDuration);
      setIsRunning(true); // auto-start the countdown
    }
    prevVisible.current = visible;
  }, [visible, initialDuration]);

  const fireAlert = useCallback(() => {
    if (Platform.OS === "web" || alertType === "none") return;
    if (alertType === "vibrate" || alertType === "both") {
      // Triple-pulse vibration pattern
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (alertType === "sound" || alertType === "both") {
      // Heavy haptic as an audible tap-back (no audio lib needed)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 250);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 500);
    }
  }, [alertType]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          fireAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, fireAlert]);

  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, pulseAnim]);

  const handleClose = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(initialDuration);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  }, [onClose, initialDuration]);

  const togglePause = useCallback(() => {
    setIsRunning((prev) => !prev);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Rest Timer</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              {isRunning && <Text style={styles.timerLabel}>remaining</Text>}
              {!isRunning && timeLeft === 0 && <Text style={styles.doneLabel}>Done!</Text>}
            </View>
            <View
              style={[
                styles.progressRing,
                {
                  borderColor: isRunning ? Colors.primary : timeLeft === 0 ? Colors.success : "rgba(0,0,0,0.06)",
                  borderWidth: 4,
                },
              ]}
            />
          </Animated.View>

          {!isRunning && (
            <View style={styles.presetsRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetPill, seconds === p && styles.presetPillActive]}
                  onPress={() => startTimer(p)}
                >
                  <Text style={[styles.presetText, seconds === p && styles.presetTextActive]}>
                    {p < 60 ? `${p}s` : p % 60 === 0 ? `${p / 60}m` : `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isRunning && (
            <View>
              <View style={styles.adjustRow}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => {
                    setTimeLeft((t) => Math.max(0, t - 15));
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.adjustText}>-15s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => {
                    setTimeLeft((t) => t + 15);
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.adjustText}>+15s</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.pauseButton} onPress={togglePause} activeOpacity={0.8}>
                <Pause size={20} color={Colors.white} />
                <Text style={styles.pauseText}>Pause</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isRunning && timeLeft > 0 && timeLeft < seconds && (
            <TouchableOpacity onPress={togglePause} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primary, Colors.indigo]}
                style={styles.startButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Play size={20} color={Colors.white} />
                <Text style={styles.startText}>Resume</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {(!isRunning && timeLeft === seconds) && (
            <TouchableOpacity onPress={() => startTimer(seconds)} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primary, Colors.indigo]}
                style={styles.startButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Play size={20} color={Colors.white} />
                <Text style={styles.startText}>Start</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {timeLeft === 0 && (
            <TouchableOpacity onPress={handleClose} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.emerald, "#059669"]}
                style={styles.startButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
  },
  timerCircle: {
    width: 180,
    height: 180,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  timerInner: {
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  doneLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.success,
    marginTop: 4,
  },
  progressRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  presetPill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.10)",
  },
  presetPillActive: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  presetTextActive: {
    color: Colors.primary,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  startText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  adjustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  adjustButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.06)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.10)",
    minHeight: 48,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  adjustText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  pauseButton: {
    backgroundColor: Colors.textSecondary,
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pauseText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
});
