import { occurrencesInRange } from "../../lib/recurrence";
import { isActiveMedication, medicationWindow } from "../medications/schedule";
import { defaultRefillThreshold } from "../medications/refill";
import type { Appointment, Medication, Profile } from "../../types/domain";

export interface PlannedReminder {
  id: string;
  title: string;
  body: string;
  fireAt: Date;
  /** Which action buttons the notification carries ("dose": Taken / Snooze / Skip; "dose_escalate": Taken / Tell guardian / Skip). */
  category?: "dose" | "dose_escalate";
  /** Round-trips to the app when a button is tapped, so it knows which dose was answered. */
  data?: Record<string, string | null>;
}

/** iOS keeps at most 64 pending local notifications and silently drops the rest — stay safely under. */
export const MAX_SCHEDULED_REMINDERS = 60;
export const REMINDER_HORIZON_DAYS = 7;
/** Minutes after a dose's time that a still-unanswered dose gets a nudge; the last one offers to tell a guardian. */
export const FOLLOW_UP_MINUTES = [15, 30] as const;
/** Follow-ups only cover the next day, so they never crowd the 60-notification budget away from the next week's reminders. */
export const FOLLOW_UP_HORIZON_HOURS = 24;

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
  /** Doses already answered ("medicationId:epochMs"); they get no reminder and no follow-up, even if still in the future. */
  handledDoses?: Set<string>;
  /** Profiles with a guardian who should hear about missed doses — their last follow-up offers "Tell guardian". */
  guardianProfileIds?: Set<string>;
  /** Nudge again after a dose is left unanswered. Off unless asked for. */
  followUps?: boolean;
}): PlannedReminder[] {
  const now = args.now ?? new Date();
  const horizon = new Date(now.getTime() + REMINDER_HORIZON_DAYS * 24 * HOUR);
  const profileName = new Map(args.profiles.map((p) => [p.id, p.isSelf ? null : p.displayName]));
  const forWhom = (profileId: string) => {
    const name = profileName.get(profileId);
    return name ? ` · ${name}` : "";
  };

  const reminders: PlannedReminder[] = [];

  const handled = args.handledDoses ?? new Set<string>();
  const followUps = args.followUps ?? false;
  const followUpHorizon = new Date(now.getTime() + FOLLOW_UP_HORIZON_HOURS * HOUR);
  // A follow-up can still be due for a dose whose own time has just passed.
  const lookback = followUps ? new Date(now.getTime() - Math.max(...FOLLOW_UP_MINUTES) * 60_000) : now;

  for (const med of args.medications) {
    if (!isActiveMedication(med, now)) continue;
    const threshold = med.refillThreshold ?? defaultRefillThreshold(med.recurrenceRule);
    let supply = med.quantityOnHand; // counted down by each dose still to come
    for (const at of occurrencesInRange(med.recurrenceRule, lookback, horizon, medicationWindow(med))) {
      if (handled.has(`${med.id}:${at.getTime()}`)) continue;
      const data = {
        kind: "dose",
        medicationId: med.id,
        scheduledAt: at.toISOString(),
        profileId: med.profileId,
        medicationName: med.name,
        dosage: med.dosage,
        patientName: profileName.get(med.profileId) ?? null,
      };

      if (at.getTime() > now.getTime()) {
        let refillNote = "";
        if (supply != null) {
          supply -= 1;
          if (supply <= 0) refillNote = " · last one — time to refill";
          else if (supply <= threshold) refillNote = ` · ${supply} left, time to refill`;
        }
        reminders.push({
          id: `dose:${med.id}:${at.getTime()}`,
          title: `Time for ${med.name}`,
          body: `${med.dosage}${forWhom(med.profileId)}${refillNote}`,
          fireAt: at,
          category: "dose",
          data,
        });
      }

      if (followUps && at.getTime() <= followUpHorizon.getTime()) {
        const due = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        FOLLOW_UP_MINUTES.forEach((minutes, index) => {
          const fireAt = new Date(at.getTime() + minutes * 60_000);
          const last = index === FOLLOW_UP_MINUTES.length - 1;
          const escalate = last && !!args.guardianProfileIds?.has(med.profileId);
          reminders.push({
            id: `nag:${med.id}:${at.getTime()}:${index + 1}`,
            title: last ? `${med.name} is overdue` : `Still need to take ${med.name}?`,
            body: escalate
              ? `Due at ${due}. Tap "Tell guardian" if you'd like them to know.`
              : `Due at ${due} · ${med.dosage}${forWhom(med.profileId)}`,
            fireAt,
            category: escalate ? "dose_escalate" : "dose",
            data,
          });
        });
      }
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
