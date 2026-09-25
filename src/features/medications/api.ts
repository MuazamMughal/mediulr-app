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

export async function logDose(medicationId: string, scheduledAt: string, status: DoseStatus): Promise<DoseLog> {
  const { data, error } = await supabase
    .from("dose_logs")
    .upsert(
      {
        medication_id: medicationId,
        scheduled_at: scheduledAt,
        status,
        logged_at: status === "pending" ? null : new Date().toISOString(),
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
