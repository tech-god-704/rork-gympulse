import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, Repeat, Wind } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { MUSCLE_GROUP_LABELS } from "@/types";
import { elevation, muscleColor } from "@/constants/theme";
import ExerciseDemoVideo from "@/components/ExerciseDemoVideo";

const VIDEO_HEIGHT = 440;

export default function ExerciseGuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getBySlug } = useExerciseLibrary();
  const exercise = getBySlug(slug);

  if (!exercise) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.body}>Exercise not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeFallback}>
          <Text style={styles.closeFallbackText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accent = muscleColor(exercise.muscleGroup, colors);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.videoWrap}>
          <ExerciseDemoVideo slug={exercise.slug} height={VIDEO_HEIGHT} borderRadius={0} />
          <LinearGradient colors={["rgba(0,0,0,0.35)", "transparent"]} style={styles.topShade} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.close, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Close form guide"
          >
            <X size={18} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.loopChip, { top: insets.top + 18 }]}>
            <Repeat size={12} color="#fff" />
            <Text style={styles.loopText}>Loop · 0:08</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headBlock}>
            <View style={styles.metaRow}>
              <View style={styles.musclePill}>
                <View style={[styles.dot, { backgroundColor: accent }]} />
                <Text style={styles.muscleText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
              </View>
              <Text style={styles.equipment}>{exercise.equipment}</Text>
            </View>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.targets}>
              <Text style={styles.targetsLabel}>TARGETS  </Text>
              {exercise.targetArea}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Setup</Text>
            {exercise.setup.map((item, i) => (
              <View key={item} style={styles.row}>
                <View style={[styles.num, { backgroundColor: colors.fill }]}>
                  <Text style={[styles.numText, { color: colors.text }]}>{i + 1}</Text>
                </View>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to do it</Text>
            {exercise.cues.map((item, i) => (
              <View key={item} style={styles.row}>
                <View style={[styles.num, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.numText, { color: "#fff" }]}>{i + 1}</Text>
                </View>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Avoid</Text>
            {exercise.commonMistakes.map((item) => (
              <View key={item} style={styles.row}>
                <View style={[styles.num, { backgroundColor: colors.errorLight }]}>
                  <X size={12} color={colors.error} strokeWidth={3} />
                </View>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.breathing}>
            <View style={styles.breathIcon}>
              <Wind size={20} color={colors.primaryText} />
            </View>
            <View style={styles.breathText}>
              <Text style={styles.cardTitle}>Breathing</Text>
              <Text style={styles.body}>{exercise.breathing}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", gap: 16 },
    videoWrap: { height: VIDEO_HEIGHT, backgroundColor: colors.thumb },
    topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
    close: {
      position: "absolute",
      left: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    loopChip: {
      position: "absolute",
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    loopText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: "#fff" },
    content: { padding: 20, gap: 14 },
    headBlock: { gap: 8 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    musclePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingLeft: 8,
      paddingRight: 10,
      borderRadius: 999,
      backgroundColor: colors.fill,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    muscleText: { fontSize: 13, fontWeight: "700", color: colors.text },
    equipment: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    name: { fontSize: 30, fontWeight: "800", letterSpacing: -1.1, lineHeight: 36, color: colors.text },
    targets: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    targetsLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.primaryText },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      padding: 16,
      gap: 12,
      ...elevation(1, colors),
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    num: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    numText: { fontSize: 12, fontWeight: "800" },
    body: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 22, color: colors.textSecondary },
    breathing: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 20, backgroundColor: colors.primaryTint },
    breathIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardBackground, alignItems: "center", justifyContent: "center" },
    breathText: { flex: 1, gap: 3 },
    closeFallback: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary },
    closeFallbackText: { color: "#fff", fontWeight: "700" },
  });
