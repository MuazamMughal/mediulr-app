import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { getSharedQueryClient } from "../../lib/queryClientRef";
import { applyEdits, createEditStore, type EditAction, type EditTable, type PendingEdit } from "./editStore";

export const editStore = createEditStore(AsyncStorage);
const SNAPSHOT_KEY = "mediulr:edit-snapshots:v1";
type Row = { id: string };
type Snapshots = Record<string, Record<string, Row>>;
let snapshots: Snapshots | null = null;
let snapshotLoad: Promise<Snapshots> | null = null;
let snapshotWrite: Promise<unknown> = Promise.resolve();
let snapshotGeneration = 0;

async function loadSnapshots(): Promise<Snapshots> {
  snapshotLoad ??= AsyncStorage.getItem(SNAPSHOT_KEY).then((raw) => {
    snapshots = raw ? JSON.parse(raw) as Snapshots : {};
    return snapshots;
  }).catch(() => {
    snapshots = {};
    return snapshots;
  });
  return snapshotLoad;
}

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.id) throw new Error("Sign in before editing records");
  return data.session.user.id;
}

async function rememberConfirmed(edit: PendingEdit, generation: number): Promise<void> {
  if (generation !== snapshotGeneration) return;
  const cache = await loadSnapshots();
  if (generation !== snapshotGeneration) return;
  const key = `${edit.userId}:${edit.table}`;
  const rows = { ...(cache[key] ?? {}) };
  if (edit.action === "delete") delete rows[edit.id];
  else rows[edit.id] = { ...(rows[edit.id] ?? {}), ...edit.values, id: edit.id };
  cache[key] = rows;
  const serialized = JSON.stringify(cache);
  snapshotWrite = snapshotWrite.catch(() => undefined).then(() => AsyncStorage.setItem(SNAPSHOT_KEY, serialized));
  await snapshotWrite;
}

