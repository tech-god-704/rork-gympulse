import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Flame } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { elevation } from "@/constants/theme";
import { formatDate } from "@/utils/helpers";

interface Props {
  completedDates: string[];
  streak: number;
}

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** The last seven days ending today, with a dot under every day trained. */
export default function WeekStrip({ completedDates, streak }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trained = useMemo(() => new Set(completedDates), [completedDates]);

  const days = useMemo(() => {
    const out: { key: string; label: string; num: number; done: boolean; today: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      out.push({ key, label: LETTERS[d.getDay()], num: d.getDate(), done: trained.has(key), today: i === 0 });
    }
    return out;
  }, [trained]);

  const count = days.filter((d) => d.done).length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.caption}>Last 7 days</Text>
          <View style={styles.countRow}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.countUnit}>{count === 1 ? "workout" : "workouts"}</Text>
          </View>
        </View>
        <View style={styles.streakBlock}>
          <Text style={styles.caption}>Streak</Text>
          <View style={styles.streakRow}>
            <Flame size={16} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.streak}>{streak} {streak === 1 ? "day" : "days"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.days}>
        {days.map((d) => (
          <View key={d.key} style={styles.day}>
            <Text style={styles.dayLabel}>{d.label}</Text>
            <View
              style={[
                styles.num,
                d.done && { backgroundColor: colors.primary },
                d.today && !d.done && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.numText, d.done && { color: "#fff" }]}>{d.num}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      padding: 18,
      gap: 16,
      ...elevation(1, colors),
    },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    caption: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
    countRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    count: { fontSize: 28, fontWeight: "800", letterSpacing: -0.9, color: colors.text, fontVariant: ["tabular-nums"] },
    countUnit: { fontSize: 14, fontWeight: "600", color: colors.textTertiary },
    streakBlock: { alignItems: "flex-end", gap: 2 },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    streak: { fontSize: 17, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    days: { flexDirection: "row", justifyContent: "space-between" },
    day: { alignItems: "center", gap: 6 },
    dayLabel: { fontSize: 11, fontWeight: "700", color: colors.textTertiary },
    num: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill },
    numText: { fontSize: 14, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  });
