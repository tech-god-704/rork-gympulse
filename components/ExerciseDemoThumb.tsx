import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Play, Dumbbell } from "lucide-react-native";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/providers/ThemeProvider";
import { muscleColor, tint } from "@/constants/theme";
import { MuscleGroup } from "@/types";
import { useExerciseLibrary, useExerciseVideo } from "@/hooks/useExerciseVideos";

interface Props {
  /** Pass either a library slug or an exercise name as it appears in a routine. */
  slug?: string;
  exerciseName?: string;
  width?: number;
  height?: number;
  radius?: number;
  /** Tint for the fallback tile when the exercise has no demo. */
  muscleGroup?: MuscleGroup;
  /** Set false to show the image without making it a button. */
  interactive?: boolean;
}

/**
 * 9:16 exercise thumbnail. Opens the form guide when the exercise has a demo;
 * otherwise it's a quiet muscle-tinted tile so rows still line up.
 */
export default function ExerciseDemoThumb({ slug, exerciseName, width = 44, height = 60, radius = 12, muscleGroup, interactive = true }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { getBySlug, findByName } = useExerciseLibrary();
  const demo = slug ? getBySlug(slug) : exerciseName ? findByName(exerciseName) : undefined;
  const media = useExerciseVideo(demo?.slug);
  const frame = { width, height, borderRadius: radius };

  if (!demo) {
    const accent = muscleColor(muscleGroup ?? "core", colors);
    return (
      <View style={[styles.frame, frame, { backgroundColor: tint(accent, colors.scheme === "dark" ? 0.16 : 0.12) }]}>
        <Dumbbell size={Math.min(width * 0.42, 20)} color={accent} />
      </View>
    );
  }

  const image = media?.thumbnailUrl ? (
    <Image source={{ uri: media.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
  ) : null;

  if (!interactive) {
    return <View style={[styles.frame, frame, { backgroundColor: colors.thumb }]}>{image}</View>;
  }

  return (
    <PressableScale
      onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } })}
      scaleTo={0.92}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${demo.name} form demo`}
      style={[styles.frame, frame, { backgroundColor: colors.thumb }]}
    >
      {image}
      <View style={styles.play}>
        <Play size={8} color="#fff" fill="#fff" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  play: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 1,
  },
});
