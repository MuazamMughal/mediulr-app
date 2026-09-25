import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "../appointments/api";
import { listDoseLogsInRange, listMedications } from "../medications/api";
import { dosesInRange } from "../medications/schedule";
import type { CalendarEvent } from "../../types/domain";

/**
 * The Calendar Engine: merges medication doses and appointments into one time-sorted list for the range.
 * Includes stopped/finished medications so past days keep their history; each medication's own window
 * (start, course end, stop time) decides which days it appears on.
 */
export function useCalendarEvents(profileId: string | undefined, rangeStart: Date, rangeEnd: Date) {
  return useQuery({
    queryKey: ["calendarEvents", profileId, rangeStart.toISOString(), rangeEnd.toISOString()],
    enabled: !!profileId,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const pid = profileId as string;
      const [medications, appointments] = await Promise.all([listMedications(pid), listAppointments(pid)]);
      const logs = await listDoseLogsInRange(
        medications.map((m) => m.id),
        rangeStart,
        rangeEnd
      );

      const medicationEvents: CalendarEvent[] = medications.flatMap((medication) =>
        dosesInRange(medication, rangeStart, rangeEnd, logs).map(({ at, dose }) => ({
          kind: "medication" as const,
          at,
          medication,
          dose,
        }))
      );

      const appointmentEvents: CalendarEvent[] = appointments
        .filter((a) => {
          const at = new Date(a.scheduledAt);
          return at >= rangeStart && at <= rangeEnd;
        })
        .map((appointment) => ({ kind: "appointment" as const, at: appointment.scheduledAt, appointment }));

      return [...medicationEvents, ...appointmentEvents].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
      );
    },
  });
}
