import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Search, X, SearchX } from "lucide-react-native";
import { Text, TextInput } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { type LibraryExercise } from "@/mocks/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { muscleColor } from "@/constants/theme";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/types";
import DemoTile from "@/components/DemoTile";

const GROUP_ORDER: MuscleGroup[] = ["chest", "shoulders", "arms", "back", "legs", "core", "cardio"];
const GUTTER = 20;
const GAP = 12;

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises } = useExerciseLibrary();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");

  const tileWidth = Math.floor((width - GUTTER * 2 - GAP) / 2);
  const tileHeight = Math.round(tileWidth * 1.4);

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
      <View style={styles.top}>
        <PressableScale onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.6} />
        </PressableScale>
        <View style={styles.search}>
          <Search size={18} color={colors.textTertiary} strokeWidth={2.4} />
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
            <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
              <X size={17} color={colors.textTertiary} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View>
          <Text style={styles.title}>Exercise library</Text>
          <Text style={styles.subtitle}>{exercises.length} form demos · 8-second loops</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {(["all", ...available] as const).map((g) => {
            const on = group === g;
            return (
              <PressableScale
                key={g}
                onPress={() => setGroup(g)}
                haptic="select"
                style={[styles.chip, on && { backgroundColor: colors.text }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {g !== "all" && <View style={[styles.chipDot, { backgroundColor: muscleColor(g, colors) }]} />}
                <Text style={[styles.chipText, on && { color: colors.background }]}>{g === "all" ? "All" : MUSCLE_GROUP_LABELS[g]}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {sections.map(({ group: g, items }) => (
          <View key={g} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionDot, { backgroundColor: muscleColor(g, colors) }]} />
              <Text style={styles.sectionTitle}>{MUSCLE_GROUP_LABELS[g]}</Text>
              <Text style={styles.count}>{items.length}</Text>
            </View>
            <View style={styles.grid}>
              {items.map((ex) => (
                <DemoTile key={ex.slug} slug={ex.slug} width={tileWidth} height={tileHeight} size="lg" />
              ))}
            </View>
          </View>
        ))}

        {sections.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <SearchX size={24} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyBody}>Nothing matches “{query.trim()}”. Try a muscle group or a shorter name.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    top: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 10 },
    back: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    search: { flex: 1, height: 46, borderRadius: 23, backgroundColor: colors.fill, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16 },
    searchInput: { flex: 1, height: "100%", fontSize: 15, fontWeight: "600", color: colors.text },
    scroll: { paddingHorizontal: GUTTER, paddingTop: 8, gap: 18 },
    title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, lineHeight: 40, color: colors.text },
    subtitle: { fontSize: 14, fontWeight: "600", color: colors.textTertiary, marginTop: 3 },
    bleed: { marginHorizontal: -GUTTER, flexGrow: 0 },
    chips: { gap: 8, paddingHorizontal: GUTTER },
    chip: { flexDirection: "row", alignItems: "center", gap: 7, height: 40, paddingHorizontal: 15, borderRadius: 999, backgroundColor: colors.fill },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText: { fontSize: 14, fontWeight: "700", color: colors.text },
    section: { gap: 12 },
    sectionHead: { flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 4 },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    count: { fontSize: 15, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
    empty: { alignItems: "center", gap: 6, paddingVertical: 48 },
    emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    emptyBody: { fontSize: 14, fontWeight: "500", lineHeight: 20, color: colors.textTertiary, textAlign: "center", maxWidth: 260 },
  });
