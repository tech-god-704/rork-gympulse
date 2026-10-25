import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { PlayCircle, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import ExerciseDemoThumb from "@/components/ExerciseDemoThumb";

/** Home-screen card: a scrollable row of demo thumbnails plus a link to the full library. */
export default function ExerciseDemoStrip() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises } = useExerciseLibrary();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.head}
        onPress={() => router.push("/exercise")}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Open the exercise library"
      >
        <PlayCircle size={18} color={colors.primary} />
        <View style={styles.headText}>
          <Text style={styles.title}>Form demos</Text>
          <Text style={styles.subtitle}>{exercises.length} exercises · tap to watch</Text>
        </View>
        <Text style={styles.seeAll}>See all</Text>
        <ChevronRight size={16} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {exercises.map((ex) => (
          <View key={ex.slug} style={styles.item}>
            <ExerciseDemoThumb slug={ex.slug} width={72} height={104} />
            <Text style={styles.name} numberOfLines={2}>{ex.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingVertical: 14,
      gap: 12,
    },
    head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
    headText: { flex: 1 },
    title: { fontSize: 16, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
    seeAll: { fontSize: 13, fontWeight: "700", color: colors.primary },
    row: { paddingHorizontal: 14, gap: 10 },
    item: { width: 72, gap: 6 },
    name: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, lineHeight: 14 },
  });
