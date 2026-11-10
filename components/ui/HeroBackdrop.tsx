import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/providers/ThemeProvider";
import { gradient } from "@/constants/theme";

interface Props {
  /** "blue" is the signature hero; "ink" is the near-black variant for premium moments. */
  tone?: "blue" | "ink" | "gold";
  /** Draw the heartbeat line across the upper right. */
  pulse?: boolean;
  radius?: number;
}

const GLOWS = {
  blue: { a: "#7C6CFF", b: "#38BDF8" },
  ink: { a: "#4F46E5", b: "#2563EB" },
  gold: { a: "#FDE68A", b: "#F97316" },
};

/**
 * Background for hero surfaces: a deep diagonal gradient with two soft light
 * blooms, so large colored areas read as lit rather than flat.
 */
export default function HeroBackdrop({ tone = "blue", pulse = false, radius = 0 }: Props) {
  const { colors } = useTheme();
  const glow = GLOWS[tone];
  const name = tone === "blue" ? "hero" : tone === "ink" ? "ink" : "pr";
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]} pointerEvents="none">
      <LinearGradient colors={gradient(name, colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`hb-a-${tone}`} cx="340" cy="360" r="260" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={glow.a} stopOpacity={tone === "ink" ? 0.55 : 0.7} />
            <Stop offset="1" stopColor={glow.a} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`hb-b-${tone}`} cx="60" cy="-20" r="240" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={glow.b} stopOpacity={tone === "ink" ? 0.22 : 0.4} />
            <Stop offset="1" stopColor={glow.b} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="400" fill={`url(#hb-a-${tone})`} />
        <Rect x="0" y="0" width="400" height="400" fill={`url(#hb-b-${tone})`} />
      </Svg>
      {pulse && (
        <Svg width={300} height={90} viewBox="0 0 300 90" style={styles.pulse}>
          <Path
            d="M0 45h96l12-24 16 50 16-62 14 54 10-18h136"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pulse: { position: "absolute", top: 54, right: -80 },
});
