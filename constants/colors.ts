export type ColorScheme = typeof LightColors;

const LightColors = {
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
  background: "#F2F2F7",
  cardBackground: "#FFFFFF",
  cardBorder: "#E5E5EA",
  surface: "#E5E5EA",

  // Glass effect (kept for modals/overlays only)
  glass: "rgba(255,255,255,0.92)",
  glassBorder: "rgba(0,0,0,0.06)",

  // Text
  text: "#000000",
  textSecondary: "#3C3C43",
  textTertiary: "#8E8E93",
  textMuted: "#8E8E93",

  // Status
  success: "#34C759",
  successLight: "#D1FAE5",
  warning: "#FF9500",
  error: "#FF3B30",

  // Basics
  white: "#FFFFFF",
  black: "#000000",
  border: "#E5E5EA",
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
  completedCard: "rgba(52,199,89,0.08)",
  completedBorder: "rgba(52,199,89,0.25)",

  // Muscle group colors (desaturated for professional look)
  muscleChest: "#EF4444",
  muscleBack: "#8B5CF6",
  muscleShoulders: "#F59E0B",
  muscleArms: "#EC4899",
  muscleLegs: "#3B82F6",
  muscleCore: "#10B981",
  muscleCardio: "#06B6D4",

  // Achievement tier colors
  tierBronze: "#CD7F32",
  tierSilver: "#C0C0C0",
  tierGold: "#FFD700",
  tierDiamond: "#B9F2FF",

  // XP bar
  xpBarBackground: "#E5E7EB",
  xpBarFill: "#6366F1",
  xpText: "#6366F1",
};

const DarkColors: ColorScheme = {
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
  background: "#000000",
  cardBackground: "#1C1C1E",
  cardBorder: "#38383A",
  surface: "#2C2C2E",

  // Glass effect
  glass: "rgba(28,28,30,0.92)",
  glassBorder: "rgba(255,255,255,0.08)",

  // Text
  text: "#FFFFFF",
  textSecondary: "#EBEBF5",
  textTertiary: "#636366",
  textMuted: "#636366",

  // Status
  success: "#30D158",
  successLight: "#0D3320",
  warning: "#FF9F0A",
  error: "#FF453A",

  // Basics
  white: "#FFFFFF",
  black: "#000000",
  border: "#38383A",
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
  completedCard: "rgba(48,209,88,0.12)",
  completedBorder: "rgba(48,209,88,0.3)",

  // Muscle group colors (brighter for dark mode)
  muscleChest: "#F87171",
  muscleBack: "#A78BFA",
  muscleShoulders: "#FBBF24",
  muscleArms: "#F472B6",
  muscleLegs: "#60A5FA",
  muscleCore: "#34D399",
  muscleCardio: "#22D3EE",

  // Achievement tier colors
  tierBronze: "#D4956A",
  tierSilver: "#D1D5DB",
  tierGold: "#FDE047",
  tierDiamond: "#67E8F9",

  // XP bar
  xpBarBackground: "#374151",
  xpBarFill: "#818CF8",
  xpText: "#818CF8",
};

// Default export for backward compatibility (light mode)
const Colors = LightColors;
export default Colors;

export { LightColors, DarkColors };
