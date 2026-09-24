/**
 * Shared recurrence engine — turns a medication or appointment's recurrence_rule
 * into concrete dose/reminder timestamps. See docs/DATA_MODEL.md for the rule shapes.
 */

export type RecurrenceRule =
  | { type: "interval_hours"; every: number }
  | { type: "times_per_day"; count: number; at: string[] } // "at" = ["08:00", "14:00", "20:00"]
  | { type: "weekdays"; days: Weekday[]; at: string[] }
  | { type: "once"; at: string }; // single occurrence, e.g. a one-off appointment

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
  }
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
