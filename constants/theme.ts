import { Platform, TextStyle, ViewStyle } from "react-native";
import { type ColorScheme } from "@/constants/colors";
import { MuscleGroup } from "@/types";

/**
 * The app's design tokens.
 *
 * Before this existed every screen invented its own scale — 21 different
 * border radii, 25 font sizes (including 7px labels), and 38 hand-written
 * shadow blocks with slightly different values. Screens now compose from
 * these instead, which is what makes the product read as one thing.
 */

// ─── Spacing (8pt grid, with 4pt half-steps) ────────────────
export const Space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

// ─── Radius ─────────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// ─── Layout constants ───────────────────────────────────────
export const Layout = {
  /** Horizontal gutter for every screen. */
  gutter: 18,
  /** Minimum tappable edge — the platform accessibility floor. */
  touchTarget: 44,
  /** Comfortable row height for list items with two lines of text. */
  rowHeight: 56,
  hairline: Platform.OS === "ios" ? 0.5 : 1,
} as const;

// ─── Motion ─────────────────────────────────────────────────
export const Motion = {
  instant: 120,
  fast: 200,
  base: 280,
  slow: 420,
  celebration: 800,
  spring: { friction: 8, tension: 90 },
  springBouncy: { friction: 5, tension: 110 },
} as const;

// ─── Typography ─────────────────────────────────────────────
// Semantic roles rather than raw sizes. Large text carries tight negative
// tracking (the way system UI does), and nothing sits below 11px.

type Weight = TextStyle["fontWeight"];

const W = {
  regular: "400" as Weight,
  medium: "500" as Weight,
  semibold: "600" as Weight,
  bold: "700" as Weight,
  heavy: "800" as Weight,
  black: "900" as Weight,
};

export const Type = {
  /** Screen-dominating numbers: streak counts, timers. */
  display: { fontSize: 52, fontWeight: W.black, letterSpacing: -2, lineHeight: 56 },
  hero: { fontSize: 34, fontWeight: W.heavy, letterSpacing: -1.2, lineHeight: 40 },
  /** Large screen titles. */
  title1: { fontSize: 28, fontWeight: W.heavy, letterSpacing: -0.9, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: W.heavy, letterSpacing: -0.6, lineHeight: 28 },
  title3: { fontSize: 18, fontWeight: W.bold, letterSpacing: -0.4, lineHeight: 24 },
  /** Card titles and list-row primary text. */
  headline: { fontSize: 16, fontWeight: W.bold, letterSpacing: -0.3, lineHeight: 21 },
  body: { fontSize: 15, fontWeight: W.medium, letterSpacing: -0.2, lineHeight: 21 },
  callout: { fontSize: 14, fontWeight: W.semibold, letterSpacing: -0.2, lineHeight: 19 },
  subhead: { fontSize: 13, fontWeight: W.medium, letterSpacing: -0.1, lineHeight: 18 },
  footnote: { fontSize: 12, fontWeight: W.medium, letterSpacing: 0, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: W.semibold, letterSpacing: 0.1, lineHeight: 14 },
  /** Small all-caps section eyebrows. */
  overline: {
    fontSize: 11,
    fontWeight: W.heavy,
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: "uppercase" as const,
  },
} satisfies Record<string, TextStyle>;

export const Weights = W;

/**
 * Tabular figures for anything that ticks: timers, weights, set counts, stats.
 *
 * The app previously reached for Menlo/monospace in 24 places to stop numbers
 * jittering, which made a fitness product read like a terminal. `tabular-nums`
 * gives fixed-width digits in the system font instead.
 */
export const numeric: TextStyle = {
  fontVariant: ["tabular-nums"],
};

/** A number styled to dominate a stat tile. */
export function statNumber(size = 24): TextStyle {
  return {
    fontSize: size,
    fontWeight: W.heavy,
    letterSpacing: size >= 28 ? -1 : -0.6,
    ...numeric,
  };
}

// ─── Elevation ──────────────────────────────────────────────
// Light mode gets soft shadows. Dark mode gets none — shadows are invisible on
// black — so depth there comes from the surface ramp and a brighter border.

export type ElevationLevel = 0 | 1 | 2 | 3;

const LIGHT_SHADOWS: Record<ElevationLevel, ViewStyle> = {
  0: {},
  1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
};

export function elevation(level: ElevationLevel, colors: ColorScheme): ViewStyle {
  if (colors.scheme === "dark") {
    return level === 0 ? {} : { elevation: level * 2 };
  }
  return LIGHT_SHADOWS[level];
}

/** A colored glow, for primary actions that should feel alive. */
export function glow(color: string, colors: ColorScheme, strength = 0.28): ViewStyle {
  if (colors.scheme === "dark") return { elevation: 6 };
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: strength,
    shadowRadius: 14,
    elevation: 6,
  };
}

/** The standard card surface: fill, hairline, radius and depth in one place. */
export function surface(
  colors: ColorScheme,
  level: ElevationLevel = 1,
  radius: number = Radius.md
): ViewStyle {
  return {
    backgroundColor: level >= 2 ? colors.surfaceRaised : colors.surfaceBase,
    borderRadius: radius,
    borderWidth: Layout.hairline,
    borderColor: colors.separator,
    ...elevation(level, colors),
  };
}

// ─── Color helpers ──────────────────────────────────────────

/** Translucent tint of any hex color — for soft badges and icon wells. */
export function tint(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Perceived lightness 0–1, for deciding whether to put white or black on top. */
export function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return 1;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Readable foreground for an arbitrary background color. */
export function onColor(hex: string): string {
  return luminance(hex) < 0.6 ? "#FFFFFF" : "#101014";
}

// ─── Muscle-group accent language ───────────────────────────
// These already existed in the palette but were only used by one chart.
// Exposed here so cards, tags and rings can all speak the same color language.

export function muscleColor(group: MuscleGroup, colors: ColorScheme): string {
  const map: Record<MuscleGroup, string> = {
    chest: colors.muscleChest,
    back: colors.muscleBack,
    shoulders: colors.muscleShoulders,
    arms: colors.muscleArms,
    legs: colors.muscleLegs,
    core: colors.muscleCore,
    cardio: colors.muscleCardio,
  };
  return map[group] ?? colors.primary;
}

/** Dominant muscle color for a set of groups, for routine-level accenting. */
export function dominantMuscleColor(
  groups: MuscleGroup[],
  colors: ColorScheme
): string | undefined {
  if (groups.length === 0) return undefined;
  const counts = new Map<MuscleGroup, number>();
  groups.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  let best: MuscleGroup = groups[0];
  let bestCount = 0;
  counts.forEach((count, group) => {
    if (count > bestCount) {
      best = group;
      bestCount = count;
    }
  });
  return muscleColor(best, colors);
}
