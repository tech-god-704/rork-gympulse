import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Check, Flame } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card } from "@/constants/theme";
import { formatDate, getStartOfWeek } from "@/utils/helpers";
import { WeekStart } from "@/types";

interface Props {
  completedDates: string[];
  streak: number;
  /** Training days per week the user is aiming for. */
  goal: number;
  weekStartsOn: WeekStart;
}

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const RING = 64;
const STROKE = 7;

/** This calendar week against the weekly goal: a progress ring plus one dot per day. */
export default function WeekCard({ completedDates, streak, goal, weekStartsOn }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trained = useMemo(() => new Set(completedDates), [completedDates]);

  const days = useMemo(() => {
    const start = getStartOfWeek(new Date(), weekStartsOn);
    const todayKey = formatDate(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDate(d);
      return { key, letter: LETTERS[d.getDay()], num: d.getDate(), done: trained.has(key), today: key === todayKey, future: key > todayKey };
    });
  }, [trained, weekStartsOn]);

  const count = days.filter((d) => d.done).length;
  const target = Math.max(goal, 1);
  const fraction = Math.min(count / target, 1);
  const remaining = Math.max(target - count, 0);
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const reached = remaining === 0;
  const ringColor = reached ? colors.success : colors.primary;

  return (
    <View style={styles.card} accessible accessibilityLabel={`${count} of ${target} workouts this week. ${streak} day streak.`}>
      <View style={styles.top}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING} style={styles.ringSvg}>
            <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.fillStrong} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              stroke={ringColor}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={c * (1 - fraction)}
            />
          </Svg>
          <Text style={styles.ringText}>
            {count}
            <Text style={styles.ringGoal}>/{target}</Text>
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{reached ? "Weekly goal reached" : "This week"}</Text>
          <Text style={styles.sub}>
            {reached
              ? "Anything from here is a bonus."
              : count === 0
                ? `${target} workouts to hit your goal`
                : `${remaining} more to hit your goal`}
          </Text>
        </View>
        <View style={[styles.streak, streak > 0 && { backgroundColor: colors.flameTint }]}>
          <Flame size={15} color={streak > 0 ? colors.flame : colors.textTertiary} fill={streak > 0 ? colors.flame : "transparent"} />
          <Text style={[styles.streakText, streak > 0 && { color: colors.flame }]}>{streak}</Text>
        </View>
      </View>

      <View style={styles.days}>
        {days.map((d) => (
          <View key={d.key} style={styles.day}>
            <Text style={[styles.letter, d.today && { color: colors.primaryText }]}>{d.letter}</Text>
            <View
              style={[
                styles.dot,
                d.done && { backgroundColor: colors.primary },
                d.today && !d.done && styles.dotToday,
              ]}
            >
              {d.done ? (
                <Check size={16} color="#fff" strokeWidth={3.2} />
              ) : (
                <Text style={[styles.num, d.today && { color: colors.primaryText }, d.future && { opacity: 0.45 }]}>{d.num}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: { ...card(colors), padding: 18, gap: 16 },
    top: { flexDirection: "row", alignItems: "center", gap: 14 },
    ring: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
    ringSvg: { position: "absolute", transform: [{ rotate: "-90deg" }] },
    ringText: { fontSize: 20, fontWeight: "800", letterSpacing: -0.6, color: colors.text, fontVariant: ["tabular-nums"] },
    ringGoal: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
    info: { flex: 1, gap: 2 },
    title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    sub: { fontSize: 13, fontWeight: "500", color: colors.textTertiary },
    streak: { flexDirection: "row", alignItems: "center", gap: 4, height: 34, paddingHorizontal: 11, borderRadius: 17, backgroundColor: colors.fill },
    streakText: { fontSize: 15, fontWeight: "800", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    days: { flexDirection: "row", justifyContent: "space-between" },
    day: { alignItems: "center", gap: 7 },
    letter: { fontSize: 11, fontWeight: "800", color: colors.textTertiary },
    dot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill },
    dotToday: { backgroundColor: colors.primaryTint, borderWidth: 2, borderColor: colors.primary },
    num: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  });
