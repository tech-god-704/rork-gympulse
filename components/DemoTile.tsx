import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Play } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { MUSCLE_GROUP_LABELS } from "@/types";
import { muscleColor, tint } from "@/constants/theme";
import { useExerciseLibrary, useExerciseVideo } from "@/hooks/useExerciseVideos";

interface Props {
  slug: string;
  width: number;
  height: number;
  /** Show the name and muscle label over the bottom of the tile. */
  showLabel?: boolean;
}

/** Tall 9:16 video tile used by the Today strip and the Exercise Library grid. */
export default function DemoTile({ slug, width, height, showLabel = true }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getBySlug } = useExerciseLibrary();
  const demo = getBySlug(slug);
  const media = useExerciseVideo(slug);
  if (!demo) return null;

  const accent = muscleColor(demo.muscleGroup, colors);

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug } })}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${demo.name} form demo`}
      style={[styles.tile, { width, height }]}
    >
      {media?.thumbnailUrl ? (
        <Image source={{ uri: media.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}
      <LinearGradient
        colors={["transparent", tint(accent, 0.35), "rgba(0,0,0,0.78)"]}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.timecode}>
        <Text style={styles.timecodeText}>0:08</Text>
      </View>
      <View style={styles.play}>
        <Play size={16} color="#fff" fill="#fff" />
      </View>
      {showLabel && (
        <View style={styles.label}>
          <Text style={styles.name} numberOfLines={2}>{demo.name}</Text>
          <View style={styles.muscleRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={styles.muscle}>{MUSCLE_GROUP_LABELS[demo.muscleGroup]}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    tile: {
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.thumb,
      justifyContent: "center",
      alignItems: "center",
    },
    timecode: {
      position: "absolute",
      top: 10,
      left: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    timecodeText: { fontSize: 10, fontWeight: "700", color: "#fff", fontVariant: ["tabular-nums"] },
    play: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    label: { position: "absolute", left: 10, right: 10, bottom: 10, gap: 3 },
    name: { fontSize: 13, fontWeight: "800", color: "#fff", lineHeight: 16, letterSpacing: -0.2 },
    muscleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    muscle: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  });
