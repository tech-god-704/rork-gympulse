import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, CheckCircle2, AlertTriangle, Wind, Wrench } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { MUSCLE_GROUP_LABELS } from "@/types";
import ExerciseDemoVideo from "@/components/ExerciseDemoVideo";

export default function ExerciseGuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getBySlug } = useExerciseLibrary();
  const exercise = getBySlug(slug);

  // 9:16 clip, capped so the coaching text is still visible without scrolling far.
  const videoHeight = Math.min((width - 36) * (16 / 9), 460);

  if (!exercise) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.sectionText}>Exercise not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
          <Text style={styles.doneText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = [
    { title: "Setup", icon: <Wrench size={16} color={colors.primary} />, items: exercise.setup, numbered: true },
    { title: "How to do it", icon: <CheckCircle2 size={16} color={colors.emerald} />, items: exercise.cues, numbered: true },
    { title: "Avoid", icon: <AlertTriangle size={16} color={colors.amber} />, items: exercise.commonMistakes, numbered: false },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{exercise.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {exercise.equipment}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityLabel="Close form guide"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <ExerciseDemoVideo slug={exercise.slug} height={videoHeight} borderRadius={14} />

        <Text style={styles.target}>Targets: {exercise.targetArea}</Text>

        {sections.map((s) => (
          <View key={s.title} style={styles.card}>
            <View style={styles.cardHeader}>
              {s.icon}
              <Text style={styles.cardTitle}>{s.title}</Text>
            </View>
            {s.items.map((item, i) => (
              <View key={item} style={styles.row}>
                <Text style={styles.bullet}>{s.numbered ? `${i + 1}.` : "•"}</Text>
                <Text style={styles.sectionText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wind size={16} color={colors.cyan} />
            <Text style={styles.cardTitle}>Breathing</Text>
          </View>
          <Text style={styles.sectionText}>{exercise.breathing}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", gap: 16 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 12,
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { paddingHorizontal: 18, gap: 12 },
    target: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      gap: 8,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    row: { flexDirection: "row", gap: 8 },
    bullet: { fontSize: 14, fontWeight: "700", color: colors.textTertiary, width: 18 },
    sectionText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    doneButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    doneText: { color: colors.white, fontWeight: "700" },
  });
