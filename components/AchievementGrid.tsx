import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Anchor,
  Award,
  CalendarCheck,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Gem,
  Layers,
  ListChecks,
  Medal,
  Mountain,
  Repeat,
  Rocket,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Weight,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { elevation } from "@/constants/theme";
import { AchievementTier, UnlockedAchievement } from "@/types";
import { ACHIEVEMENT_DEFINITIONS } from "@/utils/gamification";

const ICONS: Record<string, LucideIcon> = {
  streak_3: Flame,
  streak_7: Zap,
  streak_14: Rocket,
  streak_30: Gem,
  workouts_10: Dumbbell,
  workouts_50: CalendarCheck,
  workouts_100: Medal,
  first_pr: Trophy,
  prs_5: Award,
  prs_15: Star,
  pr_3_in_one: Sparkles,
  volume_10k: Weight,
  volume_100k: Anchor,
  volume_500k: Mountain,
  volume_1m: Crown,
  muscles_all: Target,
  routines_3: Compass,
  routines_7: Shuffle,
  sets_100: ListChecks,
  sets_500: Repeat,
  sets_1000: Layers,
  duration_600: Timer,
};

/** [light, dark] tier colors. */
const TIER: Record<AchievementTier, [string, string]> = {
  bronze: ["#9A5B2E", "#D99A6C"],
  silver: ["#5F6773", "#C7CBD1"],
  gold: ["#A97C0A", "#F2C94C"],
  diamond: ["#0E8FB0", "#7DD3FC"],
};

const PREVIEW = 9;

interface Props {
  unlockedAchievements: UnlockedAchievement[];
}

/** v4 achievement wall: unlocked first, tier-colored rings, the next goals dimmed. */
export default function AchievementGrid({ unlockedAchievements }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const dark = colors.scheme === "dark";

  const unlocked = useMemo(() => new Set(unlockedAchievements.map((a) => a.id)), [unlockedAchievements]);
  const ordered = useMemo(
    () => [
      ...ACHIEVEMENT_DEFINITIONS.filter((a) => unlocked.has(a.id)),
      ...ACHIEVEMENT_DEFINITIONS.filter((a) => !unlocked.has(a.id)),
    ],
    [unlocked],
  );
  const visible = expanded ? ordered : ordered.slice(0, PREVIEW);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.count}>
          {unlocked.size} of {ACHIEVEMENT_DEFINITIONS.length}
        </Text>
      </View>
      <View style={styles.grid}>
        {visible.map((a) => {
          const got = unlocked.has(a.id);
          const [light, darkCol] = TIER[a.tier];
          const col = dark ? darkCol : light;
          const Icon = ICONS[a.id] ?? Trophy;
          return (
            <View
              key={a.id}
              style={[styles.tile, !got && styles.locked]}
              accessible
              accessibilityLabel={`${a.name}, ${a.tier}. ${a.description}. ${got ? "Unlocked" : "Locked"}`}
            >
              <View
                style={[
                  styles.badge,
                  got
                    ? { backgroundColor: `${darkCol}${dark ? "29" : "38"}`, borderColor: col }
                    : { backgroundColor: colors.fill, borderColor: colors.fillStrong },
                ]}
              >
                <Icon size={22} color={got ? col : colors.textTertiary} strokeWidth={2.2} />
              </View>
              <Text style={styles.name} numberOfLines={2}>{a.name}</Text>
              <Text style={[styles.tier, { color: got ? col : colors.textTertiary }]}>{a.tier}</Text>
              <Text style={styles.desc} numberOfLines={2}>{a.description}</Text>
            </View>
          );
        })}
      </View>
      {ordered.length > PREVIEW && (
        <TouchableOpacity style={styles.more} onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
          <Text style={styles.moreText}>{expanded ? "Show less" : `See all ${ordered.length}`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    wrap: { gap: 10 },
    head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingTop: 4 },
    title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    count: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tile: {
      flexBasis: "30%",
      flexGrow: 1,
      maxWidth: "32%",
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      paddingTop: 14,
      paddingBottom: 12,
      paddingHorizontal: 6,
      alignItems: "center",
      gap: 5,
      ...elevation(1, colors),
    },
    locked: { opacity: 0.55 },
    badge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 2 },
    name: { fontSize: 12, fontWeight: "800", lineHeight: 15, color: colors.text, textAlign: "center" },
    tier: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
    desc: { fontSize: 10, fontWeight: "600", lineHeight: 13, color: colors.textTertiary, textAlign: "center" },
    more: { height: 44, alignItems: "center", justifyContent: "center" },
    moreText: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
  });
