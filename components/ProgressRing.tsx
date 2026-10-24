import React, { useEffect, useId, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { Motion, Type, numeric } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  completed?: number;
  total?: number;
  /** Render for placement on a saturated/dark surface (the workout hero). */
  onDark?: boolean;
  /** Solid colour instead of the brand gradient. */
  color?: string;
}

export default function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 6,
  completed,
  total,
  onDark = false,
  color,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // SVG ids are document-global; a fixed one collides when two rings render.
  const gradientId = `ringGradient-${useId().replace(/:/g, "")}`;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 1);

  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: Motion.base,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const dashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const trackColor = onDark ? "rgba(255,255,255,0.25)" : colors.fill;
  const strokeColor = color ?? (onDark ? "#FFFFFF" : `url(#${gradientId})`);
  const label =
    completed != null && total != null ? `${completed}/${total}` : `${Math.round(clamped * 100)}%`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="50%" stopColor={colors.indigo} />
            <Stop offset="100%" stopColor={colors.violet} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={styles.centerText}
        accessibilityRole="progressbar"
        accessibilityLabel={
          completed != null && total != null
            ? `${completed} of ${total} sets complete`
            : `${Math.round(clamped * 100)} percent complete`
        }
      >
        <Text
          style={[
            styles.label,
            { fontSize: size < 60 ? 13 : 15, color: onDark ? "#FFFFFF" : colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  label: {
    ...Type.callout,
    ...numeric,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
  },
});
