import { Platform } from "react-native";
import { ACTION, DOSE_CATEGORY, ESCALATE_CATEGORY, SNOOZE_MINUTES, isDoseNotificationId, isSnoozeId } from "./actions";

/**
 * expo-notifications throws synchronously in Expo Go on Android (SDK 53+ dropped
 * notification support there — a dev build is required, see docs/SETUP.md §6).
 * Everything here is loaded lazily and wrapped in try/catch so that limitation
 * degrades to "no reminders scheduled" instead of crashing the screen that
 * imports this module (medication/appointment forms).
 */
type NotificationsModule = typeof import("expo-notifications");

let cached: NotificationsModule | null | undefined;

/** Registers the Taken / Snooze / Skip buttons. Buttons that don't open the app let a dose be answered from the lock screen. */
async function registerActionCategories(Notifications: NotificationsModule): Promise<void> {
  const take = { identifier: ACTION.take, buttonTitle: "Taken", options: { opensAppToForeground: false } };
  const skip = { identifier: ACTION.skip, buttonTitle: "Skip", options: { opensAppToForeground: false, isDestructive: true } };
  const snooze = { identifier: ACTION.snooze, buttonTitle: `Snooze ${SNOOZE_MINUTES} min`, options: { opensAppToForeground: false } };
  // Telling a guardian opens a message, so that one button brings the app forward.
  const tell = { identifier: ACTION.tell, buttonTitle: "Tell guardian", options: { opensAppToForeground: true } };
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [take, snooze, skip]);
  await Notifications.setNotificationCategoryAsync(ESCALATE_CATEGORY, [take, tell, skip]);
}

export async function getNotifications(): Promise<NotificationsModule | null> {
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
    await registerActionCategories(mod).catch((err) => console.warn("Couldn't register notification buttons", err));
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
  /** Which action buttons to show (see actions.ts). */
  category?: string;
  /** Delivered back to the app when a button is tapped. */
  data?: Record<string, string | null>;
}

/** Schedules a single local notification for a medication dose or appointment reminder. No-ops if unavailable. */
export async function scheduleReminder({ id, title, body, fireAt, category, data }: ScheduleReminderInput): Promise<void> {
  if (fireAt.getTime() <= Date.now()) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: Platform.OS === "ios" ? "default" : undefined, categoryIdentifier: category, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

/** Cancels everything still pending for one dose — its reminder, follow-ups and snoozes — once the dose has been answered. */
export async function cancelDoseReminders(medicationId: string, scheduledAt: string | Date): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const ms = new Date(scheduledAt).getTime();
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => isDoseNotificationId(n.identifier, medicationId, ms))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined))
    );
  } catch {
    // Best effort: a reminder that fires for an answered dose is a nuisance, not an error.
  }
}

export async function cancelReminder(id: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

/**
 * Makes the device's scheduled notifications exactly `items` — nothing stale left behind (stopped medications,
 * finished courses, deleted visits). Silent no-op if notifications are unavailable or not permitted; it never
 * prompts, so it's safe to call on every app open.
 */
async function doReplaceAllReminders(source: ReminderSource): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    // Resolved only now, at the moment it is applied, so answers given while this was queued are already accounted for.
    const items = typeof source === "function" ? source() : source;
    // Snoozes are one-off and not part of the plan; leave them alone.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.filter((n) => !isSnoozeId(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined))
    );
    for (const { id, title, body, fireAt, category, data } of items) {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body, sound: Platform.OS === "ios" ? "default" : undefined, categoryIdentifier: category, data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
    }
  } catch (err) {
    console.warn("Couldn't refresh reminders", err);
  }
}

// Runs one replacement at a time so an overlapping sync can't cancel another's half-scheduled work.
let replaceQueue: Promise<void> = Promise.resolve();
export type ReminderSource = ScheduleReminderInput[] | (() => ScheduleReminderInput[]);
export function replaceAllReminders(source: ReminderSource): Promise<void> {
  replaceQueue = replaceQueue.then(() => doReplaceAllReminders(source));
  return replaceQueue;
}

/** Used on sign-out / account deletion so one person's reminders never fire on the next person's session. */
export async function cancelAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
