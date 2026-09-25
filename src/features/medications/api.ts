import { supabase } from "../../lib/supabase";
import type { RecurrenceRule } from "../../lib/recurrence";
import type { DoseLog, DoseStatus, Medication } from "../../types/domain";

function fromRow(row: {
  id: string;
  profile_id: string;
  name: string;
  dosage: string;
  instructions: string | null;
  recurrence_rule: unknown;
  quantity_on_hand: number | null;
  refill_threshold: number | null;
  start_date: string;
  end_date: string | null;
  archived_at: string | null;
  created_at: string;
}): Medication {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    dosage: row.dosage,
    instructions: row.instructions,
    recurrenceRule: row.recurrence_rule as RecurrenceRule,
    quantityOnHand: row.quantity_on_hand,
    refillThreshold: row.refill_threshold,
    startDate: row.start_date,
    endDate: row.end_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

/**
 * Every medication for a profile, including stopped and finished ones — the calendar needs them
 * to keep past days accurate. Callers filter for "active" with `isActiveMedication`.
 */
export async function listMedications(profileId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(fromRow);
}

/** Medications across every profile the signed-in user manages (RLS scopes this to them). Used for reminders. */
export async function listAllMedicationsForUser(): Promise<Medication[]> {
  const { data, error } = await supabase.from("medications").select("*");
  if (error) throw error;
  return data.map(fromRow);
}

export interface NewMedicationInput {
  profileId: string;
  name: string;
  dosage: string;
  instructions?: string;
  recurrenceRule: RecurrenceRule;
  quantityOnHand?: number;
  refillThreshold?: number;
  startDate: string; // ISO date
  endDate?: string;
}

export async function addMedication(input: NewMedicationInput): Promise<Medication> {
  const { data, error } = await supabase
    .from("medications")
    .insert({
      profile_id: input.profileId,
      name: input.name,
      dosage: input.dosage,
      instructions: input.instructions ?? null,
      recurrence_rule: input.recurrenceRule as unknown as Record<string, unknown>,
      quantity_on_hand: input.quantityOnHand ?? null,
      refill_threshold: input.refillThreshold ?? null,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function archiveMedication(id: string): Promise<void> {
  const { error } = await supabase.from("medications").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** `loggedAt` is when the person answered — pass it when saving late from the offline queue so history keeps the real time. */
/** Fields that can change without rewriting history: they don't alter when past doses were due. */
export interface MedicationEdit {
  name: string;
  dosage: string;
  instructions: string | null;
  quantityOnHand: number | null;
  refillThreshold: number | null;
  endDate: string | null;
}

export async function updateMedication(id: string, edit: MedicationEdit): Promise<void> {
  const { error } = await supabase
    .from("medications")
    .update({
      name: edit.name,
      dosage: edit.dosage,
      instructions: edit.instructions,
      quantity_on_hand: edit.quantityOnHand,
      refill_threshold: edit.refillThreshold,
      end_date: edit.endDate,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Changing when doses are due would rewrite every past day (doses are derived from the schedule), so a schedule
 * change stops the old medication and starts a new one from now: history stays exactly as it was.
 * The new one is created first; if stopping the old one then fails, the new one is removed again.
 */
export async function replaceMedicationSchedule(oldId: string, next: NewMedicationInput): Promise<Medication> {
  const created = await addMedication(next);
  try {
    await archiveMedication(oldId);
  } catch (err) {
    await supabase.from("medications").delete().eq("id", created.id);
    throw err;
  }
  return created;
}

/** Permanently removes the medication and, by cascade, every dose answer recorded for it. */
export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase.from("medications").delete().eq("id", id);
  if (error) throw error;
}

export async function logDose(medicationId: string, scheduledAt: string, status: DoseStatus, loggedAt?: string): Promise<DoseLog> {
  const { data, error } = await supabase
    .from("dose_logs")
    .upsert(
      {
        medication_id: medicationId,
        scheduled_at: scheduledAt,
        status,
        logged_at: status === "pending" ? null : (loggedAt ?? new Date().toISOString()),
      },
      { onConflict: "medication_id,scheduled_at" }
    )
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    medicationId: data.medication_id,
    scheduledAt: data.scheduled_at,
    status: data.status,
    loggedAt: data.logged_at,
  };
}

/** Saved dose statuses for the given medications between two instants. */
export async function listDoseLogsInRange(medicationIds: string[], start: Date, end: Date): Promise<DoseLog[]> {
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
