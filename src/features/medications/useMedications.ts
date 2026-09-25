import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMedication, archiveMedication, listMedications, logDose, type NewMedicationInput } from "./api";
import { isActiveMedication } from "./schedule";
import type { DoseStatus, Medication } from "../../types/domain";

const activeOnly = (meds: Medication[]) => meds.filter((m) => isActiveMedication(m));
const finishedOnly = (meds: Medication[]) => meds.filter((m) => !isActiveMedication(m));

function useMedicationsQuery<T>(profileId: string | undefined, select: (meds: Medication[]) => T) {
  return useQuery({
    queryKey: ["medications", profileId],
    queryFn: () => listMedications(profileId as string),
    enabled: !!profileId,
    select,
  });
}

/** Medications still being taken (not stopped, course not finished). */
export function useMedications(profileId: string | undefined) {
  return useMedicationsQuery(profileId, activeOnly);
}

/** Stopped or finished medications — kept so past calendar days stay accurate. */
export function useFinishedMedications(profileId: string | undefined) {
  return useMedicationsQuery(profileId, finishedOnly);
}

/** Everything, active or not. */
export function useAllMedications(profileId: string | undefined) {
  return useMedicationsQuery(profileId, (meds) => meds);
}

/** A medication changed, so anything derived from it (calendar, reminders) is stale. */
function useInvalidateMedicationData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["medications"] }),
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] }),
    ]);
}

export function useAddMedication() {
  const invalidate = useInvalidateMedicationData();
  return useMutation({
    mutationFn: (input: NewMedicationInput) => addMedication(input),
    onSuccess: invalidate,
  });
}

export function useArchiveMedication(_profileId?: string) {
  const invalidate = useInvalidateMedicationData();
  return useMutation({
    mutationFn: (id: string) => archiveMedication(id),
    onSuccess: invalidate,
  });
}

export function useLogDose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      medicationId,
      scheduledAt,
      status,
    }: {
      medicationId: string;
      scheduledAt: string;
      status: DoseStatus;
    }) => logDose(medicationId, scheduledAt, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarEvents"] }),
  });
}
