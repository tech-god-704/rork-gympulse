export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getToday(): string {
  return formatDate(new Date());
}

export function getDayOfWeek(): number {
  return new Date().getDay();
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

export function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.floor(diff / oneWeek);
}

export function getLastNWeeksDates(n: number): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  for (let w = n - 1; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + d));
      week.push(formatDate(date));
    }
    weeks.push(week);
  }
  return weeks;
}

export function getMonthCalendarDates(): { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
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
