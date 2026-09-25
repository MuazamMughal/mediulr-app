import { useQuery } from "@tanstack/react-query";
import { addDays, endOfLocalDay, startOfLocalDay } from "../../lib/dates";
import { listAppointments } from "../appointments/api";
import { listDoseLogsInRange, listMedications } from "../medications/api";
import { buildMonthOverview, type DayOverview } from "./overview";

/**
 * Per-day summary for the month grid. Loads a week of padding either side of the month, since the grid
 * shows trailing days from the neighbouring months. Keyed under "calendarEvents" so every dose/medication/visit
 * change that refreshes the day timeline refreshes the dots too.
 */
export function useMonthOverview(profileId: string | undefined, month: Date) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const rangeStart = startOfLocalDay(addDays(monthStart, -7));
  const rangeEnd = endOfLocalDay(addDays(new Date(month.getFullYear(), month.getMonth() + 1, 0), 7));

  return useQuery({
    queryKey: ["calendarEvents", "month", profileId, monthStart.getFullYear(), monthStart.getMonth()],
    enabled: !!profileId,
    queryFn: async (): Promise<Record<string, DayOverview>> => {
      const pid = profileId as string;
      const [medications, appointments] = await Promise.all([listMedications(pid), listAppointments(pid)]);
      const logs = await listDoseLogsInRange(medications.map((m) => m.id), rangeStart, rangeEnd);
      return buildMonthOverview({ medications, appointments, logs, rangeStart, rangeEnd });
    },
  });
}
