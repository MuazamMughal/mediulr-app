import { useEffect } from "react";
import { doseActionFrom, parseDoseData, SNOOZE_MINUTES, ACTION } from "./actions";
import { cancelDoseReminders, getNotifications, scheduleReminder } from "./scheduleNotifications";
import { submitDose } from "../offline/submitDose";
import { listGuardians } from "../guardians/api";
import { alertGuardians } from "../guardians/logic";
import { tellGuardians } from "../guardians/tellGuardians";

type Response = import("expo-notifications").NotificationResponse;

const handled = new Set<string>();
const warn = (err: unknown) => console.warn("Notification buttons unavailable", err);

async function handleResponse(response: Response): Promise<void> {
  // The same tap can arrive twice (live listener and "last response" on launch); act once.
  const key = `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
  if (handled.has(key)) return;
  handled.add(key);

  const action = doseActionFrom(response.actionIdentifier);
  const data = parseDoseData(response.notification.request.content.data);
  if (!action || !data) return; // a plain tap just opens the app

  const dose = { medicationId: data.medicationId, scheduledAt: data.scheduledAt };

  if (action === ACTION.take || action === ACTION.skip) {
    // Answered: stop this dose's follow-ups now, then save (queued if there's no signal).
    void submitDose({ ...dose, status: action === ACTION.take ? "taken" : "skipped" });
    await cancelDoseReminders(data.medicationId, data.scheduledAt);
    return;
  }

  if (action === ACTION.snooze) {
    await scheduleReminder({
      id: `snooze:${data.medicationId}:${new Date(data.scheduledAt).getTime()}:${Date.now()}`,
      title: `Time for ${data.medicationName}`,
      body: `Snoozed · ${data.dosage}${data.patientName ? ` · ${data.patientName}` : ""}`,
      fireAt: new Date(Date.now() + SNOOZE_MINUTES * 60_000),
      category: "dose",
      data: { kind: "dose", ...data },
    });
    return;
  }

  if (action === ACTION.tell) {
    try {
      const toTell = alertGuardians(await listGuardians(data.profileId));
      await tellGuardians(toTell, {
        patientName: data.patientName,
        medicationName: data.medicationName,
        dosage: data.dosage,
        scheduledAt: new Date(data.scheduledAt),
      });
    } catch (err) {
      console.warn("Couldn't open the guardian message", err);
    }
  }
}

/**
 * Makes the notification buttons work: Taken / Skip save the answer and stop that dose's follow-ups, Snooze
 * schedules another reminder, "Tell guardian" opens a prefilled message. Mounted once at the root, so it works
 * whichever screen the app is on.
 */
export function useNotificationActions() {
  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    (async () => {
      // Notifications are a convenience layer: if any of this is unavailable (web, Expo Go, a missing native
      // module), the app carries on without buttons rather than reporting an error.
      try {
        const Notifications = await getNotifications();
        if (!Notifications || cancelled) return;
        subscription = Notifications.addNotificationResponseReceivedListener((r) => void handleResponse(r).catch(warn));
        // A button tapped while the app was closed is waiting here.
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          await handleResponse(last);
          await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        }
      } catch (err) {
        warn(err);
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);
}
