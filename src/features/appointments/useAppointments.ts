import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAppointment, listAppointments, updatePostVisitNotes, type NewAppointmentInput } from "./api";

export function useAppointments(profileId: string | undefined) {
  return useQuery({
    queryKey: ["appointments", profileId],
    queryFn: () => listAppointments(profileId as string),
    enabled: !!profileId,
  });
}

export function useAddAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAppointmentInput) => addAppointment(input),
    onSuccess: (appointment) =>
      queryClient.invalidateQueries({ queryKey: ["appointments", appointment.profileId] }),
  });
}

export function useUpdatePostVisitNotes(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => updatePostVisitNotes(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments", profileId] }),
  });
}
