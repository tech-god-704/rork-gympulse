import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { Motion, Radius } from "@/constants/theme";

interface Props {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  /** Animate to the new value instead of snapping. Default true. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One progress bar implementation, replacing six hand-rolled ones. */
export default function ProgressBar({
  value,
  height = 8,
  color,
  trackColor,
  animated = true,
  style,
}: Props) {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (!animated) {
      anim.setValue(clamped);
      return;
    }
    Animated.timing(anim, {
      toValue: clamped,
      duration: Motion.base,
      useNativeDriver: false,
    }).start();
  }, [clamped, animated, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.fill },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
});
