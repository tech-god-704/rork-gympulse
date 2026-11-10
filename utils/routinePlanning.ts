import type { MuscleGroup, WeekDay } from "@/types";

const WEEK: WeekDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/** Training days for a weekly frequency, spaced so rest days fall between sessions. */
const PATTERNS: Record<number, WeekDay[]> = {
  1: ["monday"],
  2: ["monday", "thursday"],
  3: ["monday", "wednesday", "friday"],
  4: ["monday", "tuesday", "thursday", "friday"],
  5: ["monday", "tuesday", "wednesday", "friday", "saturday"],
  6: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  7: WEEK,
};

/**
 * Spread a split's routines across the week. A 6-day split with three routines
 * runs each one twice; days another routine already owns are left alone so
 * adding a split never double-books a day.
 */
export function planSchedule(routineCount: number, daysPerWeek: number, taken: WeekDay[] = []): WeekDay[][] {
  const plan: WeekDay[][] = Array.from({ length: Math.max(routineCount, 0) }, () => []);
  if (routineCount <= 0) return plan;
  const days = PATTERNS[Math.min(Math.max(Math.round(daysPerWeek) || routineCount, 1), 7)];
  const blocked = new Set(taken);
  days.forEach((day, i) => {
    if (!blocked.has(day)) plan[i % routineCount].push(day);
  });
  return plan;
}

const MUSCLE_ROUTINE_COLORS: Record<MuscleGroup, string> = {
  chest: "#EF4444",
  back: "#8B5CF6",
  shoulders: "#F59E0B",
  arms: "#EC4899",
  legs: "#3B82F6",
  core: "#10B981",
  cardio: "#6366F1",
};

/** A routine color from the muscle group it trains most. */
export function routineColorFor(groups: MuscleGroup[]): string | undefined {
  if (groups.length === 0) return undefined;
  const counts = new Map<MuscleGroup, number>();
  for (const g of groups) counts.set(g, (counts.get(g) ?? 0) + 1);
  let best = groups[0];
  for (const [g, n] of counts) if (n > (counts.get(best) ?? 0)) best = g;
  return MUSCLE_ROUTINE_COLORS[best];
}
