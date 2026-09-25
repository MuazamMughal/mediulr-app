import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfLocalDay, startOfLocalDay } from "../../lib/dates";
import { listFoodTimesInRange } from "../nutrition/api";
import { listExerciseTimesInRange } from "../exercise/api";
import { buildMonthLogs, type DayLogs } from "./logic";

/**
 * Per-day meal/activity markers for the month grid. Two light timestamp-only queries (one per table) so a
 * failure in either can never affect the medication and doctor markers, which come from a separate query.
 * Same week of padding either side of the month as useMonthOverview, since the grid shows neighbouring days.
 */
export function useMonthLogs(profileId: string | undefined, month: Date): Record<string, DayLogs> | undefined {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const rangeStart = startOfLocalDay(addDays(monthStart, -7));
  const rangeEnd = endOfLocalDay(addDays(new Date(month.getFullYear(), month.getMonth() + 1, 0), 7));
  const monthKey = [profileId, monthStart.getFullYear(), monthStart.getMonth()];

  const food = useQuery({
    queryKey: ["foodEntries", "month", ...monthKey],
    queryFn: () => listFoodTimesInRange(profileId as string, rangeStart, rangeEnd),
    enabled: !!profileId,
    retry: 1,
  });
  const exercise = useQuery({
    queryKey: ["exerciseEntries", "month", ...monthKey],
    queryFn: () => listExerciseTimesInRange(profileId as string, rangeStart, rangeEnd),
    enabled: !!profileId,
    retry: 1,
  });

  return useMemo(
    () => (food.data || exercise.data ? buildMonthLogs(food.data ?? [], exercise.data ?? []) : undefined),
    [food.data, exercise.data]
  );
}
