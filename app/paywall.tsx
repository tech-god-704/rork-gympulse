import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check, Star, Shield, Zap, Crown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { SubscriptionPlan, PREMIUM_FEATURES } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const { colors, isDark } = useTheme();
  const { premium, subscribeToPlan, dismissPaywall } = useGym();
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
  }, []);

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
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} activeOpacity={0.7}>
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
                    activeOpacity={0.7}
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
          activeOpacity={0.8}
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
        <TouchableOpacity onPress={handleDismiss} style={styles.skipLink}>
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
      top: 56,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.glassBorder,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    hero: {
      alignItems: "center",
      marginBottom: 24,
    },
    heroIcon: {
      width: 80,
      height: 80,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      shadowColor: colors.indigo,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 32,
      elevation: 8,
    },
    heroTitle: {
      fontSize: 34,
      fontWeight: "900" as const,
      color: colors.text,
      textAlign: "center",
      letterSpacing: -1.2,
      lineHeight: 38,
    },
    heroTitleAccent: {
      color: colors.indigo,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 21,
      paddingHorizontal: 10,
    },
    socialProof: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 28,
      backgroundColor: colors.amberTint,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignSelf: "center",
    },
    socialProofStars: {
      flexDirection: "row",
      gap: 2,
    },
    socialProofText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    socialProofBold: {
      fontWeight: "800" as const,
      color: colors.text,
    },
    featuresList: {
      gap: 12,
      marginBottom: 28,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    featureIconBg: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primaryUltraLight,
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
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.text,
      letterSpacing: -0.2,
    },
    featureDesc: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 1,
      lineHeight: 15,
    },
    plansSection: {
      marginBottom: 16,
    },
    plansTitle: {
      fontSize: 18,
      fontWeight: "800" as const,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    plansList: {
      gap: 10,
    },
    planCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.glassBorder,
      backgroundColor: colors.cardBackground,
      position: "relative",
      overflow: "visible",
    },
    planCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryUltraLight,
    },
    planCardPopular: {
      borderColor: colors.indigo,
    },
    popularBadge: {
      position: "absolute",
      top: -10,
      left: 16,
      backgroundColor: colors.indigo,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
    },
    popularBadgeText: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: "#fff",
      letterSpacing: 1,
    },
    savingsBadge: {
      position: "absolute",
      top: -10,
      right: 16,
      backgroundColor: colors.emerald,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    savingsBadgeText: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: "#fff",
      letterSpacing: 0.5,
    },
    planHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    planRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.glassBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    planRadioSelected: {
      borderColor: colors.indigo,
    },
    planRadioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.indigo,
    },
    planInfo: {
      flex: 1,
    },
    planLabel: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.text,
    },
    planLabelSelected: {
      color: colors.indigo,
    },
    planPerWeek: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 1,
    },
    planPriceCol: {
      alignItems: "flex-end",
    },
    planPrice: {
      fontSize: 20,
      fontWeight: "900" as const,
      color: colors.text,
      letterSpacing: -0.5,
    },
    planPriceSelected: {
      color: colors.indigo,
    },
    planPeriod: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    guarantee: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginBottom: 16,
    },
    guaranteeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    ctaContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingTop: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 18,
      borderRadius: 18,
      shadowColor: colors.indigo,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
    ctaButtonProcessing: {
      opacity: 0.7,
    },
    ctaText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700" as const,
      letterSpacing: -0.2,
    },
    skipLink: {
      alignItems: "center",
      paddingVertical: 12,
    },
    skipText: {
      fontSize: 13,
      color: colors.textTertiary,
      fontWeight: "500" as const,
    },
  });
