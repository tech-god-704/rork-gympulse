import React, { useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { haptic, type HapticKind } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** How far the surface shrinks while held. */
  scaleTo?: number;
  haptic?: HapticKind;
  children?: React.ReactNode;
}

/** A pressable surface that gives under the finger and springs back. */
export default function PressableScale({ style, scaleTo = 0.97, haptic: kind = "none", onPress, disabled, children, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: value === 1 ? 6 : 0 }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (kind !== "none") haptic[kind]();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}
