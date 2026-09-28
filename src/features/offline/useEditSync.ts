import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { editStore, flushEdits } from "./editApi";

const RETRY_MS = 20_000;

export function usePendingEdits() {
  return useSyncExternalStore(editStore.subscribe, editStore.list, editStore.list);
}

/** Replays queued changes at launch, on foreground, and while the app is active. */
export function useEditSync() {
  useEffect(() => {
    let alive = true;
    const run = () => {
      if (alive) void flushEdits().catch(() => undefined);
    };
    run();
    const appState = AppState.addEventListener("change", (state) => state === "active" && run());
    const timer = setInterval(() => {
      if (editStore.list().length > 0) run();
    }, RETRY_MS);
    return () => {
      alive = false;
      appState.remove();
      clearInterval(timer);
    };
  }, []);
}
