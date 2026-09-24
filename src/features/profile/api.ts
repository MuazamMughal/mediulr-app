import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/domain";

function fromRow(row: {
  id: string;
  owner_id: string;
  is_self: boolean;
  display_name: string;
  date_of_birth: string | null;
}): Profile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    isSelf: row.is_self,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
  };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("is_self", { ascending: false });
  if (error) throw error;
  return data.map(fromRow);
}

export async function addDependentProfile(displayName: string, dateOfBirth?: string): Promise<Profile> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      owner_id: userRes.user.id,
      is_self: false,
      display_name: displayName,
      date_of_birth: dateOfBirth ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}
