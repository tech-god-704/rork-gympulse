import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Timer } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/providers/ThemeProvider";
import { useGym } from "@/providers/GymProvider";
import { sessionProgress } from "@/utils/workoutStats";
import { formatClock } from "@/utils/helpers";
import { glow, gradient } from "@/constants/theme";

/** Height the bar occupies, so screens can pad their scroll content. */
export const ACTIVE_BAR_HEIGHT = 72;

/**
 * Pins a resume control above the tab bar while a workout is running, so
 * leaving the Today tab mid-session never hides it.
 */
export default function ActiveWorkoutBar() {
  const { currentSession } = useGym();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [elapsed, setElapsed] = useState(0);

  const startedAt = currentSession?.startedAt;

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // The Today tab already renders the full workout, so the bar would be noise there.
  const onHomeTab = segments.some((s) => s === "(home)");
  if (!currentSession || onHomeTab) return null;

  const progress = sessionProgress(currentSession);
  const pct = Math.round(progress.fraction * 100);

  return (
    <View style={[styles.wrapper, { bottom: 76 + insets.bottom }, glow("#1D46D8", colors, 0.34)]} pointerEvents="box-none">
      <PressableScale
        onPress={() => router.push("/(tabs)/(home)")}
        haptic="light"
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${currentSession.routineName}. ${progress.completedSets} of ${progress.totalSets} sets done, ${formatClock(elapsed)} elapsed.`}
      >
        <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bar}>
          <View style={styles.iconBox}>
            <Timer size={18} color="#fff" strokeWidth={2.4} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{currentSession.routineName}</Text>
            <Text style={styles.meta}>
              {formatClock(elapsed)} · {progress.completedSets}/{progress.totalSets} sets
            </Text>
          </View>
          <View style={styles.resume}>
            <Text style={styles.resumeText}>Resume</Text>
            <ChevronRight size={15} color="#1D4ED8" strokeWidth={2.8} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 12, right: 12, borderRadius: 22 },
  bar: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, paddingVertical: 11, paddingLeft: 12, paddingRight: 10, minHeight: ACTIVE_BAR_HEIGHT - 12, overflow: "hidden" },
  iconBox: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3, color: "#fff" },
  meta: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginTop: 1, fontVariant: ["tabular-nums"] },
  resume: { flexDirection: "row", alignItems: "center", gap: 1, height: 36, paddingLeft: 13, paddingRight: 8, borderRadius: 18, backgroundColor: "#fff" },
  resumeText: { fontSize: 13, fontWeight: "800", color: "#1D4ED8" },
  progressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(255,255,255,0.18)" },
  progressFill: { height: 3, backgroundColor: "#fff" },
});
