import { supabase } from "../../lib/supabase";
import type { RecurrenceRule } from "../../lib/recurrence";
import type { Database } from "../../types/database";
import type { CustomReminder, ReminderCompletion } from "../../types/domain";
import { localId, queueEdit, readRows } from "../offline/editApi";

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
  return (await readRows("custom_reminders", async () => {
    const { data, error } = await supabase.from("custom_reminders").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return data;
  }, (row) => row.profile_id === profileId, (a, b) => a.created_at.localeCompare(b.created_at))).map(fromRow);
}

/** Every reminder across the profiles this user manages (RLS scopes it). Used to schedule notifications. */
export async function listAllRemindersForUser(): Promise<CustomReminder[]> {
  return (await readRows("custom_reminders", async () => {
    const { data, error } = await supabase.from("custom_reminders").select("*");
    if (error) throw error;
    return data;
  })).map(fromRow);
}

export async function addReminder(profileId: string, input: ReminderInput): Promise<CustomReminder> {
  const row: Row = { id: localId(), profile_id: profileId, title: input.title, notes: input.notes,
    recurrence_rule: input.recurrenceRule as unknown as Record<string, unknown>, start_date: input.startDate,
    end_date: input.endDate, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await queueEdit("custom_reminders", "create", row.id, row);
  return fromRow(row);
}

export async function updateReminder(id: string, input: ReminderInput): Promise<void> {
  await queueEdit("custom_reminders", "update", id, { title: input.title, notes: input.notes,
    recurrence_rule: input.recurrenceRule as unknown as Record<string, unknown>,
    start_date: input.startDate, end_date: input.endDate });
}

export async function deleteReminder(id: string): Promise<void> {
  await queueEdit("custom_reminders", "delete", id, {});
}

export async function listCompletionsInRange(reminderIds: string[], start: Date, end: Date): Promise<ReminderCompletion[]> {
  if (reminderIds.length === 0) return [];
  const rows = await readRows("reminder_completions", async () => {
    const { data, error } = await supabase.from("reminder_completions").select("*")
      .in("reminder_id", reminderIds).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
    if (error) throw error;
    return data.map((row) => ({ ...row, id: completionId(row.reminder_id, row.scheduled_at) }));
  }, (row) => reminderIds.includes(row.reminder_id) && new Date(row.scheduled_at) >= start && new Date(row.scheduled_at) <= end);
  return rows.map((r) => ({ reminderId: r.reminder_id, scheduledAt: r.scheduled_at, completedAt: r.completed_at }));
}

function completionId(reminderId: string, scheduledAt: string): string {
  return `${reminderId}:${new Date(scheduledAt).getTime()}`;
}

/** Ticks one occurrence off. Doing it twice is harmless. */
export async function completeReminder(reminderId: string, scheduledAt: string): Promise<void> {
  const id = completionId(reminderId, scheduledAt);
  await queueEdit("reminder_completions", "create", id,
    { id, reminder_id: reminderId, scheduled_at: scheduledAt, completed_at: new Date().toISOString() });
}

export async function uncompleteReminder(reminderId: string, scheduledAt: string): Promise<void> {
  await queueEdit("reminder_completions", "delete", completionId(reminderId, scheduledAt),
    { reminder_id: reminderId, scheduled_at: scheduledAt });
}
