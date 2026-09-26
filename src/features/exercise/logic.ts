import { getI18n, type I18n } from "../../i18n";
import type { ExerciseEntry, ExerciseType } from "../../types/domain";

/** "30 min", "1 hr", "1 hr 30 min" (in the current language). */
export function formatDuration(minutes: number, { t }: Pick<I18n, "t"> = getI18n()): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return t("duration.min", { n: m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? t("duration.hr", { n: h }) : t("duration.hrMin", { h, m: rest });
}

/** What to call an entry: the custom label if there is one, otherwise the type's name. */
export function exerciseTitle(entry: Pick<ExerciseEntry, "name" | "exerciseType">, { t }: Pick<I18n, "t"> = getI18n()): string {
  const custom = entry.name?.trim();
  if (custom) return custom;
  return entry.exerciseType === "strength" ? t("exercise.title.strength") : entry.exerciseType === "other" ? t("exercise.generic") : t(`exercise.type.${entry.exerciseType}` as "exercise.type.walking");
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

export type { ExerciseType };
