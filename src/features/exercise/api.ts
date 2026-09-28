import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";
import type { ExerciseEntry, ExerciseType, Intensity } from "../../types/domain";
import { localId, queueEdit, readOne, readRows } from "../offline/editApi";

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
  const rows = await readRows("exercise_entries", async () => {
    const { data, error } = await supabase.from("exercise_entries").select("*").eq("profile_id", profileId)
      .gte("started_at", start.toISOString()).lte("started_at", end.toISOString());
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId && new Date(row.started_at) >= start && new Date(row.started_at) <= end,
  (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  return rows.map(fromRow);
}

export async function listExerciseTimesInRange(profileId: string, start: Date, end: Date): Promise<string[]> {
  return (await listExerciseInRange(profileId, start, end)).map((row) => row.startedAt);
}

export async function getExerciseEntry(id: string): Promise<ExerciseEntry | null> {
  const row = await readOne("exercise_entries", id, async () => {
    const { data, error } = await supabase.from("exercise_entries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  });
  return row ? fromRow(row) : null;
}

export async function hasAnyExercise(profileId: string): Promise<boolean> {
  const rows = await readRows("exercise_entries", async () => {
    const { data, error } = await supabase.from("exercise_entries").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId);
  return rows.length > 0;
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
  const row: Row = { id: localId(), profile_id: profileId, exercise_type: input.exerciseType,
    name: input.name, started_at: input.startedAt, duration_minutes: input.durationMinutes,
    intensity: input.intensity, notes: input.notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await queueEdit("exercise_entries", "create", row.id, row);
  return fromRow(row);
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  await queueEdit("exercise_entries", "update", id, { exercise_type: input.exerciseType, name: input.name,
    started_at: input.startedAt, duration_minutes: input.durationMinutes, intensity: input.intensity, notes: input.notes });
}

export async function deleteExercise(id: string): Promise<void> {
  await queueEdit("exercise_entries", "delete", id, {});
}
