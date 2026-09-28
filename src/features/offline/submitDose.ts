import { logDose } from "../medications/api";
import { doseOutbox } from "./doseOutbox";
import { doseKey, type FlushResult, type PendingDose } from "./outbox";
import type { DoseLog } from "../../types/domain";
import { editStore, flushEdits } from "./editApi";

type SyncListener = (result: FlushResult) => void;
const listeners = new Set<SyncListener>();

/** Called after a flush actually changed something, so screens can refresh and report refused answers. */
export function onDoseSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type SavedListener = (item: PendingDose, saved: DoseLog) => void;
const savedListeners = new Set<SavedListener>();

/** Called for each answer the moment the server has it, before it leaves the queue (so caches can be patched without a flicker). */
export function onDoseSaved(listener: SavedListener): () => void {
  savedListeners.add(listener);
  return () => {
    savedListeners.delete(listener);
  };
}

/** Sends every queued answer. Safe to call any time, from anywhere; overlapping calls run one after another. */
export async function flushDoseOutbox(): Promise<FlushResult> {
  // A dose for a medication created offline cannot be saved until that medication exists on the server.
  await flushEdits().catch(() => undefined);
  const result = await doseOutbox.flush(async (item) => {
    if (editStore.list().some((edit) => edit.table === "medications" && edit.id === item.medicationId && edit.action === "create")) {
      throw new Error("Medication creation is still waiting to sync");
    }
    const saved = await logDose(item.medicationId, item.scheduledAt, item.status, new Date(item.queuedAt).toISOString());
    savedListeners.forEach((l) => l(item, saved));
  });
  if (result.sent > 0 || result.dropped.length > 0) listeners.forEach((l) => l(result));
  return result;
}

export interface DoseAnswer {
  medicationId: string;
  scheduledAt: string;
  status: "taken" | "skipped";
}

/**
 * Records an answer without depending on the network: it is queued (and shows as answered at once), then sent.
 * "queued" means the answer is pending. Device storage can fail silently, so this does not guarantee
 * the answer will survive an app restart; syncing also requires the app to run again.
 */
export async function submitDose(answer: DoseAnswer): Promise<"synced" | "queued" | "dropped"> {
  await doseOutbox.enqueue(answer);
  const result = await flushDoseOutbox();
  const key = doseKey(answer.medicationId, answer.scheduledAt);
  if (result.dropped.some((d) => doseKey(d.medicationId, d.scheduledAt) === key)) return "dropped";
  return doseOutbox.list().some((p) => doseKey(p.medicationId, p.scheduledAt) === key) ? "queued" : "synced";
}
