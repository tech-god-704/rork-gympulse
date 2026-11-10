import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, Repeat, Wind, Target, Dumbbell } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { MUSCLE_GROUP_LABELS } from "@/types";
import { card, muscleColor } from "@/constants/theme";
import ExerciseDemoVideo from "@/components/ExerciseDemoVideo";

const VIDEO_HEIGHT = 470;
const OVERLAP = 34;

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
        <PressableScale onPress={() => router.back()} style={styles.closeFallback}>
          <Text style={styles.closeFallbackText}>Close</Text>
        </PressableScale>
      </View>
    );
  }

  const accent = muscleColor(exercise.muscleGroup, colors);
  const steps: { title: string; items: string[]; tone: "neutral" | "primary" | "error" }[] = [
    { title: "Setup", items: exercise.setup, tone: "neutral" },
    { title: "How to do it", items: exercise.cues, tone: "primary" },
    { title: "Avoid", items: exercise.commonMistakes, tone: "error" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.videoWrap}>
          <ExerciseDemoVideo slug={exercise.slug} height={VIDEO_HEIGHT} borderRadius={0} />
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.topShade} pointerEvents="none" />
          <View style={[styles.loopChip, { top: insets.top + 20 }]}>
            <Repeat size={12} color="#fff" strokeWidth={2.6} />
            <Text style={styles.loopText}>Loop · 0:08</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.headBlock}>
            <View style={styles.musclePill}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text style={styles.muscleText}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Text>
            </View>
            <Text style={styles.name}>{exercise.name}</Text>
          </View>

          <View style={styles.facts}>
            {exercise.targetArea ? (
              <View style={styles.fact}>
                <View style={styles.factIcon}>
                  <Target size={17} color={colors.primaryText} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.factLabel}>Targets</Text>
                  <Text style={styles.factValue}>{exercise.targetArea}</Text>
                </View>
              </View>
            ) : null}
            {exercise.equipment ? (
              <View style={[styles.fact, exercise.targetArea ? styles.factBorder : undefined]}>
                <View style={styles.factIcon}>
                  <Dumbbell size={17} color={colors.primaryText} strokeWidth={2.4} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.factLabel}>Equipment</Text>
                  <Text style={styles.factValue}>{exercise.equipment}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {steps.map(
            (step, si) =>
              step.items.length > 0 && (
                <FadeIn key={step.title} delay={si * 70} style={styles.card}>
                  <Text style={styles.cardTitle}>{step.title}</Text>
                  {step.items.map((item, i) => (
                    <View key={item} style={styles.row}>
                      <View
                        style={[
                          styles.num,
                          {
                            backgroundColor:
                              step.tone === "primary" ? colors.primaryFill : step.tone === "error" ? colors.errorLight : colors.fill,
                          },
                        ]}
                      >
                        {step.tone === "error" ? (
                          <X size={13} color={colors.error} strokeWidth={3} />
                        ) : (
                          <Text style={[styles.numText, { color: step.tone === "primary" ? "#fff" : colors.text }]}>{i + 1}</Text>
                        )}
                      </View>
                      <Text style={styles.body}>{item}</Text>
                    </View>
                  ))}
                </FadeIn>
              ),
          )}

          {exercise.breathing ? (
            <View style={styles.breathing}>
              <View style={styles.breathIcon}>
                <Wind size={20} color={colors.primaryText} />
              </View>
              <View style={styles.breathText}>
                <Text style={styles.cardTitle}>Breathing</Text>
                <Text style={styles.body}>{exercise.breathing}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PressableScale
        onPress={() => router.back()}
        style={[styles.close, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Close form guide"
      >
        <X size={20} color="#fff" strokeWidth={2.6} />
      </PressableScale>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    center: { alignItems: "center", justifyContent: "center", gap: 16 },
    videoWrap: { height: VIDEO_HEIGHT, backgroundColor: colors.thumb },
    topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 130 },
    close: {
      position: "absolute",
      left: 16,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    loopChip: {
      position: "absolute",
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    loopText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: "#fff" },
    sheet: {
      marginTop: -OVERLAP,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 14,
    },
    headBlock: { gap: 10 },
    musclePill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 6,
      paddingLeft: 10,
      paddingRight: 13,
      borderRadius: 999,
      backgroundColor: colors.fill,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    muscleText: { fontSize: 13, fontWeight: "800", color: colors.text },
    name: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, lineHeight: 39, color: colors.text },
    facts: { ...card(colors, 24), paddingHorizontal: 16, paddingVertical: 4 },
    fact: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
    factBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    factIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    factLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, textTransform: "uppercase", color: colors.textTertiary },
    factValue: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 1 },
    card: { ...card(colors, 24), padding: 18, gap: 14 },
    cardTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    num: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    numText: { fontSize: 12, fontWeight: "800" },
    body: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 23, color: colors.textSecondary },
    breathing: { flexDirection: "row", gap: 14, alignItems: "flex-start", padding: 18, borderRadius: 24, backgroundColor: colors.primaryTint },
    breathIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.cardBackground, alignItems: "center", justifyContent: "center" },
    breathText: { flex: 1, gap: 4 },
    closeFallback: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primaryFill },
    closeFallbackText: { color: "#fff", fontWeight: "700" },
  });
