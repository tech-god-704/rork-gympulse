import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
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
  /** "lg" uses bigger label type for the two-column library grid. */
  size?: "md" | "lg";
}

/** Tall 9:16 video tile used by the Today strip and the Exercise Library grid. */
export default function DemoTile({ slug, width, height, showLabel = true, size = "md" }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getBySlug } = useExerciseLibrary();
  const demo = getBySlug(slug);
  const media = useExerciseVideo(slug);
  if (!demo) return null;

  const accent = muscleColor(demo.muscleGroup, colors);

  return (
    <PressableScale
      onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug } })}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${demo.name} form demo`}
      style={[styles.tile, { width, height }]}
    >
      {media?.thumbnailUrl ? (
        <Image source={{ uri: media.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}
      <LinearGradient
        colors={["rgba(0,0,0,0.28)", "transparent", tint(accent, 0.3), "rgba(0,0,0,0.86)"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.timecode}>
        <Text style={styles.timecodeText}>0:08</Text>
      </View>
      <View style={styles.play}>
        <Play size={11} color="#fff" fill="#fff" />
      </View>
      {showLabel && (
        <View style={styles.label}>
          <Text style={[styles.name, size === "lg" && styles.nameLg]} numberOfLines={2}>{demo.name}</Text>
          <View style={styles.muscleRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={styles.muscle} numberOfLines={1}>{size === "lg" ? demo.targetArea || MUSCLE_GROUP_LABELS[demo.muscleGroup] : MUSCLE_GROUP_LABELS[demo.muscleGroup]}</Text>
          </View>
        </View>
      )}
    </PressableScale>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    tile: { borderRadius: 22, overflow: "hidden", backgroundColor: colors.thumb },
    timecode: { position: "absolute", top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.5)" },
    timecodeText: { fontSize: 10, fontWeight: "800", color: "#fff", fontVariant: ["tabular-nums"] },
    play: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.24)",
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 1,
    },
    label: { position: "absolute", left: 12, right: 12, bottom: 12, gap: 4 },
    name: { fontSize: 14, fontWeight: "800", color: "#fff", lineHeight: 17, letterSpacing: -0.3 },
    nameLg: { fontSize: 17, lineHeight: 21, letterSpacing: -0.4 },
    muscleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    muscle: { flex: 1, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.82)" },
  });
