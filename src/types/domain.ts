import type { RecurrenceRule } from "../lib/recurrence";

export interface Profile {
  id: string;
  ownerId: string;
  isSelf: boolean;
  displayName: string;
  dateOfBirth: string | null;
}

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  dosage: string;
  instructions: string | null;
  recurrenceRule: RecurrenceRule;
  quantityOnHand: number | null;
  refillThreshold: number | null;
  startDate: string;
  endDate: string | null;
  archivedAt: string | null;
}

export type DoseStatus = "pending" | "taken" | "skipped" | "snoozed";

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: DoseStatus;
  loggedAt: string | null;
}

export interface Appointment {
  id: string;
  profileId: string;
  providerName: string;
  specialty: string | null;
  location: string | null;
  scheduledAt: string;
  preVisitNotes: string | null;
  postVisitNotes: string | null;
}

export interface Reminder {
  id: string;
  sourceType: "medication" | "appointment";
  sourceId: string;
  offsetMinutes: number;
  escalationEnabled: boolean;
}

/** A single item on the unified calendar — the Calendar Engine's core data shape. */
export type CalendarEvent =
  | { kind: "medication"; at: string; medication: Medication; dose: DoseLog }
  | { kind: "appointment"; at: string; appointment: Appointment }
  | { kind: "custom"; at: string; title: string; notes: string | null };
