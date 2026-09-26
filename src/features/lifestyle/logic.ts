import { toLocalDateString } from "../../lib/dates";
import { formatDuration } from "../exercise/logic";
import { getI18n, type I18n } from "../../i18n";
import type { CalendarEvent, ExerciseEntry, FoodEntry } from "../../types/domain";
import type { ReminderOccurrence } from "../reminders/schedule";

/** What was logged on one calendar day, boiled down for the month grid's markers. */
export interface DayLogs {
  meals: number;
  activities: number;
  reminders: number;
}

/** Group log timestamps by local "YYYY-MM-DD" (the same id flash-calendar uses). */
export function buildMonthLogs(mealTimes: string[], activityTimes: string[], reminderTimes: string[] = []): Record<string, DayLogs> {
  const days: Record<string, DayLogs> = {};
  const day = (id: string) => (days[id] ??= { meals: 0, activities: 0, reminders: 0 });
  for (const t of mealTimes) day(toLocalDateString(new Date(t))).meals += 1;
  for (const t of activityTimes) day(toLocalDateString(new Date(t))).activities += 1;
  for (const t of reminderTimes) day(toLocalDateString(new Date(t))).reminders += 1;
  return days;
}

/** Calm one-liners for a day: "3 meals", "45 min active". Empty when nothing was logged. */
export function summarizeLogs(food: Pick<FoodEntry, "id">[], exercise: Pick<ExerciseEntry, "durationMinutes">[], i18n: I18n = getI18n()): string[] {
  const parts: string[] = [];
  if (food.length > 0) parts.push(i18n.tn("lifestyle.meals", food.length));
  if (exercise.length > 0) {
    const minutes = exercise.reduce((sum, e) => sum + e.durationMinutes, 0);
    parts.push(i18n.t("lifestyle.activeFor", { duration: formatDuration(minutes, i18n) }));
  }
  return parts;
}

/** Medications/visits plus the day's meals and activity as one time-ordered list. Returns the input untouched when there is nothing to add. */
export function mergeTimeline(
  base: CalendarEvent[],
  food: FoodEntry[] | undefined,
  exercise: ExerciseEntry[] | undefined,
  reminders?: ReminderOccurrence[]
): CalendarEvent[] {
  if (!food?.length && !exercise?.length && !reminders?.length) return base;
  return [
    ...base,
    ...(food ?? []).map((f) => ({ kind: "food" as const, at: f.eatenAt, food: f })),
    ...(exercise ?? []).map((e) => ({ kind: "exercise" as const, at: e.startedAt, exercise: e })),
    ...(reminders ?? []).map((r) => ({ kind: "reminder" as const, at: r.at, reminder: r.reminder, done: r.done })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
