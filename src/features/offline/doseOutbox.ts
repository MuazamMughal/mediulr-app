import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDoseOutbox, type PendingDose } from "./outbox";

/** The app's one queue of dose answers waiting to be saved. */
export const doseOutbox = createDoseOutbox(AsyncStorage);

/** The answers still waiting to sync; re-renders when it changes. */
export function usePendingDoses(): PendingDose[] {
  return useSyncExternalStore(doseOutbox.subscribe, doseOutbox.list, doseOutbox.list);
}
