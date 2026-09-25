import { occurrencesInRange } from "../../lib/recurrence";
import { isActiveMedication, medicationWindow } from "../medications/schedule";
import type { Appointment, Medication, Profile } from "../../types/domain";

export interface PlannedReminder {
  id: string;
  title: string;
  body: string;
  fireAt: Date;
}

/** iOS keeps at most 64 pending local notifications and silently drops the rest — stay safely under. */
export const MAX_SCHEDULED_REMINDERS = 60;
export const REMINDER_HORIZON_DAYS = 7;

const HOUR = 3600_000;

/**
 * Everything that should be scheduled right now: the next week of doses for every active medication
 * (course end and stop time respected) plus a day-before and hour-before reminder for each upcoming visit,
 * soonest first, capped. Re-run on every change and on app open so reminders never quietly run out.
 */
export function planReminders(args: {
  medications: Medication[];
  appointments: Appointment[];
  profiles: Profile[];
  now?: Date;
}): PlannedReminder[] {
  const now = args.now ?? new Date();
  const horizon = new Date(now.getTime() + REMINDER_HORIZON_DAYS * 24 * HOUR);
  const profileName = new Map(args.profiles.map((p) => [p.id, p.isSelf ? null : p.displayName]));
  const forWhom = (profileId: string) => {
    const name = profileName.get(profileId);
    return name ? ` · ${name}` : "";
  };

  const reminders: PlannedReminder[] = [];

  for (const med of args.medications) {
    if (!isActiveMedication(med, now)) continue;
    for (const at of occurrencesInRange(med.recurrenceRule, now, horizon, medicationWindow(med))) {
      reminders.push({
        id: `dose:${med.id}:${at.getTime()}`,
        title: `Time for ${med.name}`,
        body: `${med.dosage}${forWhom(med.profileId)}`,
        fireAt: at,
      });
    }
  }

  for (const visit of args.appointments) {
    const at = new Date(visit.scheduledAt);
    const detail = `${visit.specialty ?? "Doctor visit"}${forWhom(visit.profileId)}`;
    for (const [suffix, fireAt] of [
      ["day", new Date(at.getTime() - 24 * HOUR)],
      ["hour", new Date(at.getTime() - HOUR)],
    ] as const) {
      if (fireAt.getTime() > now.getTime()) {
        reminders.push({
          id: `visit:${visit.id}:${suffix}`,
          title: `Upcoming visit: ${visit.providerName}`,
          body: detail,
          fireAt,
        });
      }
    }
  }

  return reminders
    .filter((r) => r.fireAt.getTime() > now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);
}
