import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform, Vibration } from "react-native";
import { X, Play, Pause } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { RestTimerAlert } from "@/types";

const PRESETS = [30, 60, 90, 120];

// Generate a short 440Hz beep tone as a WAV data URI (no network needed)
function generateBeepWav(): string {
  const sampleRate = 22050;
  const duration = 0.15; // 150ms per beep
  const frequency = 880; // A5 note - gentle, not jarring
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Generate sine wave with fade-in/out envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (numSamples * 0.1)) * Math.min(1, (numSamples - i) / (numSamples * 0.2));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.4 * envelope;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 =
    typeof btoa !== "undefined"
      ? btoa(binary)
      : Buffer.from(buffer).toString("base64");

  return `data:audio/wav;base64,${base64}`;
}

let cachedBeepUri: string | null = null;
function getBeepUri(): string {
  if (!cachedBeepUri) cachedBeepUri = generateBeepWav();
  return cachedBeepUri;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialDuration?: number;
  alertType?: RestTimerAlert;
}

export default function RestTimer({ visible, onClose, initialDuration = 60, alertType = "vibrate" }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const soundRef = useRef<Audio.Sound | null>(null);

  // Configure audio mode so the alert ducks (lowers) background music
  // instead of pausing it — less intrusive for users playing Spotify/Apple Music
  useEffect(() => {
    if (Platform.OS === "web") return;
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1, // DuckOthers
      shouldDuckAndroid: true,
    });
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playAlertSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const beepUri = getBeepUri();
      // Play triple beep: beep - pause - beep - pause - beep
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, i * 300));
        const { sound } = await Audio.Sound.createAsync(
          { uri: beepUri },
          { shouldPlay: true, volume: 0.6 },
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync();
          }
        });
        if (i === 2) soundRef.current = sound;
      }
    } catch {
      // Fallback to heavy haptics if audio fails
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 250);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 500);
    }
  }, []);

  const fireAlert = useCallback(() => {
    if (Platform.OS === "web" || alertType === "none") return;
    if (alertType === "vibrate" || alertType === "both") {
      // Triple-pulse vibration pattern
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (alertType === "sound" || alertType === "both") {
      void playAlertSound();
    }
  }, [alertType, playAlertSound]);

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
              <X size={20} color={colors.textSecondary} />
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
                  borderColor: isRunning ? colors.primary : timeLeft === 0 ? colors.success : colors.glassBorder,
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
                <Pause size={20} color={colors.white} />
                <Text style={styles.pauseText}>Pause</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isRunning && timeLeft > 0 && timeLeft < seconds && (
            <TouchableOpacity onPress={togglePause} activeOpacity={0.8}>
              <View
                style={[styles.startButton, { backgroundColor: colors.primary }]}
              >
                <Play size={20} color={colors.white} />
                <Text style={styles.startText}>Resume</Text>
              </View>
            </TouchableOpacity>
          )}

          {(!isRunning && timeLeft === seconds) && (
            <TouchableOpacity onPress={() => startTimer(seconds)} activeOpacity={0.8}>
              <View
                style={[styles.startButton, { backgroundColor: colors.primary }]}
              >
                <Play size={20} color={colors.white} />
                <Text style={styles.startText}>Start</Text>
              </View>
            </TouchableOpacity>
          )}

          {timeLeft === 0 && (
            <TouchableOpacity onPress={handleClose} activeOpacity={0.8}>
              <View
                style={[styles.startButton, { backgroundColor: colors.emerald }]}
              >
                <Text style={styles.startText}>Close</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
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
    color: colors.text,
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
    color: colors.text,
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  doneLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.success,
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
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  presetPillActive: {
    backgroundColor: colors.primaryUltraLight,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
  },
  presetTextActive: {
    color: colors.primary,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  startText: {
    color: colors.white,
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
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 48,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  adjustText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
  },
  pauseButton: {
    backgroundColor: colors.textSecondary,
    paddingVertical: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pauseText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
});
