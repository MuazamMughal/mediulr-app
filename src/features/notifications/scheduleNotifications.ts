import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
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

/** Schedules a single local notification for a medication dose or appointment reminder. */
export async function scheduleReminder({ id, title, body, fireAt }: ScheduleReminderInput): Promise<void> {
  if (fireAt.getTime() <= Date.now()) return;

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: Platform.OS === "ios" ? "default" : undefined },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
