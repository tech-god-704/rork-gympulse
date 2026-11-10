import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import type { TextStyle } from "react-native";

/** Font files handed to `useFonts` in the root layout. */
export const APP_FONTS = {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

const MEDIUM = "PlusJakartaSans_500Medium";
const SEMIBOLD = "PlusJakartaSans_600SemiBold";
const BOLD = "PlusJakartaSans_700Bold";
const EXTRABOLD = "PlusJakartaSans_800ExtraBold";

const BY_WEIGHT: Record<string, string> = {
  "100": MEDIUM,
  "200": MEDIUM,
  "300": MEDIUM,
  "400": MEDIUM,
  "500": MEDIUM,
  "600": SEMIBOLD,
  "700": BOLD,
  "800": EXTRABOLD,
  "900": EXTRABOLD,
  normal: MEDIUM,
  bold: BOLD,
};

let fontsReady = false;

/** Called once the font files have loaded. Until then text stays in the system font. */
export function setFontsReady(ready: boolean) {
  fontsReady = ready;
}

/**
 * The font family for a weight. Each weight is its own file, so styles keep
 * writing `fontWeight` and the Text wrapper swaps it for the matching family.
 */
export function fontFamilyFor(weight: TextStyle["fontWeight"] | undefined): string | undefined {
  if (!fontsReady) return undefined;
  return BY_WEIGHT[String(weight ?? "500")] ?? MEDIUM;
}
