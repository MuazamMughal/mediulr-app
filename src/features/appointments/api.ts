import { supabase } from "../../lib/supabase";
import type { Appointment } from "../../types/domain";
import { localId, queueEdit, readRows } from "../offline/editApi";

function fromRow(row: {
  id: string;
  profile_id: string;
  provider_name: string;
  specialty: string | null;
  location: string | null;
  scheduled_at: string;
  pre_visit_notes: string | null;
  post_visit_notes: string | null;
}): Appointment {
  return {
    id: row.id,
    profileId: row.profile_id,
    providerName: row.provider_name,
    specialty: row.specialty,
    location: row.location,
    scheduledAt: row.scheduled_at,
    preVisitNotes: row.pre_visit_notes,
    postVisitNotes: row.post_visit_notes,
  };
}

export async function listAppointments(profileId: string): Promise<Appointment[]> {
  return (await readRows("appointments", async () => {
    const { data, error } = await supabase.from("appointments").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId, (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())).map(fromRow);
}

export interface NewAppointmentInput {
  profileId: string;
  providerName: string;
  specialty?: string;
  location?: string;
  scheduledAt: string; // ISO datetime
  preVisitNotes?: string;
}

export async function addAppointment(input: NewAppointmentInput): Promise<Appointment> {
  const row = { id: localId(), profile_id: input.profileId, provider_name: input.providerName,
    specialty: input.specialty ?? null, location: input.location ?? null, scheduled_at: input.scheduledAt,
    pre_visit_notes: input.preVisitNotes ?? null, post_visit_notes: null, created_at: new Date().toISOString() };
  await queueEdit("appointments", "create", row.id, row);
  return fromRow(row);
}

export type AppointmentEdit = Omit<NewAppointmentInput, "profileId">;

export async function updateAppointment(id: string, edit: AppointmentEdit): Promise<void> {
  await queueEdit("appointments", "update", id, { provider_name: edit.providerName,
    specialty: edit.specialty ?? null, location: edit.location ?? null, scheduled_at: edit.scheduledAt,
    pre_visit_notes: edit.preVisitNotes ?? null });
}

export async function deleteAppointment(id: string): Promise<void> {
  await queueEdit("appointments", "delete", id, {});
}

export async function updatePostVisitNotes(id: string, notes: string | null): Promise<void> {
  await queueEdit("appointments", "update", id, { post_visit_notes: notes });
}

/** Appointments across every profile the signed-in user manages (RLS scopes this to them). Used for reminders. */
export async function listAllAppointmentsForUser(): Promise<Appointment[]> {
  return (await readRows("appointments", async () => {
    const { data, error } = await supabase.from("appointments").select("*");
    if (error) throw error;
    return data;
  })).map(fromRow);
}
