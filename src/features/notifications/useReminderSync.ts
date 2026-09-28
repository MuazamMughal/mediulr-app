import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "../../lib/dates";
import { listAllAppointmentsForUser } from "../appointments/api";
import { listAllGuardiansForUser } from "../guardians/api";
import { alertGuardians } from "../guardians/logic";
import { listAllMedicationsForUser, listDoseLogsInRange } from "../medications/api";
import { listAllRemindersForUser, listCompletionsInRange } from "../reminders/api";
import { reminderKey } from "../reminders/schedule";
import { useI18n } from "../../i18n/LocaleProvider";
import { doseOutbox } from "../offline/doseOutbox";
import { doseKey } from "../offline/outbox";
import { pendingDoseKeys } from "../offline/overlay";
import { usePendingEdits } from "../offline/useEditSync";
import { useProfiles } from "../profile/useProfiles";
import { usePreferences } from "../preferences/Preferences";
import { REMINDER_HORIZON_DAYS, planReminders } from "./plan";
import { refreshActionCategories, replaceAllReminders } from "./scheduleNotifications";

/**
 * Keeps scheduled reminders in step with the data: re-plans whenever medications, visits, guardians or the
 * follow-up setting change, and again each time the app returns to the foreground (the plan is a rolling
 * 7-day window, so it must renew).
 *
 * Doses already answered are left out — including ones taken early and answers still waiting in the offline queue —
 * so a taken dose never reminds again. If today's answers can't be fetched (no signal) the existing schedule is
 * left exactly as it is rather than rebuilt from incomplete information.
 */
export function useReminderSync() {
  const { data: profiles } = useProfiles();
  const { prefs } = usePreferences();
  const i18n = useI18n();
  const pendingEdits = usePendingEdits();
  const { data: medications } = useQuery({ queryKey: ["medications", "all-profiles"], queryFn: listAllMedicationsForUser });
  const { data: appointments } = useQuery({ queryKey: ["appointments", "all-profiles"], queryFn: listAllAppointmentsForUser });
  // Optional: without guardians (or before that table exists) reminders just don't offer "Tell guardian".
  const { data: guardians } = useQuery({ queryKey: ["guardians", "all-profiles"], queryFn: listAllGuardiansForUser, retry: 1 });

  // Optional: without custom reminders (or before that table exists) everything else is scheduled as usual.
  const { data: customReminders } = useQuery({ queryKey: ["customReminders", "all-profiles"], queryFn: listAllRemindersForUser, retry: 1 });

  // Button labels follow the language.
  useEffect(() => {
    refreshActionCategories();
  }, [i18n.locale]);

  useEffect(() => {
    if (!profiles || !medications || !appointments) return;
    const guardianProfileIds = new Set(alertGuardians(guardians).map((g) => g.profileId));

    const sync = async () => {
      const now = new Date();
      let handled: Set<string>;
      const completedReminders = new Set<string>();
      try {
        const from = new Date(now.getTime() - 3600_000);
        const to = addDays(now, REMINDER_HORIZON_DAYS + 1);
        const logs = await listDoseLogsInRange(
          medications.map((m) => m.id),
          from,
          to
        );
        handled = new Set(logs.filter((l) => l.status === "taken" || l.status === "skipped").map((l) => doseKey(l.medicationId, l.scheduledAt)));
        if (customReminders?.length) {
          const done = await listCompletionsInRange(customReminders.map((r) => r.id), from, to);
          for (const c of done) completedReminders.add(reminderKey(c.reminderId, c.scheduledAt));
        }
      } catch {
        return;
      }
      await replaceAllReminders(() => {
        // Read the queue at the moment of applying, so an answer given a moment ago is respected.
        const answered = new Set([...handled, ...pendingDoseKeys(doseOutbox.list())]);
        return planReminders({
          medications,
          appointments,
          profiles,
          handledDoses: answered,
          guardianProfileIds,
          followUps: prefs.followUps,
          customReminders,
          completedReminders,
          i18n,
        });
      });
    };

    sync();
    const sub = AppState.addEventListener("change", (state) => state === "active" && sync());
    return () => sub.remove();
  }, [profiles, medications, appointments, guardians, prefs.followUps, customReminders, i18n, pendingEdits]);
}
