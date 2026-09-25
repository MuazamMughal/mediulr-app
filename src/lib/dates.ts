/**
 * Local-calendar date helpers. Medication start/end dates are stored as plain "YYYY-MM-DD"
 * strings, which `new Date("YYYY-MM-DD")` would parse as UTC midnight — wrong for anyone not
 * on UTC (e.g. UTC+5 loses every dose before 5am on day one). Everything here uses local time.
 */

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → local midnight of that day. */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/** Calendar-day arithmetic that survives daylight-saving changes (unlike +/- 86,400,000 ms). */
export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** A course of `days` days starting on `start` covers `start` through `start + days - 1`, inclusive. */
export function courseEndDate(start: Date, days: number): string {
  return toLocalDateString(addDays(start, days - 1));
}

/** Whole days left including today; 0 once the course has ended. `null` for an ongoing medication. */
export function daysLeft(endDate: string | null, now: Date = new Date()): number | null {
  if (!endDate) return null;
  const end = parseLocalDate(endDate);
  const today = startOfLocalDay(now);
  const diff = Math.round((end.getTime() - today.getTime()) / 86400000);
  return Math.max(0, diff + 1);
}

/** Same instant, whatever string format it arrives in ("…Z" from JS, "…+00:00" from Postgres). */
export function instantKey(value: string | Date): number {
  return new Date(value).getTime();
}
