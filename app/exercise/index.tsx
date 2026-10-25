import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X, ChevronRight, Film } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { type LibraryExercise } from "@/mocks/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/types";

const GROUP_ORDER: MuscleGroup[] = ["chest", "shoulders", "arms", "back", "legs", "core"];

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises, videos } = useExerciseLibrary();

  const groups = useMemo(() => {
    const byGroup = new Map<MuscleGroup, LibraryExercise[]>();
    for (const ex of exercises) {
      byGroup.set(ex.muscleGroup, [...(byGroup.get(ex.muscleGroup) ?? []), ex]);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [exercises]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Exercise Library</Text>
          <Text style={styles.subtitle}>{exercises.length} exercises with form demos</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityLabel="Close exercise library"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {groups.map(({ group, items }) => (
          <View key={group} style={styles.section}>
            <Text style={styles.sectionTitle}>{MUSCLE_GROUP_LABELS[group]}</Text>
            <View style={styles.card}>
              {items.map((ex, i) => {
                const thumb = videos[ex.slug]?.thumbnailUrl;
                return (
                  <TouchableOpacity
                    key={ex.slug}
                    style={[styles.row, i > 0 && styles.rowDivider]}
                    onPress={() => router.push({ pathname: "/exercise/[slug]", params: { slug: ex.slug } })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${ex.name} form guide`}
                  >
                    <View style={styles.thumbWrap}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={150} />
                      ) : (
                        <Film size={18} color={colors.textTertiary} />
                      )}
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={1}>{ex.name}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{ex.targetArea}</Text>
                    </View>
                    <ChevronRight size={17} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    scroll: { paddingHorizontal: 18, gap: 18 },
    section: { gap: 8 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder },
    thumbWrap: {
      width: 44,
      height: 64,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumb: { width: "100%", height: "100%" },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: "700", color: colors.text },
    meta: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
  });
