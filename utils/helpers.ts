import { WeekStart } from "@/types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(date: Date): string {
  // Use local timezone, not UTC, to avoid off-by-one date issues
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getToday(): string {
  return formatDate(new Date());
}

/** Local YYYY-MM-DD for `offset` days from today (negative = past). */
export function dateOffsetFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}

export function getTodayWeekDay(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Rough duration for a routine. Compound work with rest runs closer to
 * 7 minutes per exercise than 5, plus warm-up — this matches what the
 * screens were already adding on ad hoc.
 */
export function estimateRoutineDuration(exerciseCount: number, setCount?: number): number {
  if (exerciseCount <= 0) return 0;
  const sets = setCount && setCount > 0 ? setCount : exerciseCount * 3;
  // ~2.5 min per working set (work + rest), plus a 8 min warm-up.
  return Math.round(sets * 2.5 + 8);
}

// ─── Week boundaries ────────────────────────────────────────
// Weekly stats used to be Sunday-anchored while the activity calendar was
// rendered Monday-first, so the two disagreed about which week a workout
// belonged to. Both now read the user's `weekStartsOn` setting.

export function weekStartIndex(weekStartsOn: WeekStart): number {
  return weekStartsOn === "monday" ? 1 : 0;
}

/** Midnight at the start of the week containing `date`. */
export function getStartOfWeek(date: Date, weekStartsOn: WeekStart = "monday"): Date {
  const d = new Date(date);
  const start = weekStartIndex(weekStartsOn);
  const diff = (d.getDay() - start + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Weekday initials in the user's week order, e.g. M T W T F S S. */
export function weekdayInitials(weekStartsOn: WeekStart = "monday"): string[] {
  const base = ["S", "M", "T", "W", "T", "F", "S"];
  const start = weekStartIndex(weekStartsOn);
  return [...base.slice(start), ...base.slice(0, start)];
}

export function getMonthCalendarDates(
  weekStartsOn: WeekStart = "monday"
): { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = weekStartIndex(weekStartsOn);
  const startPad = (firstDay.getDay() - start + 7) % 7;
  const dates: { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    dates.push({ date: formatDate(d), dayOfMonth: d.getDate(), isCurrentMonth: false });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    dates.push({ date: formatDate(d), dayOfMonth: i, isCurrentMonth: true });
  }

  const remaining = 7 - (dates.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      dates.push({ date: formatDate(d), dayOfMonth: i, isCurrentMonth: false });
    }
  }

  return dates;
}

export function getCurrentMonthName(): string {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
}

/** "Mon, Aug 24" */
export function formatShortDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Today" / "Yesterday" / "3 days ago" / "Mon, Aug 24" */
export function formatRelativeDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const iso = formatDate(d);
  if (iso === getToday()) return "Today";
  if (iso === dateOffsetFromToday(-1)) return "Yesterday";

  const days = Math.round(
    (new Date(getToday()).getTime() - new Date(iso).getTime()) / 86_400_000
  );
  if (days > 1 && days < 7) return `${days} days ago`;
  return formatShortDate(d);
}

/** Total minutes rendered as "1h 20m" / "45m". */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}m`;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** mm:ss for the live workout clock. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
