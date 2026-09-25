import { logDose } from "../medications/api";
import { doseOutbox } from "./doseOutbox";
import { doseKey, type FlushResult, type PendingDose } from "./outbox";
import type { DoseLog } from "../../types/domain";

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
  const result = await doseOutbox.flush(async (item) => {
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
 * "queued" means it is safe on the device and will sync when a connection returns.
 */
export async function submitDose(answer: DoseAnswer): Promise<"synced" | "queued" | "dropped"> {
  await doseOutbox.enqueue(answer);
  const result = await flushDoseOutbox();
  const key = doseKey(answer.medicationId, answer.scheduledAt);
  if (result.dropped.some((d) => doseKey(d.medicationId, d.scheduledAt) === key)) return "dropped";
  return doseOutbox.list().some((p) => doseKey(p.medicationId, p.scheduledAt) === key) ? "queued" : "synced";
}
