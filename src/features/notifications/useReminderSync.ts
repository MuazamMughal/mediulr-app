import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listAllAppointmentsForUser } from "../appointments/api";
import { listAllMedicationsForUser } from "../medications/api";
import { useProfiles } from "../profile/useProfiles";
import { planReminders } from "./plan";
import { replaceAllReminders } from "./scheduleNotifications";

/**
 * Keeps scheduled reminders in step with the data: re-plans whenever medications, visits or profiles change,
 * and again each time the app returns to the foreground (the plan is a rolling 7-day window, so it must renew).
 */
export function useReminderSync() {
  const { data: profiles } = useProfiles();
  const { data: medications } = useQuery({ queryKey: ["medications", "all-profiles"], queryFn: listAllMedicationsForUser });
  const { data: appointments } = useQuery({ queryKey: ["appointments", "all-profiles"], queryFn: listAllAppointmentsForUser });

  useEffect(() => {
    if (!profiles || !medications || !appointments) return;
    const sync = () => replaceAllReminders(planReminders({ medications, appointments, profiles }));
    sync();
    const sub = AppState.addEventListener("change", (state) => state === "active" && sync());
    return () => sub.remove();
  }, [profiles, medications, appointments]);
}
