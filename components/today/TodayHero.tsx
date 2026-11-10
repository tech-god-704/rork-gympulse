import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Clock, Play } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useTheme } from "@/providers/ThemeProvider";
import { MUSCLE_GROUP_LABELS, MuscleGroup, Routine, WeightUnit, WorkoutHistory } from "@/types";
import { glow, muscleColor } from "@/constants/theme";
import { estimateRoutineDuration, formatRelativeDate } from "@/utils/helpers";
import { formatVolume } from "@/utils/units";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";

interface Props {
  routine: Routine;
  eyebrow: string;
  onStart: () => void;
  /** The last time this routine was done, shown as the number to beat. */
  lastSession?: WorkoutHistory;
  weightUnit: WeightUnit;
}

const MAX_PEEK = 4;

/** The dominant card on Today: the workout to do now, with one big Start button. */
export default function TodayHero({ routine, eyebrow, onStart, lastSession, weightUnit }: Props) {
  const { colors } = useTheme();
  const { findByName, videos } = useExerciseLibrary();

  const groups = useMemo(
    () => [...new Set(routine.exercises.map((e) => e.muscleGroup))] as MuscleGroup[],
    [routine.exercises],
  );
  const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
  const mins = estimateRoutineDuration(routine.exercises.length, setCount);

  const peek = useMemo(() => {
    const urls: string[] = [];
    for (const e of routine.exercises) {
      const slug = findByName(e.exerciseName)?.slug;
      const url = slug ? videos[slug]?.thumbnailUrl : null;
      if (url && !urls.includes(url)) urls.push(url);
    }
    return urls.slice(0, MAX_PEEK);
  }, [routine.exercises, findByName, videos]);
  const extra = routine.exercises.length - peek.length;

  return (
    <View style={[styles.shadow, glow("#1D46D8", colors, 0.34)]}>
      <View style={styles.card}>
        <HeroBackdrop pulse radius={30} />

        <View style={styles.topRow}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <View style={styles.duration}>
            <Clock size={13} color="rgba(255,255,255,0.8)" strokeWidth={2.4} />
            <Text style={styles.durationText}>~{mins} min</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{routine.name}</Text>

        {groups.length > 0 && (
          <View style={styles.tags}>
            {groups.slice(0, 4).map((g) => (
              <View key={g} style={styles.tag}>
                <View style={[styles.tagDot, { backgroundColor: muscleColor(g, colors) }]} />
                <Text style={styles.tagText}>{MUSCLE_GROUP_LABELS[g]}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.peekRow}>
          {peek.length > 0 && (
            <View style={styles.peek}>
              {peek.map((url, i) => (
                <Image key={url} source={{ uri: url }} style={[styles.thumb, i > 0 && styles.thumbOverlap]} contentFit="cover" transition={200} />
              ))}
              {extra > 0 && (
                <View style={[styles.thumb, styles.thumbOverlap, styles.more]}>
                  <Text style={styles.moreText}>+{extra}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.counts}>
            <Text style={styles.countLine}>
              <Text style={styles.countNum}>{routine.exercises.length}</Text> exercises
            </Text>
            <Text style={styles.countLine}>
              <Text style={styles.countNum}>{setCount}</Text> sets
            </Text>
          </View>
        </View>

        <PressableScale
          onPress={onStart}
          haptic="medium"
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={`Start ${routine.name}`}
          testID="start-workout"
        >
          <View style={styles.ctaIcon}>
            <Play size={14} color="#fff" fill="#fff" />
          </View>
          <Text style={styles.ctaText}>Start workout</Text>
        </PressableScale>

        {lastSession && (
          <Text style={styles.last} numberOfLines={1}>
            Last time · {formatRelativeDate(lastSession.completedAt)}
            {(lastSession.totalVolume ?? 0) > 0 ? ` · ${formatVolume(lastSession.totalVolume ?? 0, weightUnit)}` : ""} · {lastSession.duration} min
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 30 },
  card: { borderRadius: 30, padding: 22, gap: 14, overflow: "hidden" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrowPill: { backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: "#fff" },
  duration: { flexDirection: "row", alignItems: "center", gap: 5 },
  durationText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)", fontVariant: ["tabular-nums"] },
  title: { fontSize: 38, fontWeight: "800", letterSpacing: -1.6, lineHeight: 42, color: "#fff", marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -4 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", paddingVertical: 5, paddingLeft: 9, paddingRight: 11, borderRadius: 999 },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  tagText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  peekRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  peek: { flexDirection: "row" },
  thumb: { width: 44, height: 58, borderRadius: 13, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "#0F1B4D" },
  thumbOverlap: { marginLeft: -12 },
  more: { backgroundColor: "rgba(10,18,60,0.85)", alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  counts: { flex: 1, gap: 1 },
  countLine: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  countNum: { fontWeight: "800", color: "#fff", fontVariant: ["tabular-nums"] },
  cta: { height: 58, borderRadius: 20, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  ctaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1D4ED8", alignItems: "center", justifyContent: "center", paddingLeft: 2 },
  ctaText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: "#0F1F66" },
  last: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.72)", textAlign: "center", marginTop: -2 },
});
