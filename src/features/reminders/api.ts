import { supabase } from "../../lib/supabase";
import type { RecurrenceRule } from "../../lib/recurrence";
import type { Database } from "../../types/database";
import type { CustomReminder, ReminderCompletion } from "../../types/domain";

type Row = Database["public"]["Tables"]["custom_reminders"]["Row"];

function fromRow(row: Row): CustomReminder {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    notes: row.notes,
    recurrenceRule: row.recurrence_rule as unknown as RecurrenceRule,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

export interface ReminderInput {
  title: string;
  notes: string | null;
  recurrenceRule: RecurrenceRule;
  startDate: string; // "YYYY-MM-DD"
  endDate: string | null;
}

export async function listReminders(profileId: string): Promise<CustomReminder[]> {
  const { data, error } = await supabase
    .from("custom_reminders")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

/** Every reminder across the profiles this user manages (RLS scopes it). Used to schedule notifications. */
export async function listAllRemindersForUser(): Promise<CustomReminder[]> {
  const { data, error } = await supabase.from("custom_reminders").select("*");
  if (error) throw error;
  return data.map(fromRow);
}

export async function addReminder(profileId: string, input: ReminderInput): Promise<CustomReminder> {
  const { data, error } = await supabase
    .from("custom_reminders")
    .insert({
      profile_id: profileId,
      title: input.title,
      notes: input.notes,
      recurrence_rule: input.recurrenceRule as unknown as Record<string, unknown>,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateReminder(id: string, input: ReminderInput): Promise<void> {
  const { error } = await supabase
    .from("custom_reminders")
    .update({
      title: input.title,
      notes: input.notes,
      recurrence_rule: input.recurrenceRule as unknown as Record<string, unknown>,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("custom_reminders").delete().eq("id", id);
  if (error) throw error;
}

export async function listCompletionsInRange(reminderIds: string[], start: Date, end: Date): Promise<ReminderCompletion[]> {
  if (reminderIds.length === 0) return [];
  const { data, error } = await supabase
    .from("reminder_completions")
    .select("*")
    .in("reminder_id", reminderIds)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString());
  if (error) throw error;
  return data.map((r) => ({ reminderId: r.reminder_id, scheduledAt: r.scheduled_at, completedAt: r.completed_at }));
}

/** Ticks one occurrence off. Doing it twice is harmless. */
export async function completeReminder(reminderId: string, scheduledAt: string): Promise<void> {
  const { error } = await supabase
    .from("reminder_completions")
    .upsert({ reminder_id: reminderId, scheduled_at: scheduledAt }, { onConflict: "reminder_id,scheduled_at", ignoreDuplicates: true });
  if (error) throw error;
}

export async function uncompleteReminder(reminderId: string, scheduledAt: string): Promise<void> {
  const { error } = await supabase.from("reminder_completions").delete().eq("reminder_id", reminderId).eq("scheduled_at", scheduledAt);
  if (error) throw error;
}
