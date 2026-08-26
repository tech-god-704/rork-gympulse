import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform, Vibration, AppState, type AppStateStatus } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { X, Play, Pause, RotateCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { RestTimerAlert } from "@/types";

const PRESETS = [30, 60, 90, 120];
const RING_SIZE = 184;
const RING_STROKE = 8;

// Generate a short 880Hz beep tone as a WAV data URI (no network needed)
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

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 =
    typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buffer).toString("base64");

  return `data:audio/wav;base64,${base64}`;
}

let cachedBeepUri: string | null = null;
function getBeepUri(): string {
  if (!cachedBeepUri) cachedBeepUri = generateBeepWav();
  return cachedBeepUri;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Props {
  visible: boolean;
  onClose: () => void;
  initialDuration?: number;
  alertType?: RestTimerAlert;
}

export default function RestTimer({ visible, onClose, initialDuration = 60, alertType = "vibrate" }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [duration, setDuration] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  /**
   * Absolute wall-clock deadline rather than a decremented counter.
   * A `setInterval` is throttled or suspended while the app is backgrounded,
   * so the old countdown silently lost seconds whenever the user switched to
   * their music app mid-rest. Deriving the remaining time from a timestamp
   * keeps it correct across backgrounding, and immune to timer drift.
   */
  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Alerts ──
  const playAlertSound = useCallback(async () => {
    try {
      const beepUri = getBeepUri();
      // Three evenly spaced beeps. The previous loop awaited an
      // ever-growing delay, so the gaps came out at 0ms / 300ms / 600ms.
      for (let i = 0; i < 3; i++) {
        if (i > 0) await sleep(220);
        const { sound } = await Audio.Sound.createAsync(
          { uri: beepUri },
          { shouldPlay: true, volume: 0.6 }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync();
          }
        });
        soundRef.current = sound;
      }
    } catch {
      // Fallback to heavy haptics if audio fails
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 250);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 500);
    }
  }, []);

  const fireAlert = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (Platform.OS === "web" || alertType === "none") return;
    if (alertType === "vibrate" || alertType === "both") {
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (alertType === "sound" || alertType === "both") {
      void playAlertSound();
    }
  }, [alertType, playAlertSound]);

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

  const startTimer = useCallback((seconds: number) => {
    firedRef.current = false;
    endsAtRef.current = Date.now() + seconds * 1000;
    setDuration(seconds);
    setTimeLeft(seconds);
    setIsRunning(true);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Reset & auto-start whenever the sheet opens
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      firedRef.current = false;
      endsAtRef.current = Date.now() + initialDuration * 1000;
      setDuration(initialDuration);
      setTimeLeft(initialDuration);
      setIsRunning(true);
    }
    if (!visible && prevVisible.current) {
      endsAtRef.current = null;
      setIsRunning(false);
    }
    prevVisible.current = visible;
  }, [visible, initialDuration]);

  /** Recompute from the deadline. Safe to call at any cadence. */
  const syncFromClock = useCallback(() => {
    const endsAt = endsAtRef.current;
    if (endsAt == null) return;
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    setTimeLeft(remaining);
    if (remaining === 0) {
      setIsRunning(false);
      endsAtRef.current = null;
      fireAlert();
    }
  }, [fireAlert]);

  useEffect(() => {
    if (!isRunning || !visible) return;
    syncFromClock();
    const id = setInterval(syncFromClock, 500);
    return () => clearInterval(id);
  }, [isRunning, visible, syncFromClock]);

  // Coming back from the background: settle the display immediately rather
  // than waiting for the next tick.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && isRunning) syncFromClock();
    });
    return () => sub.remove();
  }, [isRunning, syncFromClock]);

  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isRunning, pulseAnim]);

  const handleClose = useCallback(() => {
    setIsRunning(false);
    endsAtRef.current = null;
    setTimeLeft(duration);
    Vibration.cancel();
    onClose();
  }, [onClose, duration]);

  const togglePause = useCallback(() => {
    setIsRunning((running) => {
      if (running) {
        endsAtRef.current = null;
        return false;
      }
      endsAtRef.current = Date.now() + timeLeft * 1000;
      firedRef.current = false;
      return true;
    });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [timeLeft]);

  /** Nudge the deadline. Reaching zero this way now fires the alert too. */
  const adjust = useCallback(
    (delta: number) => {
      const next = Math.max(0, timeLeft + delta);
      setTimeLeft(next);
      setDuration((d) => Math.max(d, next));
      if (isRunning) {
        if (next === 0) {
          endsAtRef.current = null;
          setIsRunning(false);
          fireAlert();
        } else {
          endsAtRef.current = Date.now() + next * 1000;
        }
      }
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [timeLeft, isRunning, fireAlert]
  );

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isDone = timeLeft === 0;
  const fraction = duration > 0 ? Math.min(Math.max(timeLeft / duration, 0), 1) : 0;
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringColor = isDone ? colors.emerald : isRunning ? colors.primary : colors.textTertiary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Rest Timer</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close rest timer"
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}
            accessible
            accessibilityLabel={
              isDone ? "Rest complete" : `${formatTime(timeLeft)} remaining${isRunning ? "" : ", paused"}`
            }
          >
            {/* A real countdown arc — the ring used to be a static border
                that never reflected how much rest was left. */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke={colors.glassBorder}
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              {isDone ? (
                <Text style={styles.doneLabel}>Rest complete</Text>
              ) : (
                <Text style={styles.timerLabel}>{isRunning ? "remaining" : "paused"}</Text>
              )}
            </View>
          </Animated.View>

          {/* Preset picker — always available, so switching rest length
              no longer requires stopping the timer first. */}
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetPill, duration === p && styles.presetPillActive]}
                onPress={() => startTimer(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === p }}
                accessibilityLabel={`${p} second rest`}
              >
                <Text style={[styles.presetText, duration === p && styles.presetTextActive]}>
                  {p < 60 ? `${p}s` : p % 60 === 0 ? `${p / 60}m` : `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isDone && (
            <View style={styles.adjustRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjust(-15)}
                accessibilityRole="button"
                accessibilityLabel="Subtract 15 seconds"
              >
                <Text style={styles.adjustText}>−15s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjust(15)}
                accessibilityRole="button"
                accessibilityLabel="Add 15 seconds"
              >
                <Text style={styles.adjustText}>+15s</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDone ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton]}
                onPress={() => startTimer(duration)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Restart rest timer"
              >
                <RotateCcw size={18} color={colors.text} />
                <Text style={styles.secondaryText}>Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.emerald, flex: 1 }]}
                onPress={handleClose}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Close and continue"
              >
                <Text style={styles.primaryText}>Back to workout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: isRunning ? colors.textSecondary : colors.primary }]}
              onPress={togglePause}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isRunning ? "Pause rest timer" : "Resume rest timer"}
            >
              {isRunning ? <Pause size={20} color={colors.white} /> : <Play size={20} color={colors.white} />}
              <Text style={styles.primaryText}>{isRunning ? "Pause" : "Resume"}</Text>
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  timerCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  ringSvg: {
    position: "absolute",
  },
  timerInner: {
    alignItems: "center",
  },
  timerText: {
    fontVariant: ["tabular-nums"],
    fontSize: 46,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  doneLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.emerald,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },
  presetPill: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    minHeight: 44,
    justifyContent: "center",
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
  adjustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 14,
  },
  adjustButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    minHeight: 54,
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 54,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
});
