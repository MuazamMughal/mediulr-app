import { supabase } from "../../lib/supabase";
import type { Appointment } from "../../types/domain";

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
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("profile_id", profileId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
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
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      profile_id: input.profileId,
      provider_name: input.providerName,
      specialty: input.specialty ?? null,
      location: input.location ?? null,
      scheduled_at: input.scheduledAt,
      pre_visit_notes: input.preVisitNotes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updatePostVisitNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase.from("appointments").update({ post_visit_notes: notes }).eq("id", id);
  if (error) throw error;
}

/** Appointments across every profile the signed-in user manages (RLS scopes this to them). Used for reminders. */
export async function listAllAppointmentsForUser(): Promise<Appointment[]> {
  const { data, error } = await supabase.from("appointments").select("*");
  if (error) throw error;
  return data.map(fromRow);
}
