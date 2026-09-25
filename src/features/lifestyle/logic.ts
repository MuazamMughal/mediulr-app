import { toLocalDateString } from "../../lib/dates";
import { formatDuration } from "../exercise/logic";
import type { CalendarEvent, ExerciseEntry, FoodEntry } from "../../types/domain";

/** What was logged on one calendar day, boiled down for the month grid's markers. */
export interface DayLogs {
  meals: number;
  activities: number;
}

/** Group log timestamps by local "YYYY-MM-DD" (the same id flash-calendar uses). */
export function buildMonthLogs(mealTimes: string[], activityTimes: string[]): Record<string, DayLogs> {
  const days: Record<string, DayLogs> = {};
  const day = (id: string) => (days[id] ??= { meals: 0, activities: 0 });
  for (const t of mealTimes) day(toLocalDateString(new Date(t))).meals += 1;
  for (const t of activityTimes) day(toLocalDateString(new Date(t))).activities += 1;
  return days;
}

/** Calm one-liners for a day: "3 meals", "45 min active". Empty when nothing was logged. */
export function summarizeLogs(food: Pick<FoodEntry, "id">[], exercise: Pick<ExerciseEntry, "durationMinutes">[]): string[] {
  const parts: string[] = [];
  if (food.length > 0) parts.push(`${food.length} ${food.length === 1 ? "meal" : "meals"}`);
  if (exercise.length > 0) {
    const minutes = exercise.reduce((sum, e) => sum + e.durationMinutes, 0);
    parts.push(`${formatDuration(minutes)} active`);
  }
  return parts;
}

/** Medications/visits plus the day's meals and activity as one time-ordered list. Returns the input untouched when there is nothing to add. */
export function mergeTimeline(
  base: CalendarEvent[],
  food: FoodEntry[] | undefined,
  exercise: ExerciseEntry[] | undefined
): CalendarEvent[] {
  if (!food?.length && !exercise?.length) return base;
  return [
    ...base,
    ...(food ?? []).map((f) => ({ kind: "food" as const, at: f.eatenAt, food: f })),
    ...(exercise ?? []).map((e) => ({ kind: "exercise" as const, at: e.startedAt, exercise: e })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
