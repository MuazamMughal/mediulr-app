import { doseKey, type PendingDose } from "./outbox";
import type { CalendarEvent, DoseLog } from "../../types/domain";

/** Shows queued answers as if they were already saved, so tapping "Taken" offline looks and feels instant. */
export function applyPendingDoses(events: CalendarEvent[], pending: PendingDose[]): CalendarEvent[] {
  if (pending.length === 0) return events;
  const byKey = new Map(pending.map((p) => [doseKey(p.medicationId, p.scheduledAt), p]));
  let changed = false;
  const result = events.map((event) => {
    if (event.kind !== "medication") return event;
    const p = byKey.get(doseKey(event.medication.id, event.at));
    if (!p || event.dose.status === p.status) return event;
    changed = true;
    return { ...event, dose: { ...event.dose, status: p.status, loggedAt: new Date(p.queuedAt).toISOString() } };
  });
  return changed ? result : events;
}

/** Dose keys the person has already answered (taken or skipped), for keeping reminders off them. */
export function pendingDoseKeys(pending: PendingDose[]): Set<string> {
  return new Set(pending.map((p) => doseKey(p.medicationId, p.scheduledAt)));
}

/**
 * Writes a just-saved answer into an already-loaded day of events. Done at the moment the queue entry is
 * dropped, so the row never snaps back to "unanswered" while the refreshed calendar is on its way.
 * Returns the same array when nothing matches.
 */
export function patchSavedDose(events: CalendarEvent[], saved: DoseLog): CalendarEvent[] {
  const key = doseKey(saved.medicationId, saved.scheduledAt);
  let changed = false;
  const result = events.map((event) => {
    if (event.kind !== "medication" || doseKey(event.medication.id, event.at) !== key) return event;
    changed = true;
    return { ...event, dose: saved };
  });
  return changed ? result : events;
}
