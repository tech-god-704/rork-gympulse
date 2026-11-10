import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { gradient } from "@/constants/theme";

interface Props {
  /** 0–1. */
  value: number;
  height?: number;
  /** Solid fill color. Leave unset for the signature gradient. */
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** A progress bar whose fill glides to its new value. */
export default function Meter({ value, height = 8, color, trackColor, style }: Props) {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(value, 0), 1);
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, clamped]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.fillStrong }, style]}>
      <Animated.View style={{ width, height: "100%", borderRadius: height / 2, overflow: "hidden", backgroundColor: color }}>
        {!color && <LinearGradient colors={gradient("bar", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden" },
});
