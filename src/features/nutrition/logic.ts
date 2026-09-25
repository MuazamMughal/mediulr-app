import type { FoodEntry, MealType } from "../../types/domain";

/** The meal a person most likely means at this hour, so the common case needs zero taps. */
export function mealTypeForHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "snack";
  if (hour >= 18 && hour < 22) return "dinner";
  return "snack";
}

export interface RecentFood {
  name: string;
  quantity: string | null;
}

/** Distinct foods from the most recent entries (newest first in, newest first out), matched ignoring case. */
export function recentFoods(entriesNewestFirst: FoodEntry[], limit = 8): RecentFood[] {
  const seen = new Set<string>();
  const result: RecentFood[] = [];
  for (const entry of entriesNewestFirst) {
    const key = entry.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ name: entry.name.trim(), quantity: entry.quantity });
    if (result.length >= limit) break;
  }
  return result;
}
