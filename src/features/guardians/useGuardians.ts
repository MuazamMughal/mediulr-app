import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addGuardian, deleteGuardian, listGuardians, updateGuardian, type GuardianInput } from "./api";

const KEY = ["guardians"] as const;

export function useGuardians(profileId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, profileId],
    queryFn: () => listGuardians(profileId as string),
    enabled: !!profileId,
    retry: 1,
  });
}

export function useAddGuardian(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GuardianInput) => {
      if (!profileId) throw new Error("No active profile");
      return addGuardian(profileId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GuardianInput }) => updateGuardian(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGuardian(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
