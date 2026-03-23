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

export function getDayOfWeek(): number {
  return new Date().getDay();
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

export function estimateRoutineDuration(exerciseCount: number): number {
  return exerciseCount * 5;
}

export function getMonthCalendarDates(): { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Convert Sunday=0 to Monday-start: Mon=0, Tue=1, ..., Sun=6
  const startPad = (firstDay.getDay() + 6) % 7;
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
