/**
 * Shared recurrence engine — turns a medication or appointment's recurrence_rule
 * into concrete dose/reminder timestamps. See docs/DATA_MODEL.md for the rule shapes.
 */

export type RecurrenceRule =
  | { type: "interval_hours"; every: number }
  | { type: "times_per_day"; count: number; at: string[] } // "at" = ["08:00", "14:00", "20:00"]
  | { type: "weekdays"; days: Weekday[]; at: string[] }
  | { type: "once"; at: string } // single occurrence, e.g. a one-off appointment
  /** Every month on `day` (clamped to the month's last day, so "31" still fires in February). */
  | { type: "monthly"; day: number; at: string[] }
  /** Every `every` days counting from the local date `from` ("YYYY-MM-DD"). */
  | { type: "every_n_days"; every: number; from: string; at: string[] };

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const WEEKDAY_INDEX: Record<Weekday, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function withTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Returns every scheduled occurrence between `rangeStart` and `rangeEnd` (inclusive),
 * respecting the medication/appointment's `startDate`/`endDate` window.
 */
export function occurrencesInRange(
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
  window?: { startDate?: Date; endDate?: Date }
): Date[] {
  const lowerBound = maxDate(rangeStart, window?.startDate);
  const upperBound = minDate(rangeEnd, window?.endDate);
  if (lowerBound > upperBound) return [];

  switch (rule.type) {
    case "once": {
      const occurrence = new Date(rule.at);
      return occurrence >= lowerBound && occurrence <= upperBound ? [occurrence] : [];
    }
    case "times_per_day":
      return everyDayIn(lowerBound, upperBound, rule.at);
    case "weekdays":
      return everyDayIn(lowerBound, upperBound, rule.at, (day) =>
        rule.days.includes(dayOfWeek(day))
      );
    case "interval_hours":
      return everyNHours(lowerBound, upperBound, rule.every);
    case "monthly":
      return everyMonthIn(lowerBound, upperBound, rule.day, rule.at);
    case "every_n_days":
      return everyNDaysIn(lowerBound, upperBound, rule.every, rule.from, rule.at);
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function everyMonthIn(start: Date, end: Date, day: number, times: string[]): Date[] {
  const results: Date[] = [];
  if (!(day >= 1 && day <= 31)) return results;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const dom = Math.min(day, daysInMonth(cursor.getFullYear(), cursor.getMonth()));
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), dom);
    for (const time of times) {
      const occurrence = withTime(dayStart, time);
      if (occurrence >= start && occurrence <= end) results.push(occurrence);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return results;
}

/** Whole calendar days from `a` to `b`, immune to daylight-saving shifts. */
function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

function everyNDaysIn(start: Date, end: Date, every: number, from: string, times: string[]): Date[] {
  const results: Date[] = [];
  if (!(every >= 1)) return results;
  const [y, m, d] = from.slice(0, 10).split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const diff = calendarDaysBetween(anchor, cursor);
    if (diff >= 0 && diff % every === 0) {
      for (const time of times) {
        const occurrence = withTime(cursor, time);
        if (occurrence >= start && occurrence <= end) results.push(occurrence);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function everyDayIn(
  start: Date,
  end: Date,
  times: string[],
  dayFilter: (d: Date) => boolean = () => true
): Date[] {
  const results: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    if (dayFilter(cursor)) {
      for (const time of times) {
        const occurrence = withTime(cursor, time);
        if (occurrence >= start && occurrence <= end) results.push(occurrence);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function everyNHours(start: Date, end: Date, every: number): Date[] {
  const results: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    results.push(new Date(cursor));
    cursor.setHours(cursor.getHours() + every);
  }
  return results;
}

function dayOfWeek(d: Date): Weekday {
  return (Object.keys(WEEKDAY_INDEX) as Weekday[])[d.getDay()];
}

function maxDate(a: Date, b?: Date): Date {
  return b && b > a ? b : a;
}

function minDate(a: Date, b?: Date): Date {
  return b && b < a ? b : a;
}
