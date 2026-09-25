import type { ExerciseEntry, ExerciseType } from "../../types/domain";

const LABELS: Record<ExerciseType, string> = {
  walking: "Walking",
  running: "Running",
  cycling: "Cycling",
  gym: "Gym",
  strength: "Strength training",
  yoga: "Yoga",
  stretching: "Stretching",
  swimming: "Swimming",
  sports: "Sports",
  other: "Exercise",
};

/** "30 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`;
}

/** What to call an entry: the custom label if there is one, otherwise the type's name. */
export function exerciseTitle(entry: Pick<ExerciseEntry, "name" | "exerciseType">): string {
  return entry.name?.trim() || LABELS[entry.exerciseType];
}

export function totalMinutes(entries: Pick<ExerciseEntry, "durationMinutes">[]): number {
  return entries.reduce((sum, e) => sum + e.durationMinutes, 0);
}

export const MAX_EXERCISE_MINUTES = 1440;

/** Minutes typed into the custom-duration box, or null unless it is a whole number from 1 to 1440. */
export function parseCustomMinutes(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number.parseInt(text, 10);
  return n >= 1 && n <= MAX_EXERCISE_MINUTES ? n : null;
}
