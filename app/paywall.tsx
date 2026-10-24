import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check, Star, Shield, Zap, Crown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Layout, Radius, Space, Type, glow, numeric, statNumber, surface, tint } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { SubscriptionPlan, PREMIUM_FEATURES } from "@/types";

interface PlanOption {
  key: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  perWeek: string;
  savings?: string;
  popular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    key: "yearly",
    label: "Annual",
    price: "$49.99",
    period: "/year",
    perWeek: "$0.96/week",
    savings: "SAVE 58%",
    popular: true,
  },
  {
    key: "monthly",
    label: "Monthly",
    price: "$9.99",
    period: "/month",
    perWeek: "$2.31/week",
  },
  {
    key: "lifetime",
    label: "Lifetime",
    price: "$99.99",
    period: "one-time",
    perWeek: "Pay once, own forever",
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { subscribeToPlan, dismissPaywall } = useGym();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Pulse the CTA button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  const handleSubscribe = async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsProcessing(true);

    // Simulate purchase flow — replace with actual IAP logic
    setTimeout(() => {
      subscribeToPlan(selectedPlan);
      setIsProcessing(false);
      router.back();
    }, 1500);
  };

  const handleDismiss = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    dismissPaywall();
    router.back();
  };

  const selectedPlanData = PLANS.find((p) => p.key === selectedPlan)!;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close and continue without Pro"
      >
        <X size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={[colors.primary, colors.indigo, colors.violet]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Crown size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>
              Unlock{"\n"}
              <Text style={styles.heroTitleAccent}>GymPulse Pro</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Take your training to the next level with premium features designed for serious lifters.
            </Text>
          </View>

          {/* Social Proof */}
          <View style={styles.socialProof}>
            <View style={styles.socialProofStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} color={colors.amber} fill={colors.amber} />
              ))}
            </View>
            <Text style={styles.socialProofText}>
              Trusted by <Text style={styles.socialProofBold}>10,000+</Text> lifters
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureRow}>
                <View style={styles.featureIconBg}>
                  <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
                <Check size={16} color={colors.emerald} />
              </View>
            ))}
          </View>

          {/* Plan Selection */}
          <View style={styles.plansSection}>
            <Text style={styles.plansTitle}>Choose Your Plan</Text>
            <View style={styles.plansList}>
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                return (
                  <TouchableOpacity
                    key={plan.key}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      plan.popular && isSelected && styles.planCardPopular,
                    ]}
                    onPress={() => {
                      setSelectedPlan(plan.key);
                      if (Platform.OS !== "web") void Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${plan.label}, ${plan.price} ${plan.period}, ${plan.perWeek}`}
                  >
                    {plan.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                      </View>
                    )}
                    {plan.savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                      </View>
                    )}
                    <View style={styles.planHeader}>
                      <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                        {isSelected && <View style={styles.planRadioDot} />}
                      </View>
                      <View style={styles.planInfo}>
                        <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                          {plan.label}
                        </Text>
                        <Text style={styles.planPerWeek}>{plan.perWeek}</Text>
                      </View>
                      <View style={styles.planPriceCol}>
                        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                          {plan.price}
                        </Text>
                        <Text style={styles.planPeriod}>{plan.period}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Guarantee */}
          <View style={styles.guarantee}>
            <Shield size={16} color={colors.emerald} />
            <Text style={styles.guaranteeText}>
              7-day free trial. Cancel anytime. No commitment.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA Button */}
      <Animated.View
        style={[
          styles.ctaContainer,
          { paddingBottom: insets.bottom + 16, transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={isProcessing}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ busy: isProcessing }}
          accessibilityLabel={`Start free trial, then ${selectedPlanData.price} ${selectedPlanData.period}`}
        >
          <LinearGradient
            colors={[colors.primary, colors.indigo, colors.violet]}
            style={[styles.ctaButton, isProcessing && styles.ctaButtonProcessing]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Zap size={18} color="#fff" fill="#fff" />
            <Text style={styles.ctaText}>
              {isProcessing ? "Processing..." : `Start Free Trial — ${selectedPlanData.price}${selectedPlanData.period}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.skipLink}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
        >
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: "absolute",
      top: Space.sm,
      right: Space.md,
      zIndex: 10,
      width: Layout.touchTarget,
      height: Layout.touchTarget,
      borderRadius: Radius.sm,
      backgroundColor: colors.fill,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Space.xl,
      paddingTop: Space.xxl,
    },
    // ── Hero ──
    hero: {
      alignItems: "center",
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: 84,
      height: 84,
      borderRadius: Radius.xl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Space.lg,
      ...glow(colors.indigo, colors, 0.4),
    },
    heroTitle: {
      ...Type.hero,
      color: colors.text,
      textAlign: "center",
    },
    heroTitleAccent: {
      color: colors.primary,
    },
    heroSubtitle: {
      ...Type.body,
      color: colors.textTertiary,
      textAlign: "center",
      marginTop: Space.sm,
      lineHeight: 21,
      maxWidth: 320,
    },
    // ── Social proof ──
    socialProof: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Space.sm,
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
      borderRadius: Radius.pill,
      backgroundColor: colors.fill,
      alignSelf: "center",
      marginBottom: Space.xl,
    },
    socialProofStars: {
      flexDirection: "row",
      gap: 2,
    },
    socialProofText: {
      ...Type.footnote,
      color: colors.textSecondary,
    },
    socialProofBold: {
      fontWeight: "800",
      color: colors.text,
    },
    // ── Features ──
    featuresList: {
      gap: Space.sm,
      marginBottom: Space.xxl,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Space.md,
      paddingVertical: Space.md,
    },
    featureIconBg: {
      width: 42,
      height: 42,
      borderRadius: Radius.sm,
      backgroundColor: colors.fill,
      justifyContent: "center",
      alignItems: "center",
    },
    featureEmoji: {
      fontSize: 20,
    },
    featureInfo: {
      flex: 1,
    },
    featureTitle: {
      ...Type.callout,
      fontWeight: "700",
      color: colors.text,
    },
    featureDesc: {
      ...Type.caption,
      fontWeight: "500",
      color: colors.textTertiary,
      marginTop: 2,
      lineHeight: 15,
    },
    // ── Plans ──
    plansSection: {
      marginBottom: Space.xl,
    },
    plansTitle: {
      ...Type.title3,
      fontWeight: "800",
      color: colors.text,
      marginBottom: Space.md,
    },
    plansList: {
      gap: Space.md,
    },
    planCard: {
      ...surface(colors, 1, Radius.md),
      borderWidth: 2,
      borderColor: colors.separator,
      padding: Space.base,
      paddingTop: Space.lg,
    },
    planCardSelected: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary, colors.scheme === "dark" ? 0.14 : 0.07),
    },
    planCardPopular: {
      ...glow(colors.primary, colors, 0.22),
    },
    popularBadge: {
      position: "absolute",
      top: -1,
      left: Space.base,
      backgroundColor: colors.primary,
      paddingHorizontal: Space.md - 2,
      paddingVertical: 3,
      borderBottomLeftRadius: Radius.xs,
      borderBottomRightRadius: Radius.xs,
    },
    popularBadgeText: {
      ...Type.caption,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: "#fff",
    },
    savingsBadge: {
      position: "absolute",
      top: -1,
      right: Space.base,
      backgroundColor: colors.emerald,
      paddingHorizontal: Space.md - 2,
      paddingVertical: 3,
      borderBottomLeftRadius: Radius.xs,
      borderBottomRightRadius: Radius.xs,
    },
    savingsBadgeText: {
      ...Type.caption,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: "#fff",
    },
    planHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Space.md,
    },
    planRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.separator,
      justifyContent: "center",
      alignItems: "center",
    },
    planRadioSelected: {
      borderColor: colors.primary,
    },
    planRadioDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    planInfo: {
      flex: 1,
    },
    planLabel: {
      ...Type.headline,
      color: colors.text,
    },
    planLabelSelected: {
      color: colors.primary,
    },
    planPerWeek: {
      ...Type.caption,
      ...numeric,
      fontWeight: "500",
      color: colors.textTertiary,
      marginTop: 2,
    },
    planPriceCol: {
      alignItems: "flex-end",
    },
    planPrice: {
      ...statNumber(19),
      color: colors.text,
    },
    planPriceSelected: {
      color: colors.primary,
    },
    planPeriod: {
      ...Type.caption,
      fontWeight: "500",
      color: colors.textTertiary,
      marginTop: 1,
    },
    // ── Guarantee ──
    guarantee: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Space.sm,
      paddingVertical: Space.md,
    },
    guaranteeText: {
      ...Type.footnote,
      color: colors.textTertiary,
      textAlign: "center",
    },
    // ── CTA ──
    ctaContainer: {
      paddingHorizontal: Space.xl,
      paddingTop: Space.md,
      borderTopWidth: Layout.hairline,
      borderTopColor: colors.separator,
      backgroundColor: colors.surfaceBase,
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Space.sm,
      paddingVertical: Space.base + 2,
      paddingHorizontal: Space.lg,
      borderRadius: Radius.md,
      minHeight: 56,
      ...glow(colors.indigo, colors, 0.32),
    },
    ctaButtonProcessing: {
      opacity: 0.7,
    },
    ctaText: {
      ...Type.headline,
      fontSize: 16,
      color: "#fff",
      textAlign: "center",
      flexShrink: 1,
    },
    skipLink: {
      alignItems: "center",
      paddingVertical: Space.md,
      minHeight: Layout.touchTarget,
      justifyContent: "center",
    },
    skipText: {
      ...Type.subhead,
      fontWeight: "600",
      color: colors.textTertiary,
    },
  });
