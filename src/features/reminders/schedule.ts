import { endOfLocalDay, instantKey, parseLocalDate, startOfLocalDay } from "../../lib/dates";
import { occurrencesInRange } from "../../lib/recurrence";
import type { CustomReminder, ReminderCompletion } from "../../types/domain";

/** "reminderId:epochMs" — how an occurrence is identified everywhere (completions, notifications). */
export const reminderKey = (reminderId: string, at: string | Date) => `${reminderId}:${new Date(at).getTime()}`;

/**
 * The span in which a reminder produces occurrences. A one-off has none (its own time is the whole story — even a
 * time already past). A repeating one starts at the beginning of its start day, but never before it was created
 * (adding it at 3pm must not conjure an "overdue" 8am), and ends at the end of its end day if it has one.
 */
export function reminderWindow(r: CustomReminder): { startDate?: Date; endDate?: Date } {
  if (r.recurrenceRule.type === "once") return {};
  const created = new Date(r.createdAt);
  const dayStart = startOfLocalDay(parseLocalDate(r.startDate));
  return {
    startDate: created.getTime() > dayStart.getTime() ? created : dayStart,
    endDate: r.endDate ? endOfLocalDay(parseLocalDate(r.endDate)) : undefined,
  };
}

export function reminderOccurrences(r: CustomReminder, rangeStart: Date, rangeEnd: Date): Date[] {
  return occurrencesInRange(r.recurrenceRule, rangeStart, rangeEnd, reminderWindow(r));
}

export interface ReminderOccurrence {
  at: string; // ISO instant
  reminder: CustomReminder;
  done: boolean;
}

/** Every occurrence in the range across the given reminders, each marked done if it has been ticked off. */
export function remindersInRange(reminders: CustomReminder[], rangeStart: Date, rangeEnd: Date, completions: ReminderCompletion[]): ReminderOccurrence[] {
  const done = new Set(completions.map((c) => reminderKey(c.reminderId, c.scheduledAt)));
  return reminders
    .flatMap((reminder) =>
      reminderOccurrences(reminder, rangeStart, rangeEnd).map((date) => ({
        at: date.toISOString(),
        reminder,
        done: done.has(reminderKey(reminder.id, date)),
      }))
    )
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** The next time this reminder is due at or after `now`, or null when it never will be again. */
export function nextOccurrence(r: CustomReminder, now: Date = new Date()): Date | null {
  const horizon = new Date(now.getTime() + 400 * 86400000); // covers yearly-ish gaps such as "every 365 days"
  return reminderOccurrences(r, now, horizon)[0] ?? null;
}

export { instantKey };