/** UUIDs are identifiers, not authorization tokens. RLS remains the access boundary. */
export function localId(): string {
  const bytes = new Uint8Array(16);
  const random = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (random) random(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function invalidate(table: EditTable) {
  const client = getSharedQueryClient();
  const keys: Record<EditTable, string[]> = {
    profiles: ["profiles"],
    medications: ["medications", "calendarEvents"],
    dose_logs: ["calendarEvents"],
    appointments: ["appointments", "calendarEvents"],
    food_entries: ["foodEntries"],
    exercise_entries: ["exerciseEntries"],
    guardians: ["guardians"],
    custom_reminders: ["customReminders"],
    reminder_completions: ["customReminders"],
  };
  for (const key of keys[table]) void client?.invalidateQueries({ queryKey: [key] });
}

async function send(edit: PendingEdit): Promise<void> {
  const generation = snapshotGeneration;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== edit.userId) throw new Error("Account changed before edit sync");
  // Dynamic tables require a cast at this boundary; each queued record comes from a typed feature API.
  const table = supabase.from(edit.table) as any;
  const values = edit.table === "reminder_completions"
    ? Object.fromEntries(Object.entries(edit.values).filter(([key]) => key !== "id"))
    : edit.values;
  if (edit.action === "create") {
    const existing = edit.table === "reminder_completions"
      ? await table.select("reminder_id").eq("reminder_id", edit.values.reminder_id)
        .eq("scheduled_at", edit.values.scheduled_at).maybeSingle()
      : await table.select("id").eq("id", edit.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      await rememberConfirmed(edit, generation);
      return; // The prior insert succeeded but its acknowledgement was lost.
    }
  }
  const result = edit.action === "create"
    ? await table.insert(values)
    : edit.action === "update"
      ? await table.update(values).eq("id", edit.id).select("id").maybeSingle()
      : edit.table === "reminder_completions"
        ? await table.delete().eq("reminder_id", edit.values.reminder_id).eq("scheduled_at", edit.values.scheduled_at)
        : await table.delete().eq("id", edit.id);
  if (result.error) throw result.error;
  if (edit.action === "update" && !result.data) {
    throw Object.assign(new Error("The record was removed before this change could sync"), { code: "PGRST116" });
  }
  await rememberConfirmed(edit, generation);
}

export async function queueEdit(table: EditTable, action: EditAction, id: string, values: Record<string, unknown>): Promise<void> {
  return queueEdits([{ table, action, id, values }]);
}

export async function queueEdits(changes: Array<{ table: EditTable; action: EditAction; id: string; values: Record<string, unknown> }>): Promise<void> {
  const uid = await userId();
  const edits = changes.map((change) => ({ ...change, userId: uid, opId: localId(), queuedAt: Date.now() }));
  await editStore.enqueue(edits);
  for (const change of changes) invalidate(change.table);
  void editStore.flush(uid, send).then(() => {
    for (const change of changes) invalidate(change.table);
  }).catch(() => undefined);
}

export async function flushEdits(): Promise<void> {
  const uid = await userId();
  const tables = new Set(editStore.list().filter((e) => e.userId === uid).map((e) => e.table));
  await editStore.flush(uid, send);
  for (const table of tables) invalidate(table);
}

export async function retryFailedEdits(): Promise<void> {
  const uid = await userId();
  await editStore.retryFailed(uid);
  await flushEdits();
}

export async function discardFailedEdits(): Promise<void> {
  const uid = await userId();
  const tables = new Set(editStore.list().filter((e) => e.userId === uid && e.failed).map((e) => e.table));
  await editStore.discardFailed(uid);
  for (const table of tables) invalidate(table);
}

export async function clearOfflineEdits(): Promise<void> {
  snapshotGeneration += 1;
  await editStore.clear();
  await snapshotLoad?.catch(() => undefined);
  await snapshotWrite.catch(() => undefined);
  snapshots = {};
  snapshotLoad = Promise.resolve(snapshots);
  await AsyncStorage.setItem(SNAPSHOT_KEY, "{}");
}

/** Fetches server rows when possible, falling back to fetched device snapshots, then overlays queued edits. */
export async function readRows<T extends Row>(
  table: EditTable,
  fetch: () => Promise<T[]>,
  matches: (row: T) => boolean = () => true,
  compare?: (a: T, b: T) => number
): Promise<T[]> {
  const uid = await userId();
  const generation = snapshotGeneration;
  await editStore.load();
  const cache = await loadSnapshots();
  const snapshotKey = `${uid}:${table}`;
  const pending = editStore.list();
  let base: T[];
  if (pending.some((edit) => edit.userId === uid && edit.table === table)) {
    // The journal is authoritative while edits are pending. Return the device view immediately.
    base = Object.values(cache[snapshotKey] ?? {}) as T[];
  } else {
    try {
      base = await fetch();
      const merged = { ...(cache[snapshotKey] ?? {}) };
      for (const row of base) merged[row.id] = row;
      if (generation === snapshotGeneration) {
        cache[snapshotKey] = merged;
        const serialized = JSON.stringify(cache);
        snapshotWrite = snapshotWrite.then(() => AsyncStorage.setItem(SNAPSHOT_KEY, serialized)).catch(() => undefined);
      }
    } catch (error) {
      if ((error as { code?: string })?.code) throw error;
      base = Object.values(cache[snapshotKey] ?? {}) as T[];
    }
  }
  const extra = pending
    .filter((edit) => edit.userId === uid && edit.table === table && edit.action !== "delete")
    .map((edit) => cache[snapshotKey]?.[edit.id])
    .filter((row): row is Row => !!row && !base.some((item) => item.id === row.id));
  const projected = applyEdits([...base, ...extra] as Record<string, unknown>[], pending, uid, table) as T[];
  return projected.filter(matches).sort(compare);
}

export async function readOne<T extends Row>(table: EditTable, id: string, fetch: () => Promise<T | null>): Promise<T | null> {
  const rows = await readRows(table, async () => {
    const row = await fetch();
    return row ? [row] : [];
  }, (row) => row.id === id);
  return rows[0] ?? null;
}

export async function hasAnyRows<T extends Row>(table: EditTable, profileId: string, fetch: () => Promise<T[]>): Promise<boolean> {
  const rows = await readRows(table, fetch, (row) => (row as Record<string, unknown>).profile_id === profileId);
  return rows.length > 0;
}
