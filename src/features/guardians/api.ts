import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { Guardian } from "../../types/domain";
import { localId, queueEdit, readRows } from "../offline/editApi";

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
  const rows = await readRows("guardians", async () => {
    const { data, error } = await supabase.from("guardians").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId, (a, b) => a.created_at.localeCompare(b.created_at));
  return rows.map(fromRow);
}

export interface GuardianInput {
  name: string;
  relationship: string | null;
  phone: string; // already normalized
  notifyOnMissed: boolean;
}

export async function addGuardian(profileId: string, input: GuardianInput): Promise<Guardian> {
  const row: Row = { id: localId(), profile_id: profileId, name: input.name,
    relationship: input.relationship, phone: input.phone, notify_on_missed: input.notifyOnMissed,
    linked_user_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await queueEdit("guardians", "create", row.id, row);
  return fromRow(row);
}

export async function updateGuardian(id: string, input: GuardianInput): Promise<void> {
  await queueEdit("guardians", "update", id, { name: input.name, relationship: input.relationship,
    phone: input.phone, notify_on_missed: input.notifyOnMissed });
}

export async function deleteGuardian(id: string): Promise<void> {
  await queueEdit("guardians", "delete", id, {});
}

/** Every guardian across the profiles this user manages (RLS scopes it). Used to decide which reminders can offer "Tell guardian". */
export async function listAllGuardiansForUser(): Promise<Guardian[]> {
  return (await readRows("guardians", async () => {
    const { data, error } = await supabase.from("guardians").select("*");
    if (error) throw error;
    return data;
  })).map(fromRow);
}
