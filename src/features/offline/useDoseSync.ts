import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { doseOutbox } from "./doseOutbox";
import { flushDoseOutbox, onDoseSaved, onDoseSync } from "./submitDose";
import { patchSavedDose } from "./overlay";
import type { CalendarEvent } from "../../types/domain";

const RETRY_MS = 20_000;

/**
 * Keeps queued dose answers moving: sends them on start, whenever the app comes back to the foreground,
 * and every 20 seconds while any are waiting (a dropped connection returns without an event we could listen for).
 * Refreshes the calendar and supply counts after a sync, and says so if the server refused any answer.
 */
export function useDoseSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Put the saved answer straight into every loaded day, so removing it from the queue doesn't flash the old state.
    const stopSaved = onDoseSaved((_item, saved) => {
      queryClient.setQueriesData<unknown>({ queryKey: ["calendarEvents"] }, (data: unknown) =>
        Array.isArray(data) ? patchSavedDose(data as CalendarEvent[], saved) : data
      );
    });
    const stopListening = onDoseSync((result) => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      if (result.dropped.length > 0) {
        Alert.alert(
          "Some answers couldn't be saved",
          "A medication they belong to may have been removed, so those doses were left out."
        );
      }
    });
    const run = () => {
      flushDoseOutbox().catch(() => undefined);
    };
    run();
    const appState = AppState.addEventListener("change", (state) => state === "active" && run());
    const timer = setInterval(() => {
      if (doseOutbox.list().length > 0) run();
    }, RETRY_MS);
    return () => {
      stopSaved();
      stopListening();
      appState.remove();
      clearInterval(timer);
    };
  }, [queryClient]);
}
