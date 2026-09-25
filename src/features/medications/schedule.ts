import { endOfLocalDay, instantKey, parseLocalDate, startOfLocalDay } from "../../lib/dates";
import { occurrencesInRange } from "../../lib/recurrence";
import type { DoseLog, Medication } from "../../types/domain";

/** Still taking it: not stopped by the user, and the course (if it has an end date) hasn't finished. */
export function isActiveMedication(med: Medication, now: Date = new Date()): boolean {
  if (med.archivedAt) return false;
  if (med.endDate && endOfLocalDay(parseLocalDate(med.endDate)).getTime() < now.getTime()) return false;
  return true;
}

/**
 * The exact span in which this medication produces doses:
 *  - starts at the beginning of its start day, but never before it was created (adding a medication at 3pm
 *    must not retroactively create a "missed" 8am dose);
 *  - ends at the end of its last course day, or the moment it was stopped — whichever is earlier.
 */
export function medicationWindow(med: Medication): { startDate: Date; endDate?: Date } {
  const created = new Date(med.createdAt);
  const dayStart = startOfLocalDay(parseLocalDate(med.startDate));
  const startDate = created.getTime() > dayStart.getTime() ? created : dayStart;

  let endDate: Date | undefined = med.endDate ? endOfLocalDay(parseLocalDate(med.endDate)) : undefined;
  if (med.archivedAt) {
    const stopped = new Date(med.archivedAt);
    if (!endDate || stopped.getTime() < endDate.getTime()) endDate = stopped;
  }
  return { startDate, endDate };
}

export interface DoseOccurrence {
  at: string; // ISO instant
  dose: DoseLog;
}

/** Every dose of `med` between rangeStart and rangeEnd, each paired with its saved status (or a pending placeholder). */
export function dosesInRange(med: Medication, rangeStart: Date, rangeEnd: Date, logs: DoseLog[]): DoseOccurrence[] {
  // Postgres returns "…+00:00", JS produces "…Z" — compare instants, never strings.
  const logByInstant = new Map(
    logs.filter((l) => l.medicationId === med.id).map((l) => [instantKey(l.scheduledAt), l])
  );

  return occurrencesInRange(med.recurrenceRule, rangeStart, rangeEnd, medicationWindow(med)).map((date) => {
    const iso = date.toISOString();
    const dose = logByInstant.get(date.getTime()) ?? {
      id: `${med.id}:${iso}`,
      medicationId: med.id,
      scheduledAt: iso,
      status: "pending" as const,
      loggedAt: null,
    };
    return { at: iso, dose };
  });
}
