import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, LayoutGrid, PlayCircle, TrendingUp, Dumbbell, Check, type LucideIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card, glow, gradient } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { SubscriptionPlan } from "@/types";
import { WORKOUT_SPLITS } from "@/mocks/exercises";
import { useExerciseLibrary } from "@/hooks/useExerciseVideos";
import { haptic } from "@/utils/haptics";

interface PlanOption {
  key: SubscriptionPlan;
  label: string;
  price: string;
  per: string;
  sub: string;
  badge?: string;
}

const PLANS: PlanOption[] = [
  { key: "yearly", label: "Annual", price: "$49.99", per: "/ year", sub: "$0.96 a week · 7 days free", badge: "Best value · Save 58%" },
  { key: "monthly", label: "Monthly", price: "$9.99", per: "/ month", sub: "7 days free, then billed monthly" },
  { key: "lifetime", label: "Lifetime", price: "$99.99", per: "once", sub: "Pay once, yours forever" },
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
    haptic.medium();
    setIsProcessing(true);
    // Simulated purchase flow — replace with actual IAP logic
    setTimeout(() => {
      subscribeToPlan(selectedPlan);
      setIsProcessing(false);
      router.back();
    }, 1500);
  };

  const handleDismiss = () => {
    haptic.light();
    dismissPaywall();
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 26 }]}>
          <HeroBackdrop tone="ink" />
          <View style={styles.titleRow}>
            <Text style={styles.heroTitle}>
              Gym<Text style={{ color: "#7FB2FF" }}>Pulse</Text>
            </Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.heroSub}>Train smarter with every tool unlocked.</Text>

          <View style={styles.features}>
            {features.map(({ title, desc, Icon }, i) => (
              <FadeIn key={title} delay={80 + i * 60} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon size={19} color="#fff" strokeWidth={2.3} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.featureTitle}>{title}</Text>
                  <Text style={styles.featureDesc}>{desc}</Text>
                </View>
              </FadeIn>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.plans} accessibilityRole="radiogroup">
            {PLANS.map((p) => {
              const on = selectedPlan === p.key;
              return (
                <PressableScale
                  key={p.key}
                  style={[styles.plan, on && styles.planOn]}
                  scaleTo={0.98}
                  haptic="select"
                  onPress={() => setSelectedPlan(p.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label}, ${p.price} ${p.per}. ${p.sub}`}
                >
                  <View style={[styles.radio, on ? { borderColor: colors.primaryFill, backgroundColor: colors.primaryFill } : { borderColor: colors.fillStrong }]}>
                    {on && <Check size={13} color="#fff" strokeWidth={3.4} />}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.planName}>{p.label}</Text>
                    <Text style={styles.planSub}>{p.sub}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.planPrice}>{p.price}</Text>
                    <Text style={styles.planPer}>{p.per}</Text>
                  </View>
                  {p.badge && (
                    <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                      <Text style={styles.badgeText}>{p.badge}</Text>
                    </LinearGradient>
                  )}
                </PressableScale>
              );
            })}
          </View>

          <PressableScale
            onPress={handleSubscribe}
            disabled={isProcessing}
            style={[styles.ctaWrap, glow("#2563EB", colors, 0.32)]}
            accessibilityRole="button"
            accessibilityState={{ busy: isProcessing }}
            accessibilityLabel={lifetime ? `Buy Lifetime for ${plan.price}` : `Start free trial, then ${plan.price} ${plan.per}`}
            testID="paywall-cta"
          >
            <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>{isProcessing ? "Processing…" : lifetime ? `Buy Lifetime · ${plan.price}` : "Start 7-day free trial"}</Text>
            </LinearGradient>
          </PressableScale>
          <Text style={styles.note}>
            {lifetime ? "One payment. No subscription." : `Then ${plan.price} ${plan.per}. Cancel anytime before the trial ends.`}
          </Text>

          <Pressable onPress={handleDismiss} style={styles.later} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.laterText}>Not now</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PressableScale
        style={[styles.close, { top: insets.top + 12 }]}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close and continue without Pro"
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
    hero: { paddingHorizontal: 24, paddingBottom: 30, gap: 6, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
    close: {
      position: "absolute",
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    heroTitle: { fontSize: 38, fontWeight: "800", letterSpacing: -1.6, lineHeight: 44, color: "#fff" },
    proBadge: { backgroundColor: "#fff", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
    proBadgeText: { fontSize: 14, fontWeight: "800", letterSpacing: 1.2, color: "#1D4ED8" },
    heroSub: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
    features: { gap: 14, marginTop: 20 },
    feature: { flexDirection: "row", alignItems: "center", gap: 13 },
    featureIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
    featureTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2, color: "#fff" },
    featureDesc: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.72)", marginTop: 1 },
    body: { paddingTop: 26, paddingHorizontal: 20, gap: 12 },
    plans: { gap: 10, marginBottom: 6 },
    plan: {
      ...card(colors, 22),
      minHeight: 74,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },
    planOn: { borderColor: colors.primaryFill, backgroundColor: colors.scheme === "dark" ? "#152038" : "#EEF4FF" },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    planName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
    planSub: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginTop: 2 },
    priceCol: { alignItems: "flex-end" },
    planPrice: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text, fontVariant: ["tabular-nums"] },
    planPer: { fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    badge: { position: "absolute", top: -11, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase", color: "#fff" },
    ctaWrap: { borderRadius: 20 },
    cta: { height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    note: { textAlign: "center", fontSize: 13, fontWeight: "500", color: colors.textTertiary },
    later: { height: 44, alignItems: "center", justifyContent: "center" },
    laterText: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
  });
