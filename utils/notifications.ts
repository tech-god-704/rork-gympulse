import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

const DAILY_REMINDER_ID = "daily-workout-reminder";
const REST_DAY_NUDGE_ID = "daily-workout-reminder-tomorrow";
const WEEKLY_SUMMARY_ID = "weekly-summary";

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

/** Whether the OS will actually deliver anything. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web" || !Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
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
  if (duration > 0 && exerciseCount > 0) {
    body += ` (${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}, ${duration} min)`;
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

function pickReminder(): string {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

export interface ReminderOptions {
  /** Hour of day (0-23) to nudge at. */
  reminderHour: number;
  /** True if the user has already completed a workout today. */
  trainedToday: boolean;
}

async function cancel(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/**
 * Schedule the training nudge.
 *
 * The reminder text asserts "you haven't trained yet today", but it used to be
 * a plain repeating daily trigger — so it fired at 6pm and said that even on
 * days the user had already finished a workout. When today is already done we
 * cancel the repeating reminder and schedule a one-off for tomorrow instead;
 * the repeating schedule is restored the next time the app opens untrained.
 */
export async function refreshDailyReminder(options: ReminderOptions) {
  const hour = Math.min(23, Math.max(0, Math.round(options.reminderHour)));
  await cancel(DAILY_REMINDER_ID);
  await cancel(REST_DAY_NUDGE_ID);

  if (options.trainedToday) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(hour, 0, 0, 0);
    await Notifications.scheduleNotificationAsync({
      identifier: REST_DAY_NUDGE_ID,
      content: {
        title: "Time to Train",
        body: pickReminder(),
        sound: "default",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Time to Train",
      body: pickReminder(),
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder() {
  await cancel(DAILY_REMINDER_ID);
  await cancel(REST_DAY_NUDGE_ID);
}

// ── Weekly summary (scheduled for Sunday evening) ───────────────
export async function scheduleWeeklySummary() {
  await cancel(WEEKLY_SUMMARY_ID);

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_SUMMARY_ID,
    content: {
      title: "Weekly Recap",
      body: "Check your progress tab to see how this week went.",
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (expo-notifications weekdays are 1-indexed from Sunday)
      hour: 20,
      minute: 0,
    },
  });
}

// ── Setup all scheduled notifications ───────────────────────────
export async function setupNotifications(options: ReminderOptions) {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await refreshDailyReminder(options);
  await scheduleWeeklySummary();
  return true;
}

// ── Tear down all notifications ─────────────────────────────────
export async function disableAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
