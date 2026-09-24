import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMedication, archiveMedication, listMedications, logDose, type NewMedicationInput } from "./api";
import type { DoseStatus } from "../../types/domain";

export function useMedications(profileId: string | undefined) {
  return useQuery({
    queryKey: ["medications", profileId],
    queryFn: () => listMedications(profileId as string),
    enabled: !!profileId,
  });
}

export function useAddMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewMedicationInput) => addMedication(input),
    onSuccess: (medication) =>
      queryClient.invalidateQueries({ queryKey: ["medications", medication.profileId] }),
  });
}

export function useArchiveMedication(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveMedication(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medications", profileId] }),
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
