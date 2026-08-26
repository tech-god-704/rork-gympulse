import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { ChevronRight, Dumbbell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { sessionProgress } from "@/utils/workoutStats";
import { formatClock } from "@/utils/helpers";

/** Height the bar occupies, so screens can pad their scroll content. */
export const ACTIVE_BAR_HEIGHT = 62;

/**
 * A live workout was previously only visible on the Today tab — navigate to
 * Routines or Progress mid-session and there was no indication one was running
 * and no way back to it. This pins a resume control above the tab bar.
 */
export default function ActiveWorkoutBar() {
  const { currentSession } = useGym();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const progress = useMemo(() => sessionProgress(currentSession), [currentSession]);

  // The Today tab already renders the full workout, so the bar would be noise there.
  const onHomeTab = segments.some((s) => s === "(home)");
  if (!currentSession || onHomeTab) return null;

  const handlePress = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/(home)");
  };

  const pct = Math.round(progress.fraction * 100);

  return (
    <View
      style={[styles.wrapper, { bottom: 58 + insets.bottom }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.bar}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${currentSession.routineName}. ${progress.completedSets} of ${progress.totalSets} sets done, ${formatClock(elapsed)} elapsed.`}
      >
        <View style={styles.iconBox}>
          <Dumbbell size={17} color={colors.white} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{currentSession.routineName}</Text>
          <Text style={styles.meta}>
            {formatClock(elapsed)} · {progress.completedSets}/{progress.totalSets} sets
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.pct}>{pct}%</Text>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: ACTIVE_BAR_HEIGHT - 10,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.white,
    letterSpacing: -0.3,
  },
  meta: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pct: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.white,
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressFill: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
