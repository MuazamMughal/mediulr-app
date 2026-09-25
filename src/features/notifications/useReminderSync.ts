import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "../../lib/dates";
import { listAllAppointmentsForUser } from "../appointments/api";
import { listAllGuardiansForUser } from "../guardians/api";
import { alertGuardians } from "../guardians/logic";
import { listAllMedicationsForUser, listDoseLogsInRange } from "../medications/api";
import { doseOutbox } from "../offline/doseOutbox";
import { doseKey } from "../offline/outbox";
import { pendingDoseKeys } from "../offline/overlay";
import { useProfiles } from "../profile/useProfiles";
import { usePreferences } from "../preferences/Preferences";
import { REMINDER_HORIZON_DAYS, planReminders } from "./plan";
import { replaceAllReminders } from "./scheduleNotifications";

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
  const { data: medications } = useQuery({ queryKey: ["medications", "all-profiles"], queryFn: listAllMedicationsForUser });
  const { data: appointments } = useQuery({ queryKey: ["appointments", "all-profiles"], queryFn: listAllAppointmentsForUser });
  // Optional: without guardians (or before that table exists) reminders just don't offer "Tell guardian".
  const { data: guardians } = useQuery({ queryKey: ["guardians", "all-profiles"], queryFn: listAllGuardiansForUser, retry: 1 });

  useEffect(() => {
    if (!profiles || !medications || !appointments) return;
    const guardianProfileIds = new Set(alertGuardians(guardians).map((g) => g.profileId));

    const sync = async () => {
      const now = new Date();
      let handled: Set<string>;
      try {
        const logs = await listDoseLogsInRange(
          medications.map((m) => m.id),
          new Date(now.getTime() - 3600_000),
          addDays(now, REMINDER_HORIZON_DAYS + 1)
        );
        handled = new Set(logs.filter((l) => l.status === "taken" || l.status === "skipped").map((l) => doseKey(l.medicationId, l.scheduledAt)));
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
        });
      });
    };

    sync();
    const sub = AppState.addEventListener("change", (state) => state === "active" && sync());
    return () => sub.remove();
  }, [profiles, medications, appointments, guardians, prefs.followUps]);
}
