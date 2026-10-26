export type SchemeName = "light" | "dark";
export type ColorScheme = typeof LightColors;

const LightColors = {
  /** Lets style helpers (elevation, overlays) adapt without a second argument. */
  scheme: "light" as SchemeName,

  // Primary palette
  primary: "#3B82F6",
  primaryDark: "#1D4ED8",
  primaryLight: "#93C5FD",
  primaryUltraLight: "#DBEAFE",

  // Extended palette
  indigo: "#6366F1",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",

  // Background & surfaces
  background: "#F3F4F7",
  cardBackground: "#FFFFFF",
  cardBorder: "rgba(15,23,42,0.08)",
  surface: "#E5E5EA",

  // Semantic surface ramp — sunken < base < raised. Depth in light mode comes
  // from shadow; in dark mode it comes from these getting progressively lighter.
  surfaceSunken: "#EBECF0",
  surfaceBase: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  /** Hairline divider. Distinct from `border`, which outlines whole controls. */
  separator: "rgba(15,23,42,0.08)",
  /** Neutral fill for inactive chips, tracks and placeholders. */
  fill: "rgba(118,118,128,0.10)",
  fillStrong: "rgba(118,118,128,0.18)",

  // Glass effect (kept for modals/overlays only)
  glass: "rgba(255,255,255,0.92)",
  glassBorder: "rgba(15,23,42,0.08)",

  // Text
  text: "#0B0D12",
  textSecondary: "#3C4049",
  textTertiary: "#686D76",
  textMuted: "#686D76",

  // Status
  success: "#16A34A",
  successLight: "#D1FAE5",
  warning: "#FF9500",
  error: "#DC2626",

  // Basics
  white: "#FFFFFF",
  black: "#000000",
  border: "rgba(15,23,42,0.10)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.5)",
  dark: "#000000",

  // Streak / amber tints
  streakFlame: "#FF9500",
  amberLight: "#FEF3C7",
  amberBorder: "#FDE68A",
  amberDark: "#92400E",
  amberTint: "rgba(245,158,11,0.18)",

  // Error tints
  errorLight: "#FEF2F2",
  errorBorder: "#FEE2E2",

  // Completed states
  completedCard: "rgba(22,163,74,0.08)",
  completedBorder: "rgba(22,163,74,0.28)",

  // Muscle group colors (desaturated for professional look)
  muscleChest: "#EF4444",
  muscleBack: "#8B5CF6",
  muscleShoulders: "#F59E0B",
  muscleArms: "#EC4899",
  muscleLegs: "#3B82F6",
  muscleCore: "#10B981",
  muscleCardio: "#06B6D4",

  // Achievement tier colors
  tierBronze: "#9A5B2E",
  tierSilver: "#5F6773",
  tierGold: "#A97C0A",
  tierDiamond: "#0E8FB0",

  // XP bar
  xpBarBackground: "#E5E7EB",
  xpBarFill: "#6366F1",
  xpText: "#6366F1",

  // v4 additions
  card2: "#F7F8FA",
  primaryText: "#2563EB",
  primaryTint: "rgba(59,130,246,0.12)",
  gold: "#A97C0A",
  goldTint: "rgba(234,179,8,0.16)",
  thumb: "#0F1218",
};

const DarkColors: ColorScheme = {
  scheme: "dark",

  // Primary palette
  primary: "#60A5FA",
  primaryDark: "#3B82F6",
  primaryLight: "#1E3A5F",
  primaryUltraLight: "#1E293B",

  // Extended palette
  indigo: "#818CF8",
  violet: "#A78BFA",
  cyan: "#22D3EE",
  emerald: "#34D399",
  amber: "#FBBF24",
  rose: "#FB7185",

  // Background & surfaces
  background: "#07080B",
  cardBackground: "#14161B",
  cardBorder: "rgba(255,255,255,0.08)",
  surface: "#1B1E24",

  surfaceSunken: "#0B0C10",
  surfaceBase: "#14161B",
  surfaceRaised: "#1B1E24",
  separator: "rgba(255,255,255,0.08)",
  fill: "rgba(255,255,255,0.06)",
  fillStrong: "rgba(255,255,255,0.13)",

  // Glass effect
  glass: "rgba(14,16,20,0.92)",
  glassBorder: "rgba(255,255,255,0.08)",

  // Text
  text: "#F4F5F7",
  textSecondary: "#C8CBD2",
  textTertiary: "#8C919B",
  textMuted: "#8C919B",

  // Status
  success: "#34D399",
  successLight: "#0D3320",
  warning: "#FF9F0A",
  error: "#FF6B6B",

  // Basics
  white: "#FFFFFF",
  black: "#000000",
  border: "rgba(255,255,255,0.10)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.6)",
  dark: "#000000",

  // Streak / amber tints
  streakFlame: "#FF9F0A",
  amberLight: "#422006",
  amberBorder: "#78350F",
  amberDark: "#FDE68A",
  amberTint: "rgba(251,191,36,0.18)",

  // Error tints
  errorLight: "rgba(255,69,58,0.12)",
  errorBorder: "rgba(255,69,58,0.25)",

  // Completed states
  completedCard: "rgba(52,211,153,0.10)",
  completedBorder: "rgba(52,211,153,0.30)",

  // Muscle group colors (brighter for dark mode)
  muscleChest: "#F87171",
  muscleBack: "#A78BFA",
  muscleShoulders: "#FBBF24",
  muscleArms: "#F472B6",
  muscleLegs: "#60A5FA",
  muscleCore: "#34D399",
  muscleCardio: "#22D3EE",

  // Achievement tier colors
  tierBronze: "#D99A6C",
  tierSilver: "#C7CBD1",
  tierGold: "#F2C94C",
  tierDiamond: "#7DD3FC",

  // XP bar
  xpBarBackground: "#374151",
  xpBarFill: "#818CF8",
  xpText: "#818CF8",

  // v4 additions
  card2: "#1B1E24",
  primaryText: "#60A5FA",
  primaryTint: "rgba(96,165,250,0.15)",
  gold: "#F2C94C",
  goldTint: "rgba(242,201,76,0.14)",
  thumb: "#0B0D11",
};

// Default export for backward compatibility (light mode)
const Colors = LightColors;
export default Colors;

export { LightColors, DarkColors };
