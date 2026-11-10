import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const enabled = Platform.OS !== "web";

/** One place for haptics, so screens don't each repeat the web guard. */
export const haptic = {
  light: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  select: () => enabled && void Haptics.selectionAsync(),
  success: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

export type HapticKind = keyof typeof haptic | "none";
