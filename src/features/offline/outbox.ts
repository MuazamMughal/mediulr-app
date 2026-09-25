/**
 * A durable queue of dose answers ("taken" / "skipped") that couldn't be saved yet.
 * Answering a dose must never depend on the network: the answer is queued (and shown as done straight away),
 * then sent whenever a connection allows. Storage is injected so this stays plain, testable logic.
 */
export interface PendingDose {
  medicationId: string;
  scheduledAt: string; // ISO instant of the dose
  status: "taken" | "skipped";
  /** When the person answered (epoch ms) — becomes the saved "logged at" time, not the time we managed to sync. */
  queuedAt: number;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const OUTBOX_MAX_AGE_MS = 7 * 24 * 3600_000;

/** One entry per dose: answering the same dose again replaces the earlier answer. */
export const doseKey = (medicationId: string, scheduledAt: string | Date) => `${medicationId}:${new Date(scheduledAt).getTime()}`;

/**
 * Errors that will never succeed on retry (the medication was deleted, permission denied, bad data): the database
 * rejected the request. Anything else — no signal, timeout, expired token, server hiccup — is worth retrying.
 */
export function isPermanentError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^(22|23|42)/.test(code);
}

export interface FlushResult {
  sent: number;
  /** Answers the server refused for good; already removed from the queue. */
  dropped: PendingDose[];
  /** True if it stopped early because the connection isn't there yet. */
  blocked: boolean;
}

export function createDoseOutbox(storage: KeyValueStorage, options: { storageKey?: string; now?: () => number } = {}) {
  const storageKey = options.storageKey ?? "mediulr:dose-outbox";
  const now = options.now ?? Date.now;

  const items = new Map<string, PendingDose>();
  const listeners = new Set<() => void>();
  let snapshot: PendingDose[] = [];
  let loading: Promise<void> | null = null;
  let flushChain: Promise<unknown> = Promise.resolve();

  function publish() {
    snapshot = [...items.values()].sort((a, b) => a.queuedAt - b.queuedAt);
    listeners.forEach((l) => l());
  }

  async function persist() {
    try {
      await storage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Storage full/unavailable: the in-memory queue still works for this session.
    }
  }

  function load(): Promise<void> {
    loading ??= (async () => {
      try {
        const raw = await storage.getItem(storageKey);
        const saved: PendingDose[] = raw ? JSON.parse(raw) : [];
        for (const item of saved) {
          const key = doseKey(item.medicationId, item.scheduledAt);
          // Anything answered again during this session is newer than what was on disk.
          if (!items.has(key)) items.set(key, item);
        }
        publish();
      } catch {
        // Corrupt data: start clean rather than crash.
      }
    })();
    return loading;
  }

  async function enqueue(item: Omit<PendingDose, "queuedAt"> & { queuedAt?: number }): Promise<void> {
    items.set(doseKey(item.medicationId, item.scheduledAt), { ...item, queuedAt: item.queuedAt ?? now() });
    publish(); // visible at once, before any storage round trip
    await load();
    await persist();
  }

  async function runFlush(send: (item: PendingDose) => Promise<unknown>): Promise<FlushResult> {
    await load();
    const result: FlushResult = { sent: 0, dropped: [], blocked: false };
    for (const item of [...snapshot]) {
      const key = doseKey(item.medicationId, item.scheduledAt);
      const remove = () => {
        // Only remove what we sent; if the person changed their answer meanwhile, that newer answer stays queued.
        if (items.get(key)?.queuedAt === item.queuedAt) items.delete(key);
      };
      if (now() - item.queuedAt > OUTBOX_MAX_AGE_MS) {
        remove();
        result.dropped.push(item);
        continue;
      }
      try {
        await send(item);
        remove();
        result.sent += 1;
      } catch (err) {
        if (isPermanentError(err)) {
          remove();
          result.dropped.push(item);
        } else {
          result.blocked = true;
          break;
        }
      }
    }
    publish();
    await persist();
    return result;
  }

  /** Sends everything queued, one flush at a time. */
  function flush(send: (item: PendingDose) => Promise<unknown>): Promise<FlushResult> {
    const run = flushChain.then(() => runFlush(send));
    flushChain = run.catch(() => undefined);
    return run;
  }

  /** Forgets everything queued (used on sign-out so the next person's session never sends this one's answers). */
  async function clear(): Promise<void> {
    await load();
    items.clear();
    publish();
    await persist();
  }

  return {
    load,
    enqueue,
    flush,
    clear,
    list: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type DoseOutbox = ReturnType<typeof createDoseOutbox>;
