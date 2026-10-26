import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Vibration, AppState } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "@/providers/ThemeProvider";
import { RestTimerAlert } from "@/types";
import { gradient, glow } from "@/constants/theme";
import { getBeepUri } from "@/utils/restAlert";
import { formatClock } from "@/utils/helpers";

interface Props {
  /** Bump this to (re)start the timer; null hides the bar. */
  startKey: number | null;
  duration: number;
  alertType: RestTimerAlert;
  onDone: () => void;
  bottomOffset?: number;
}

const RING = 44;
const STROKE = 4;

/**
 * Floating rest countdown that sits over the workout instead of covering it.
 * Like the old sheet, it counts from a wall-clock deadline so backgrounding
 * the app never loses seconds.
 */
export default function RestBar({ startKey, duration, alertType, onDone, bottomOffset = 24 }: Props) {
  const { colors } = useTheme();
  const [total, setTotal] = useState(duration);
  const [left, setLeft] = useState(duration);
  const endsAt = useRef<number | null>(null);
  const fired = useRef(false);

  const fireAlert = useCallback(async () => {
    if (fired.current) return;
    fired.current = true;
    if (Platform.OS === "web" || alertType === "none") return;
    if (alertType === "vibrate" || alertType === "both") {
      Vibration.vibrate([0, 300, 150, 300]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (alertType === "sound" || alertType === "both") {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: getBeepUri() }, { shouldPlay: true, volume: 0.6 });
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) void sound.unloadAsync();
        });
      } catch {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }, [alertType]);

  useEffect(() => {
    if (startKey == null) {
      endsAt.current = null;
      return;
    }
    fired.current = false;
    endsAt.current = Date.now() + duration * 1000;
    setTotal(duration);
    setLeft(duration);
  }, [startKey, duration]);

  const sync = useCallback(() => {
    if (endsAt.current == null) return;
    const remaining = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
    setLeft(remaining);
    if (remaining === 0) {
      endsAt.current = null;
      void fireAlert();
      setTimeout(onDone, 900);
    }
  }, [fireAlert, onDone]);

  useEffect(() => {
    if (startKey == null) return;
    const id = setInterval(sync, 500);
    const sub = AppState.addEventListener("change", (s) => s === "active" && sync());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [startKey, sync]);

  const addTime = useCallback(() => {
    const next = left + 15;
    endsAt.current = Date.now() + next * 1000;
    fired.current = false;
    setLeft(next);
    setTotal((t) => Math.max(t, next));
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, [left]);

  const skip = useCallback(() => {
    endsAt.current = null;
    Vibration.cancel();
    onDone();
  }, [onDone]);

  if (startKey == null) return null;

  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(Math.max(left / total, 0), 1) : 0;

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }, glow("#2563EB", colors, 0.35)]} pointerEvents="box-none">
      <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bar}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={STROKE} fill="none" />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              stroke="#fff"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={c * (1 - frac)}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>{left === 0 ? "Rest complete" : "Rest"}</Text>
          <Text style={styles.time}>{formatClock(left)}</Text>
        </View>
        <TouchableOpacity onPress={addTime} style={styles.ghost} accessibilityRole="button" accessibilityLabel="Add 15 seconds">
          <Text style={styles.ghostText}>+15</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={skip} style={styles.solid} accessibilityRole="button" accessibilityLabel="Skip rest">
          <Text style={styles.solidText}>{left === 0 ? "Done" : "Skip"}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, borderRadius: 22 },
  bar: { borderRadius: 22, padding: 12, paddingLeft: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  ring: { width: RING, height: RING },
  text: { flex: 1 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" },
  time: { fontSize: 28, fontWeight: "800", letterSpacing: -1, color: "#fff", fontVariant: ["tabular-nums"] },
  ghost: { height: 44, minWidth: 54, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  ghostText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  solid: { height: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  solidText: { fontSize: 15, fontWeight: "800", color: "#1D4ED8" },
});
