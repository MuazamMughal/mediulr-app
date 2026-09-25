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
  createdAt: string;
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

/** A trusted person the patient can tell about a missed dose. Contact details only; Mediulr never messages them. */
export interface Guardian {
  id: string;
  profileId: string;
  name: string;
  relationship: string | null;
  phone: string;
  notifyOnMissed: boolean;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

/** What the user ate and when. A log entry, not a nutrition record — no calories or health judgements. */
export interface FoodEntry {
  id: string;
  profileId: string;
  name: string;
  mealType: MealType;
  eatenAt: string;
  quantity: string | null;
  notes: string | null;
}

export type ExerciseType =
  | "walking"
  | "running"
  | "cycling"
  | "gym"
  | "strength"
  | "yoga"
  | "stretching"
  | "swimming"
  | "sports"
  | "other";

export type Intensity = "light" | "moderate" | "vigorous";

/** What activity the user did, when, and for how long. */
export interface ExerciseEntry {
  id: string;
  profileId: string;
  exerciseType: ExerciseType;
  /** Custom label; always set when the type is "other". */
  name: string | null;
  startedAt: string;
  durationMinutes: number;
  intensity: Intensity | null;
  notes: string | null;
}

/** A single item on the unified calendar — the Calendar Engine's core data shape. */
export type CalendarEvent =
  | { kind: "medication"; at: string; medication: Medication; dose: DoseLog }
  | { kind: "appointment"; at: string; appointment: Appointment }
  | { kind: "food"; at: string; food: FoodEntry }
  | { kind: "exercise"; at: string; exercise: ExerciseEntry }
  | { kind: "custom"; at: string; title: string; notes: string | null };
