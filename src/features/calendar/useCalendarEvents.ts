import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { listAppointments } from "../appointments/api";
import { listMedications } from "../medications/api";
import { dosesInRange } from "../medications/schedule";
import type { CalendarEvent, DoseLog } from "../../types/domain";

async function listDoseLogsInRange(medicationIds: string[], start: Date, end: Date): Promise<DoseLog[]> {
  if (medicationIds.length === 0) return [];
  const { data, error } = await supabase
    .from("dose_logs")
    .select("*")
    .in("medication_id", medicationIds)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString());
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    loggedAt: row.logged_at,
  }));
}

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
