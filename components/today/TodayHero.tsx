import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Play } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { MUSCLE_GROUP_LABELS, MuscleGroup, Routine } from "@/types";
import { gradient, glow, muscleColor } from "@/constants/theme";
import { estimateRoutineDuration } from "@/utils/helpers";

interface Props {
  routine: Routine;
  eyebrow: string;
  startLabel: string;
  onStart: () => void;
}

/** The dominant card on Today: the workout to do now, with one big Start button. */
export default function TodayHero({ routine, eyebrow, startLabel, onStart }: Props) {
  const { colors } = useTheme();
  const groups = useMemo(
    () => [...new Set(routine.exercises.map((e) => e.muscleGroup))] as MuscleGroup[],
    [routine.exercises]
  );
  const setCount = routine.exercises.reduce((sum, e) => sum + e.sets, 0);
  const mins = estimateRoutineDuration(routine.exercises.length, setCount);
  const stats = [
    { v: String(routine.exercises.length), l: "exercises" },
    { v: String(setCount), l: "sets" },
    { v: `~${mins}`, l: "minutes" },
  ];

  return (
    <View style={[styles.shadow, glow("#2563EB", colors, 0.3)]}>
      <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Svg width={230} height={64} viewBox="0 0 230 64" style={styles.pulse}>
          <Path
            d="M0 32h78l10-20 14 44 14-56 12 48 8-16h94"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
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

        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.l} style={styles.stat}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={onStart}
          activeOpacity={0.85}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={`${startLabel}: ${routine.name}`}
        >
          <Play size={17} color="#1D4ED8" fill="#1D4ED8" />
          <Text style={styles.ctaText}>{startLabel}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 28 },
  card: { borderRadius: 28, padding: 22, overflow: "hidden" },
  pulse: { position: "absolute", top: 18, right: -20, opacity: 0.18 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.78)" },
  title: { fontSize: 36, fontWeight: "800", letterSpacing: -1.4, lineHeight: 42, color: "#fff", marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  stats: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  stat: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6, color: "#fff", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.78)" },
  cta: {
    marginTop: 20,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#1D4ED8", letterSpacing: -0.2 },
});
