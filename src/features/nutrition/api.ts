import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { FoodEntry, MealType } from "../../types/domain";
import { localId, queueEdit, readOne, readRows } from "../offline/editApi";

type Row = Database["public"]["Tables"]["food_entries"]["Row"];

function fromRow(row: Row): FoodEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    mealType: row.meal_type,
    eatenAt: row.eaten_at,
    quantity: row.quantity,
    notes: row.notes,
  };
}

/** One profile's meals in [start, end], oldest first. Day-sized ranges keep this small however long the history gets. */
export async function listFoodInRange(profileId: string, start: Date, end: Date): Promise<FoodEntry[]> {
  const rows = await readRows("food_entries", async () => {
    const { data, error } = await supabase.from("food_entries").select("*").eq("profile_id", profileId)
      .gte("eaten_at", start.toISOString()).lte("eaten_at", end.toISOString());
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId && new Date(row.eaten_at) >= start && new Date(row.eaten_at) <= end,
  (a, b) => new Date(a.eaten_at).getTime() - new Date(b.eaten_at).getTime());
  return rows.map(fromRow);
}

/** Only the timestamps — all the month grid needs to draw its markers. */
export async function listFoodTimesInRange(profileId: string, start: Date, end: Date): Promise<string[]> {
  return (await listFoodInRange(profileId, start, end)).map((row) => row.eatenAt);
}

export async function listRecentFood(profileId: string, limit = 60): Promise<FoodEntry[]> {
  const rows = await readRows("food_entries", async () => {
    const { data, error } = await supabase.from("food_entries").select("*").eq("profile_id", profileId)
      .order("eaten_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId, (a, b) => new Date(b.eaten_at).getTime() - new Date(a.eaten_at).getTime());
  return rows.slice(0, limit).map(fromRow);
}

export async function getFoodEntry(id: string): Promise<FoodEntry | null> {
  const row = await readOne("food_entries", id, async () => {
    const { data, error } = await supabase.from("food_entries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  });
  return row ? fromRow(row) : null;
}

/** Whether this profile has ever logged a meal (drives the home screen's "brand new account" state). */
export async function hasAnyFood(profileId: string): Promise<boolean> {
  const rows = await readRows("food_entries", async () => {
    const { data, error } = await supabase.from("food_entries").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId);
  return rows.length > 0;
}

export interface FoodInput {
  name: string;
  mealType: MealType;
  eatenAt: string; // ISO instant
  quantity: string | null;
  notes: string | null;
}

export async function addFood(profileId: string, input: FoodInput): Promise<FoodEntry> {
  const row: Row = { id: localId(), profile_id: profileId, name: input.name, meal_type: input.mealType,
    eaten_at: input.eatenAt, quantity: input.quantity, notes: input.notes,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await queueEdit("food_entries", "create", row.id, row);
  return fromRow(row);
}

export async function updateFood(id: string, input: FoodInput): Promise<void> {
  await queueEdit("food_entries", "update", id, { name: input.name, meal_type: input.mealType,
    eaten_at: input.eatenAt, quantity: input.quantity, notes: input.notes });
}

export async function deleteFood(id: string): Promise<void> {
  await queueEdit("food_entries", "delete", id, {});
}
