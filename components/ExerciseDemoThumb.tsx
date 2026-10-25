import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Play, Film } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { findLibraryExerciseByName, getLibraryExercise } from "@/mocks/exerciseLibrary";
import { useExerciseVideo } from "@/hooks/useExerciseVideos";

interface Props {
  /** Pass either a library slug or an exercise name as it appears in a routine. */
  slug?: string;
  exerciseName?: string;
  width?: number;
  height?: number;
}

/** Tappable 9:16 thumbnail that opens the form guide. Renders nothing when the exercise has no demo. */
export default function ExerciseDemoThumb({ slug, exerciseName, width = 40, height = 56 }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const demo = useMemo(
    () => (slug ? getLibraryExercise(slug) : exerciseName ? findLibraryExerciseByName(exerciseName) : undefined),
    [slug, exerciseName]
  );
  const media = useExerciseVideo(demo?.slug);

  if (!demo) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug: demo.slug } })}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${demo.name} form demo`}
      style={[styles.frame, { width, height }]}
    >
      {media?.thumbnailUrl ? (
        <Image source={{ uri: media.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Film size={16} color={colors.textTertiary} />
      )}
      <View style={styles.play}>
        <Play size={10} color="#fff" fill="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    frame: {
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    play: {
      position: "absolute",
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
