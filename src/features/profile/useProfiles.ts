import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDependentProfile, listProfiles } from "./api";

export function useProfiles() {
  return useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
}

export function useAddDependentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ displayName, dateOfBirth }: { displayName: string; dateOfBirth?: string }) =>
      addDependentProfile(displayName, dateOfBirth),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });
}
