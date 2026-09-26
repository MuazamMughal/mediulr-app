/** Clock-time helpers for the in-app time picker (12-hour display, 24-hour storage). */

export interface TimeParts {
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
}

export function to12Hour(hour24: number): { hour12: number; pm: boolean } {
  const pm = hour24 >= 12;
  const h = hour24 % 12;
  return { hour12: h === 0 ? 12 : h, pm };
}

export function from12Hour(hour12: number, pm: boolean): number {
  return (hour12 % 12) + (pm ? 12 : 0);
}

/** Moves a time by whole minutes, carrying into the hour and wrapping around midnight. */
export function shiftMinutes({ hour, minute }: TimeParts, delta: number): TimeParts {
  const total = (((hour * 60 + minute + delta) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** "8:05 AM" — the same wording everywhere, whatever the device locale. */
export function formatTimeParts({ hour, minute }: TimeParts): string {
  const { hour12, pm } = to12Hour(hour);
  return `${hour12}:${String(minute).padStart(2, "0")} ${pm ? "PM" : "AM"}`;
}

/** "08:00" ⇄ parts, the format medication schedules are stored in. */
export function parseHHMM(value: string): TimeParts {
  const [h, m] = value.split(":").map(Number);
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

export function toHHMM({ hour, minute }: TimeParts): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Same day as `date`, with the clock time replaced. */
export function withClockTime(date: Date, { hour, minute }: TimeParts): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Same clock time as `time`, on the calendar day of `day`. */
export function withCalendarDay(time: Date, day: Date): Date {
  const d = new Date(time);
  d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return d;
}
