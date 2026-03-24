import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Post-workout congratulations ────────────────────────────────
const COMPLETION_MESSAGES = [
  { title: "Workout Complete", body: "Great work today! Consistency builds results." },
  { title: "Session Done", body: "Another workout in the books. Keep it up!" },
  { title: "Crushed It", body: "That's how it's done. Rest up and recover." },
  { title: "Strong Finish", body: "You showed up and put in the work. That's what counts." },
  { title: "Well Done", body: "Your future self will thank you for today's effort." },
];

export async function sendWorkoutCompleteNotification(
  exerciseCount: number,
  duration: number,
  newPRs: number,
) {
  const base = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
  let body = base.body;

  if (newPRs > 0) {
    body = `New personal record${newPRs > 1 ? "s" : ""}! ${body}`;
  }
  if (duration > 0) {
    body += ` (${exerciseCount} exercises, ${duration} min)`;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: base.title,
      body,
      sound: "default",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}

// ── Streak milestone notifications ──────────────────────────────
export async function sendStreakMilestoneNotification(streak: number) {
  if (![3, 5, 7, 10, 14, 21, 30, 50, 75, 100].includes(streak)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${streak}-Day Streak!`,
      body: `You've worked out ${streak} days in a row. Incredible discipline.`,
      sound: "default",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
}

// ── Daily workout reminder ──────────────────────────────────────
const REMINDER_MESSAGES = [
  "You haven't trained yet today. Even a short session counts.",
  "No workout logged today. Time to get moving?",
  "Your routine is waiting. Show up for yourself today.",
  "Rest days are important, but is today one? Don't skip what you planned.",
  "Consistency beats intensity. A quick session is better than none.",
];

export async function scheduleDailyReminder() {
  // Cancel any existing daily reminders first
  await cancelDailyReminder();

  // Schedule for 6:00 PM every day
  await Notifications.scheduleNotificationAsync({
    identifier: "daily-workout-reminder",
    content: {
      title: "Time to Train",
      body: REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)],
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync("daily-workout-reminder").catch(() => {});
}

// ── Weekly summary (scheduled for Sunday evening) ───────────────
export async function scheduleWeeklySummary() {
  await Notifications.cancelScheduledNotificationAsync("weekly-summary").catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: "weekly-summary",
    content: {
      title: "Weekly Recap",
      body: "Check your progress tab to see how this week went.",
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 20,
      minute: 0,
    },
  });
}

// ── Setup all scheduled notifications ───────────────────────────
export async function setupNotifications() {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await scheduleDailyReminder();
  await scheduleWeeklySummary();
  return true;
}

// ── Tear down all notifications ─────────────────────────────────
export async function disableAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
