import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { ExerciseEntry, ExerciseType, Intensity } from "../../types/domain";

type Row = Database["public"]["Tables"]["exercise_entries"]["Row"];

function fromRow(row: Row): ExerciseEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    exerciseType: row.exercise_type,
    name: row.name,
    startedAt: row.started_at,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity,
    notes: row.notes,
  };
}

export async function listExerciseInRange(profileId: string, start: Date, end: Date): Promise<ExerciseEntry[]> {
  const { data, error } = await supabase
    .from("exercise_entries")
    .select("*")
    .eq("profile_id", profileId)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString())
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

export async function listExerciseTimesInRange(profileId: string, start: Date, end: Date): Promise<string[]> {
  const { data, error } = await supabase
    .from("exercise_entries")
    .select("started_at")
    .eq("profile_id", profileId)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString());
  if (error) throw error;
  return data.map((r) => r.started_at);
}

export async function getExerciseEntry(id: string): Promise<ExerciseEntry | null> {
  const { data, error } = await supabase.from("exercise_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function hasAnyExercise(profileId: string): Promise<boolean> {
  const { data, error } = await supabase.from("exercise_entries").select("id").eq("profile_id", profileId).limit(1);
  if (error) throw error;
  return data.length > 0;
}

export interface ExerciseInput {
  exerciseType: ExerciseType;
  name: string | null;
  startedAt: string; // ISO instant
  durationMinutes: number;
  intensity: Intensity | null;
  notes: string | null;
}

export async function addExercise(profileId: string, input: ExerciseInput): Promise<ExerciseEntry> {
  const { data, error } = await supabase
    .from("exercise_entries")
    .insert({
      profile_id: profileId,
      exercise_type: input.exerciseType,
      name: input.name,
      started_at: input.startedAt,
      duration_minutes: input.durationMinutes,
      intensity: input.intensity,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  const { error } = await supabase
    .from("exercise_entries")
    .update({
      exercise_type: input.exerciseType,
      name: input.name,
      started_at: input.startedAt,
      duration_minutes: input.durationMinutes,
      intensity: input.intensity,
      notes: input.notes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from("exercise_entries").delete().eq("id", id);
  if (error) throw error;
}
