import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

let cached = false;
void AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    cached = v;
  })
  .catch(() => {});

/** True when the person has asked the system to reduce motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(cached);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      cached = v;
      setReduced(v);
    });
    return () => sub.remove();
  }, []);
  return reduced;
}
