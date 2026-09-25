import { toLocalDateString } from "../../lib/dates";
import { dosesInRange } from "../medications/schedule";
import type { Appointment, DoseLog, Medication } from "../../types/domain";

/** What's happening on one calendar day, boiled down for the month grid's dots. */
export interface DayOverview {
  doses: number;
  taken: number;
  skipped: number;
  /** Doses whose time has passed with no answer. */
  missed: number;
  visits: number;
}

const EMPTY: DayOverview = { doses: 0, taken: 0, skipped: 0, missed: 0, visits: 0 };

export function emptyOverview(): DayOverview {
  return { ...EMPTY };
}

/** A day keyed by its local "YYYY-MM-DD" id (the same id flash-calendar uses). */
export function buildMonthOverview(args: {
  medications: Medication[];
  appointments: Appointment[];
  logs: DoseLog[];
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
}): Record<string, DayOverview> {
  const now = args.now ?? new Date();
  const days: Record<string, DayOverview> = {};
  const day = (id: string) => (days[id] ??= emptyOverview());

  for (const med of args.medications) {
    for (const { at, dose } of dosesInRange(med, args.rangeStart, args.rangeEnd, args.logs)) {
      const d = day(toLocalDateString(new Date(at)));
      d.doses += 1;
      if (dose.status === "taken") d.taken += 1;
      else if (dose.status === "skipped") d.skipped += 1;
      else if (new Date(at).getTime() < now.getTime()) d.missed += 1;
    }
  }

  for (const visit of args.appointments) {
    const at = new Date(visit.scheduledAt);
    if (at >= args.rangeStart && at <= args.rangeEnd) day(toLocalDateString(at)).visits += 1;
  }

  return days;
}
