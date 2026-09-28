import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/domain";
import { localId, queueEdit, readRows } from "../offline/editApi";

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
  return (await readRows("profiles", async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data;
  }, () => true, (a, b) => Number(b.is_self) - Number(a.is_self))).map(fromRow);
}

export async function addDependentProfile(displayName: string, dateOfBirth?: string): Promise<Profile> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.id) throw new Error("Sign in before adding a family profile");
  const row = { id: localId(), owner_id: data.session.user.id, is_self: false,
    display_name: displayName, date_of_birth: dateOfBirth ?? null, created_at: new Date().toISOString() };
  await queueEdit("profiles", "create", row.id, row);
  return fromRow(row);
}
