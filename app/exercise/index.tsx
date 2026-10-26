import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Search, X } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { type LibraryExercise } from "@/mocks/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { muscleColor } from "@/constants/theme";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/types";
import DemoTile from "@/components/DemoTile";

const GROUP_ORDER: MuscleGroup[] = ["chest", "shoulders", "arms", "back", "legs", "core", "cardio"];
const GUTTER = 20;
const GAP = 10;

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises } = useExerciseLibrary();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");

  const tileWidth = Math.floor((width - GUTTER * 2 - GAP * 2) / 3);
  const tileHeight = Math.round((tileWidth * 16) / 9);

  const available = useMemo(() => GROUP_ORDER.filter((g) => exercises.some((e) => e.muscleGroup === g)), [exercises]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (e: LibraryExercise) =>
      (group === "all" || e.muscleGroup === group) &&
      (!q || e.name.toLowerCase().includes(q) || e.targetArea.toLowerCase().includes(q) || e.aliases.some((a) => a.toLowerCase().includes(q)));
    return available
      .map((g) => ({ group: g, items: exercises.filter((e) => e.muscleGroup === g && matches(e)) }))
      .filter((s) => s.items.length > 0);
  }, [exercises, available, query, group]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={24} color={colors.primaryText} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Exercise Library</Text>
          <Text style={styles.subtitle}>{exercises.length} form demos · 8-second loops</Text>
        </View>

        <View style={styles.search}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${exercises.length} exercises`}
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search exercises"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          {(["all", ...available] as const).map((g) => {
            const on = group === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGroup(g)}
                style={[styles.chip, on && { backgroundColor: colors.text, borderColor: colors.text }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {g !== "all" && <View style={[styles.chipDot, { backgroundColor: muscleColor(g, colors) }]} />}
                <Text style={[styles.chipText, on && { color: colors.background }]}>
                  {g === "all" ? "All" : MUSCLE_GROUP_LABELS[g]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {sections.map(({ group: g, items }) => (
          <View key={g} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionBar, { backgroundColor: muscleColor(g, colors) }]} />
              <Text style={styles.sectionTitle}>{MUSCLE_GROUP_LABELS[g]}</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{items.length}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {items.map((ex) => (
                <View key={ex.slug} style={{ width: tileWidth, gap: 6 }}>
                  <DemoTile slug={ex.slug} width={tileWidth} height={tileHeight} showLabel={false} />
                  <Text style={styles.itemName} numberOfLines={2}>{ex.name}</Text>
                  <Text style={styles.itemTargets} numberOfLines={2}>{ex.targetArea}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {sections.length === 0 && (
          <Text style={styles.empty}>No exercises match “{query}”.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: GUTTER, gap: 18 },
    back: { flexDirection: "row", alignItems: "center", height: 44, alignSelf: "flex-start", marginLeft: -6 },
    backText: { fontSize: 17, fontWeight: "600", color: colors.primaryText },
    title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.1, lineHeight: 38, color: colors.text },
    subtitle: { fontSize: 14, fontWeight: "600", color: colors.textTertiary, marginTop: 2 },
    search: {
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.fill,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
    },
    searchInput: { flex: 1, height: "100%", fontSize: 16, fontWeight: "600", color: colors.text },
    bleed: { marginHorizontal: -GUTTER },
    chips: { gap: 8, paddingHorizontal: GUTTER },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      height: 40,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.cardBackground,
    },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText: { fontSize: 14, fontWeight: "700", color: colors.text },
    section: { gap: 12 },
    sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
    sectionBar: { width: 4, height: 22, borderRadius: 2 },
    sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.fill },
    countText: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: 14 },
    itemName: { fontSize: 13, fontWeight: "700", lineHeight: 16, color: colors.text },
    itemTargets: { fontSize: 11, fontWeight: "500", lineHeight: 14, color: colors.textTertiary, marginTop: -3 },
    empty: { paddingVertical: 40, textAlign: "center", fontSize: 15, fontWeight: "600", color: colors.textTertiary },
  });
