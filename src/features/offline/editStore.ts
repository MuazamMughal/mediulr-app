/** Ordered, account-scoped edits. Storage is injected so queue behavior can be tested without React Native. */
export type EditTable =
  | "profiles"
  | "medications"
  | "dose_logs"
  | "appointments"
  | "food_entries"
  | "exercise_entries"
  | "guardians"
  | "custom_reminders"
  | "reminder_completions";
export type EditAction = "create" | "update" | "delete";
export interface PendingEdit {
  opId: string;
  userId: string;
  table: EditTable;
  action: EditAction;
  id: string;
  values: Record<string, unknown>;
  queuedAt: number;
  failed?: string;
}
export interface EditStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function isPermanentEditError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && (/^(22|23|42)/.test(code) || code === "P0001" || code.startsWith("PGRST"));
}

/** Replays local changes over fetched or cached rows. Failed edits remain visible until resolved. */
export function applyEdits<T extends Record<string, unknown>>(
  rows: T[], edits: PendingEdit[], userId: string, table: EditTable, key: (row: T) => string = (row) => String(row.id)
): T[] {
  const byId = new Map(rows.map((row) => [key(row), row]));
  for (const edit of edits) {
    if (edit.userId !== userId || edit.table !== table) continue;
    if (edit.action === "delete") byId.delete(edit.id);
    else byId.set(edit.id, { ...(byId.get(edit.id) ?? {}), ...edit.values } as T);
  }
  return [...byId.values()];
}

export function createEditStore(storage: EditStorage, options: { key?: string; now?: () => number } = {}) {
  const key = options.key ?? "mediulr:edit-outbox:v1";
  const now = options.now ?? Date.now;
  let items: PendingEdit[] = [];
  let loading: Promise<void> | null = null;
  let writeChain: Promise<unknown> = Promise.resolve();
  let flushPromise: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());

  function load(): Promise<void> {
    loading ??= (async () => {
      const raw = await storage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("Invalid saved edits");
      items = parsed as PendingEdit[];
      publish();
    })().catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  }

  function write<T>(change: () => T): Promise<T> {
    const run = writeChain.then(async () => {
      await load();
      const before = items;
      const result = change();
      try {
        await storage.setItem(key, JSON.stringify(items));
      } catch (error) {
        items = before;
        throw error;
      }
      publish();
      return result;
    });
    writeChain = run.catch(() => undefined);
    return run;
  }

  async function enqueue(edits: PendingEdit[]): Promise<void> {
    await write(() => {
      items = [...items, ...edits];
    });
  }

  async function flush(userId: string, send: (edit: PendingEdit) => Promise<void>): Promise<void> {
    if (flushPromise) return flushPromise;
    flushPromise = (async () => {
      await load();
      while (true) {
        // Never send an edit until its device write has completed.
        await writeChain;
        const next = items.find((item) => item.userId === userId);
        if (!next || next.failed) break; // Preserve dependency order; a rejected parent blocks its children.
        try {
          await send(next);
          await write(() => {
            items = items.filter((item) => item.opId !== next.opId);
          });
        } catch (error) {
          if (isPermanentEditError(error)) {
            await write(() => {
              items = items.map((item) =>
                item.opId === next.opId ? { ...item, failed: String((error as Error)?.message ?? error) } : item
              );
            });
          }
          break;
        }
      }
    })().finally(() => {
      flushPromise = null;
    });
    return flushPromise;
  }

  async function retryFailed(userId: string): Promise<void> {
    await write(() => {
      items = items.map((item) => item.userId === userId ? { ...item, failed: undefined } : item);
    });
  }

  async function discardFailed(userId: string): Promise<void> {
    await write(() => {
      items = items.filter((item) => item.userId !== userId || !item.failed);
    });
  }

  async function clear(): Promise<void> {
    await write(() => {
      items = [];
    });
  }

  return {
    load, enqueue, flush, retryFailed, discardFailed, clear,
    list: () => items,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
