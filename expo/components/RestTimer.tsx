import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform } from "react-native";
import { X, Play, Pause } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const PRESETS = [30, 60, 90, 120];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RestTimer({ visible, onClose }: Props) {
  const [seconds, setSeconds] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
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

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

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
    setTimeLeft(60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  }, [onClose]);

  const togglePause = useCallback(() => {
    setIsRunning((prev) => !prev);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
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
                  borderColor: isRunning ? Colors.primary : timeLeft === 0 ? Colors.success : Colors.cardBorder,
                  borderWidth: 4,
                },
              ]}
            />
          </Animated.View>

          {!isRunning && timeLeft > 0 && timeLeft === seconds && (
            <View style={styles.presetsRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetPill, seconds === p && styles.presetPillActive]}
                  onPress={() => startTimer(p)}
                >
                  <Text style={[styles.presetText, seconds === p && styles.presetTextActive]}>
                    {p >= 60 ? `${p / 60}m` : `${p}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isRunning && (
            <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
              <Pause size={20} color={Colors.white} />
              <Text style={styles.pauseText}>Pause</Text>
            </TouchableOpacity>
          )}

          {!isRunning && timeLeft > 0 && timeLeft < seconds && (
            <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
              <Play size={20} color={Colors.white} />
              <Text style={styles.pauseText}>Resume</Text>
            </TouchableOpacity>
          )}

          {(!isRunning && timeLeft === seconds) && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => startTimer(seconds)}
              activeOpacity={0.8}
            >
              <Play size={20} color={Colors.white} />
              <Text style={styles.startText}>Start</Text>
            </TouchableOpacity>
          )}

          {timeLeft === 0 && (
            <TouchableOpacity style={styles.startButton} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.startText}>Close</Text>
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
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
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  presetPillActive: {
    backgroundColor: Colors.primaryUltraLight,
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
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  startText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  pauseButton: {
    backgroundColor: Colors.textSecondary,
    paddingVertical: 16,
    borderRadius: 14,
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
