import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { occurrencesInRange } from "../../lib/recurrence";
import { listAppointments } from "../appointments/api";
import { listMedications } from "../medications/api";
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
 * The Calendar Engine: merges medication doses + appointments + (future) custom
 * events into one sorted list for the given date range. This is what backs the
 * day/week/month views — see docs/ARCHITECTURE.md.
 */
export function useCalendarEvents(profileId: string | undefined, rangeStart: Date, rangeEnd: Date) {
  return useQuery({
    queryKey: ["calendarEvents", profileId, rangeStart.toISOString(), rangeEnd.toISOString()],
    enabled: !!profileId,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const pid = profileId as string;
      const [medications, appointments] = await Promise.all([listMedications(pid), listAppointments(pid)]);
      const doseLogs = await listDoseLogsInRange(
        medications.map((m) => m.id),
        rangeStart,
        rangeEnd
      );

      const doseLogByKey = new Map(doseLogs.map((d) => [`${d.medicationId}:${d.scheduledAt}`, d]));

      const medicationEvents: CalendarEvent[] = medications.flatMap((medication) => {
        const occurrences = occurrencesInRange(medication.recurrenceRule, rangeStart, rangeEnd, {
          startDate: new Date(medication.startDate),
          endDate: medication.endDate ? new Date(medication.endDate) : undefined,
        });
        return occurrences.map((at) => {
          const iso = at.toISOString();
          const dose = doseLogByKey.get(`${medication.id}:${iso}`) ?? {
            id: `${medication.id}:${iso}`,
            medicationId: medication.id,
            scheduledAt: iso,
            status: "pending" as const,
            loggedAt: null,
          };
          return { kind: "medication" as const, at: iso, medication, dose };
        });
      });

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
