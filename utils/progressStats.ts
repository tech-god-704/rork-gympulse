import type { WeekStart, WorkoutHistory } from "@/types";
import { getStartOfWeek } from "@/utils/helpers";

export type ProgressRange = "4w" | "3m" | "1y";

export interface RangeBar {
  value: number;
  label: string;
  current: boolean;
}

export interface RangeSummary {
  /** Volume (lb) lifted inside the range. */
  total: number;
  /** Volume (lb) in the same elapsed slice of the period just before it. */
  previousTotal: number;
  bars: RangeBar[];
  workouts: number;
  newPRs: number;
  avgMinutes: number;
  totalMinutes: number;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

interface Bucket {
  start: number;
  end: number;
  label: string;
}

function weekBuckets(count: number, weekStartsOn: WeekStart, now: Date, monthLabels: boolean): Bucket[] {
  const thisWeek = getStartOfWeek(now, weekStartsOn);
  const buckets: Bucket[] = [];
  let lastMonth = -1;
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    let label = `W${count - i}`;
    if (monthLabels) {
      // Name the month once, on the first week that starts in it.
      label = start.getMonth() !== lastMonth ? MONTH_SHORT[start.getMonth()] : "";
      lastMonth = start.getMonth();
    }
    buckets.push({ start: start.getTime(), end: end.getTime(), label });
  }
  return buckets;
}

function monthBuckets(count: number, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({ start: start.getTime(), end: end.getTime(), label: MONTH_SHORT[start.getMonth()].charAt(0) });
  }
  return buckets;
}

function bucketsFor(range: ProgressRange, weekStartsOn: WeekStart, now: Date): Bucket[] {
  if (range === "4w") return weekBuckets(4, weekStartsOn, now, false);
  if (range === "3m") return weekBuckets(12, weekStartsOn, now, true);
  return monthBuckets(12, now);
}

/** Volume, session and PR totals for the selected range, plus the bars for its chart. */
export function summarizeRange(
  history: WorkoutHistory[],
  range: ProgressRange,
  weekStartsOn: WeekStart,
  now: Date = new Date(),
): RangeSummary {
  const buckets = bucketsFor(range, weekStartsOn, now);
  const start = buckets[0].start;
  const end = buckets[buckets.length - 1].end;
  const span = end - start;
  const values = buckets.map(() => 0);
  let total = 0;
  let previousTotal = 0;
  let workouts = 0;
  let newPRs = 0;
  let totalMinutes = 0;

  for (const h of history) {
    const t = new Date(h.completedAt).getTime();
    const vol = h.totalVolume ?? 0;
    if (t >= start && t < end) {
      total += vol;
      workouts++;
      newPRs += h.newPRs ?? 0;
      totalMinutes += h.duration;
      const idx = buckets.findIndex((b) => t >= b.start && t < b.end);
      if (idx >= 0) values[idx] += vol;
    } else if (t >= start - span && t < Math.min(start, now.getTime() - span)) {
      // Same elapsed slice of the previous period, so a half-finished week
      // isn't compared against a whole one.
      previousTotal += vol;
    }
  }

  return {
    total,
    previousTotal,
    bars: buckets.map((b, i) => ({ value: values[i], label: b.label, current: i === buckets.length - 1 })),
    workouts,
    newPRs,
    avgMinutes: workouts > 0 ? Math.round(totalMinutes / workouts) : 0,
    totalMinutes,
  };
}

/** "+8% vs previous", or null when there's nothing earlier to compare against. */
export function formatDelta(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs previous`;
}

function topSetWeight(h: WorkoutHistory, exerciseName: string): number {
  let best = 0;
  for (const e of h.exercises ?? []) {
    if (e.skipped || e.exerciseName !== exerciseName) continue;
    const weights = e.sets?.length ? e.sets.map((s) => s.weight) : [e.bestSet.weight];
    best = Math.max(best, ...weights);
  }
  return best;
}

/** Exercises with a weighted top set in the most distinct weeks, most consistent first. */
export function overloadCandidates(history: WorkoutHistory[], weekStartsOn: WeekStart, limit = 4): string[] {
  const weeks = new Map<string, Set<number>>();
  const heaviest = new Map<string, number>();
  for (const h of history) {
    const week = getStartOfWeek(new Date(h.completedAt), weekStartsOn).getTime();
    for (const e of h.exercises ?? []) {
      const top = e.skipped ? 0 : topSetWeight(h, e.exerciseName);
      if (top <= 0) continue;
      if (!weeks.has(e.exerciseName)) weeks.set(e.exerciseName, new Set());
      weeks.get(e.exerciseName)!.add(week);
      heaviest.set(e.exerciseName, Math.max(heaviest.get(e.exerciseName) ?? 0, top));
    }
  }
  // Ties go to the heavier lift: the big compounds are what people track.
  return [...weeks.entries()]
    .filter(([, w]) => w.size >= 2)
    .sort((a, b) => b[1].size - a[1].size || (heaviest.get(b[0]) ?? 0) - (heaviest.get(a[0]) ?? 0) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * Heaviest top set per week for the last `weeks` weeks (oldest first). Weeks
 * without the lift carry the previous value forward so the line doesn't dive
 * to zero for a missed week; weeks before the first session are dropped.
 */
export function overloadSeries(
  history: WorkoutHistory[],
  exerciseName: string,
  weekStartsOn: WeekStart,
  weeks = 8,
  now: Date = new Date(),
): number[] {
  const thisWeek = getStartOfWeek(now, weekStartsOn).getTime();
  const first = thisWeek - (weeks - 1) * 7 * DAY_MS;
  const raw: number[] = Array.from({ length: weeks }, () => 0);
  for (const h of history) {
    const week = getStartOfWeek(new Date(h.completedAt), weekStartsOn).getTime();
    if (week < first || week > thisWeek) continue;
    const idx = Math.round((week - first) / (7 * DAY_MS));
    raw[idx] = Math.max(raw[idx], topSetWeight(h, exerciseName));
  }
  const series: number[] = [];
  for (const v of raw) {
    if (v > 0) series.push(v);
    else if (series.length > 0) series.push(series[series.length - 1]);
  }
  return series;
}
