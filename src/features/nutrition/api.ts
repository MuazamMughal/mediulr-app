import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { FoodEntry, MealType } from "../../types/domain";

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
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("profile_id", profileId)
    .gte("eaten_at", start.toISOString())
    .lte("eaten_at", end.toISOString())
    .order("eaten_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

/** Only the timestamps — all the month grid needs to draw its markers. */
export async function listFoodTimesInRange(profileId: string, start: Date, end: Date): Promise<string[]> {
  const { data, error } = await supabase
    .from("food_entries")
    .select("eaten_at")
    .eq("profile_id", profileId)
    .gte("eaten_at", start.toISOString())
    .lte("eaten_at", end.toISOString());
  if (error) throw error;
  return data.map((r) => r.eaten_at);
}

export async function listRecentFood(profileId: string, limit = 60): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("profile_id", profileId)
    .order("eaten_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(fromRow);
}

export async function getFoodEntry(id: string): Promise<FoodEntry | null> {
  const { data, error } = await supabase.from("food_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

/** Whether this profile has ever logged a meal (drives the home screen's "brand new account" state). */
export async function hasAnyFood(profileId: string): Promise<boolean> {
  const { data, error } = await supabase.from("food_entries").select("id").eq("profile_id", profileId).limit(1);
  if (error) throw error;
  return data.length > 0;
}

export interface FoodInput {
  name: string;
  mealType: MealType;
  eatenAt: string; // ISO instant
  quantity: string | null;
  notes: string | null;
}

export async function addFood(profileId: string, input: FoodInput): Promise<FoodEntry> {
  const { data, error } = await supabase
    .from("food_entries")
    .insert({
      profile_id: profileId,
      name: input.name,
      meal_type: input.mealType,
      eaten_at: input.eatenAt,
      quantity: input.quantity,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateFood(id: string, input: FoodInput): Promise<void> {
  const { error } = await supabase
    .from("food_entries")
    .update({
      name: input.name,
      meal_type: input.mealType,
      eaten_at: input.eatenAt,
      quantity: input.quantity,
      notes: input.notes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from("food_entries").delete().eq("id", id);
  if (error) throw error;
}
