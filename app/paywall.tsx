import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { X, LayoutGrid, PlayCircle, TrendingUp, Dumbbell, type LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { glow, gradient } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { SubscriptionPlan } from "@/types";
import { WORKOUT_SPLITS } from "@/mocks/exercises";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";

interface PlanOption {
  key: SubscriptionPlan;
  label: string;
  price: string;
  sub: string;
  badge?: string;
}

const PLANS: PlanOption[] = [
  { key: "yearly", label: "Annual", price: "$49.99", sub: "$0.96 / week · 7-day free trial", badge: "Best value · Save 58%" },
  { key: "monthly", label: "Monthly", price: "$9.99", sub: "Billed monthly · 7-day free trial" },
  { key: "lifetime", label: "Lifetime", price: "$99.99", sub: "Pay once, yours forever" },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { subscribeToPlan, dismissPaywall } = useGym();
  const { exercises } = useExerciseLibrary();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);

  const features: { title: string; desc: string; Icon: LucideIcon }[] = [
    { title: "Every workout split", desc: `All ${WORKOUT_SPLITS.length} programs, added in one tap`, Icon: LayoutGrid },
    { title: "Full form-guide library", desc: `All ${exercises.length} demos with setup, cues and fixes`, Icon: PlayCircle },
    { title: "Advanced progress", desc: "Per-exercise overload trends and full history", Icon: TrendingUp },
    { title: "Unlimited routines", desc: "Build and schedule as many as you like", Icon: Dumbbell },
  ];

  const lifetime = selectedPlan === "lifetime";
  const plan = PLANS.find((p) => p.key === selectedPlan)!;

  const handleSubscribe = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    // Simulated purchase flow — replace with actual IAP logic
    setTimeout(() => {
      subscribeToPlan(selectedPlan);
      setIsProcessing(false);
      router.back();
    }, 1500);
  };

  const handleDismiss = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissPaywall();
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false} bounces={false}>
        <LinearGradient colors={["#0B1220", "#1E3A8A", "#4F46E5"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 22 }]}>
          <Svg width={260} height={90} viewBox="0 0 260 90" style={styles.heroPulse} pointerEvents="none">
            <Path d="M0 45h80l10-20 14 42 14-50 12 44 9-16h121" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <TouchableOpacity
            style={[styles.close, { top: insets.top + 12 }]}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close and continue without Pro"
          >
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <View style={styles.titleRow}>
              <Text style={styles.heroTitle}>
                Gym<Text style={{ color: "#60A5FA" }}>Pulse</Text>
              </Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.heroSub}>Train smarter with every tool unlocked.</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.features}>
            {features.map(({ title, desc, Icon }) => (
              <View key={title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon size={20} color={colors.primaryText} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.featureTitle}>{title}</Text>
                  <Text style={styles.featureDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.plans} accessibilityRole="radiogroup">
            {PLANS.map((p) => {
              const on = selectedPlan === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.plan, on && { borderColor: colors.primary, backgroundColor: colors.primaryTint }]}
                  onPress={() => {
                    setSelectedPlan(p.key);
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label}, ${p.price}. ${p.sub}`}
                >
                  <View style={[styles.radio, { borderColor: on ? colors.primary : colors.fillStrong }]}>
                    {on && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.planName}>{p.label}</Text>
                    <Text style={styles.planSub}>{p.sub}</Text>
                  </View>
                  <Text style={styles.planPrice}>{p.price}</Text>
                  {p.badge && (
                    <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                      <Text style={styles.badgeText}>{p.badge}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.note}>{lifetime ? "One payment. Yours forever." : "7-day free trial, cancel anytime."}</Text>

          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={isProcessing}
            activeOpacity={0.85}
            style={[styles.ctaWrap, glow("#2563EB", colors, 0.3), isProcessing && styles.processing]}
            accessibilityRole="button"
            accessibilityState={{ busy: isProcessing }}
            accessibilityLabel={lifetime ? `Buy Lifetime for ${plan.price}` : `Start free trial, then ${plan.price}`}
          >
            <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>{isProcessing ? "Processing…" : lifetime ? `Buy Lifetime · ${plan.price}` : "Start Free Trial"}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} style={styles.later} accessibilityRole="button">
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    hero: { paddingHorizontal: 22, paddingBottom: 26, overflow: "hidden" },
    heroPulse: { position: "absolute", right: -40, bottom: 4 },
    close: {
      position: "absolute",
      right: 12,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    heroText: { gap: 6, paddingTop: 8 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    heroTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, lineHeight: 38, color: "#fff" },
    proBadge: { backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    proBadgeText: { fontSize: 14, fontWeight: "800", letterSpacing: 1, color: "#1D4ED8" },
    heroSub: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.84)" },
    body: { paddingTop: 18, paddingHorizontal: 20, gap: 14 },
    features: { gap: 12 },
    feature: { flexDirection: "row", alignItems: "center", gap: 12 },
    featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    featureTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    featureDesc: { fontSize: 13, fontWeight: "500", color: colors.textTertiary, marginTop: 1 },
    plans: { gap: 10, paddingTop: 12 },
    plan: {
      minHeight: 70,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.separator,
      backgroundColor: colors.cardBackground,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    planName: { fontSize: 16, fontWeight: "800", color: colors.text },
    planSub: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 2 },
    planPrice: { fontSize: 17, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    badge: { position: "absolute", top: -11, right: 14, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: "#fff" },
    note: { textAlign: "center", fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    ctaWrap: { borderRadius: 18 },
    processing: { opacity: 0.7 },
    cta: { height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    later: { height: 44, alignItems: "center", justifyContent: "center" },
    laterText: { fontSize: 14, fontWeight: "700", color: colors.textTertiary },
  });
