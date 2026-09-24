import { Platform } from "react-native";

/**
 * expo-notifications throws synchronously in Expo Go on Android (SDK 53+ dropped
 * notification support there — a dev build is required, see docs/SETUP.md §6).
 * Everything here is loaded lazily and wrapped in try/catch so that limitation
 * degrades to "no reminders scheduled" instead of crashing the screen that
 * imports this module (medication/appointment forms).
 */
type NotificationsModule = typeof import("expo-notifications");

let cached: NotificationsModule | null | undefined;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (cached !== undefined) return cached;
  try {
    const mod = await import("expo-notifications");
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch (err) {
    console.warn(
      "Notifications unavailable in this environment (Expo Go on SDK 53+ needs a development build for local notifications — see docs/SETUP.md).",
      err
    );
    cached = null;
  }
  return cached;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export interface ScheduleReminderInput {
  id: string; // stable id (e.g. `${medicationId}:${scheduledAt}`) so re-scheduling replaces, not duplicates
  title: string;
  body: string;
  fireAt: Date;
}

/** Schedules a single local notification for a medication dose or appointment reminder. No-ops if unavailable. */
export async function scheduleReminder({ id, title, body, fireAt }: ScheduleReminderInput): Promise<void> {
  if (fireAt.getTime() <= Date.now()) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: Platform.OS === "ios" ? "default" : undefined },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
