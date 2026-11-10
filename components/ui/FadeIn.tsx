import React, { useEffect, useRef } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  children: React.ReactNode;
  /** Milliseconds to wait; stagger siblings with `index * 50`. */
  delay?: number;
  /** Points to rise while fading in. */
  rise?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades and lifts its children into place when first mounted. */
export default function FadeIn({ children, delay = 0, rise = 14, style }: Props) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
