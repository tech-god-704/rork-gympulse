import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Image } from "expo-image";
import { Film } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useExerciseVideo } from "@/hooks/useExerciseVideos";

interface Props {
  slug: string;
  /** Height of the player; width fills the parent. Clips are 9:16. */
  height: number;
  borderRadius?: number;
}

export default function ExerciseDemoVideo({ slug, height, borderRadius = 12 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const media = useExerciseVideo(slug);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const frame = [styles.frame, { height, borderRadius }];

  if (!media?.videoUrl || failed) {
    return (
      <View style={[frame, styles.placeholder]}>
        {media?.thumbnailUrl ? (
          <Image source={{ uri: media.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <Film size={28} color={colors.textTertiary} />
            <Text style={styles.placeholderText}>Demo video coming soon</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={frame}>
      <Video
        source={{ uri: media.videoUrl }}
        posterSource={media.thumbnailUrl ? { uri: media.thumbnailUrl } : undefined}
        usePoster={!!media.thumbnailUrl}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onReadyForDisplay={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded && !media.thumbnailUrl && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.white} />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    frame: {
      width: "100%",
      overflow: "hidden",
      backgroundColor: colors.black,
    },
    placeholder: {
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    placeholderText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textTertiary,
    },
    loading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
  });
