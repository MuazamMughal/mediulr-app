import { startOfLocalDay } from "./dates";

/** `date`'s calendar day with `time`'s clock time (local). Used to combine the separate date and time pickers. */
export function withTimeOf(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/** "Today", "Yesterday", "Tomorrow", otherwise "Mon, Sep 22". */
export function relativeDayLabel(day: Date, now: Date = new Date()): string {
  const diff = Math.round((startOfLocalDay(day).getTime() - startOfLocalDay(now).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
