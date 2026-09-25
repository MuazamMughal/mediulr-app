import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { Guardian } from "../../types/domain";

type Row = Database["public"]["Tables"]["guardians"]["Row"];

function fromRow(row: Row): Guardian {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
    notifyOnMissed: row.notify_on_missed,
  };
}

export async function listGuardians(profileId: string): Promise<Guardian[]> {
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

export interface GuardianInput {
  name: string;
  relationship: string | null;
  phone: string; // already normalized
  notifyOnMissed: boolean;
}

export async function addGuardian(profileId: string, input: GuardianInput): Promise<Guardian> {
  const { data, error } = await supabase
    .from("guardians")
    .insert({
      profile_id: profileId,
      name: input.name,
      relationship: input.relationship,
      phone: input.phone,
      notify_on_missed: input.notifyOnMissed,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateGuardian(id: string, input: GuardianInput): Promise<void> {
  const { error } = await supabase
    .from("guardians")
    .update({
      name: input.name,
      relationship: input.relationship,
      phone: input.phone,
      notify_on_missed: input.notifyOnMissed,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGuardian(id: string): Promise<void> {
  const { error } = await supabase.from("guardians").delete().eq("id", id);
  if (error) throw error;
}

/** Every guardian across the profiles this user manages (RLS scopes it). Used to decide which reminders can offer "Tell guardian". */
export async function listAllGuardiansForUser(): Promise<Guardian[]> {
  const { data, error } = await supabase.from("guardians").select("*");
  if (error) throw error;
  return data.map(fromRow);
}
