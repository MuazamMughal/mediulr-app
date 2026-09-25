import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFood, deleteFood, getFoodEntry, hasAnyFood, listFoodInRange, listRecentFood, updateFood, type FoodInput } from "./api";

/** All food queries live under "foodEntries", so one prefix invalidation refreshes every view of them. */
const KEY = ["foodEntries"] as const;

export function useFoodForRange(profileId: string | undefined, start: Date, end: Date) {
  return useQuery({
    queryKey: [...KEY, "range", profileId, start.toISOString(), end.toISOString()],
    queryFn: () => listFoodInRange(profileId as string, start, end),
    enabled: !!profileId,
    retry: 1,
  });
}

export function useRecentFood(profileId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "recent", profileId],
    queryFn: () => listRecentFood(profileId as string),
    enabled: !!profileId,
    retry: 1,
    staleTime: 60_000,
  });
}

export function useFoodEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "one", id],
    queryFn: () => getFoodEntry(id as string),
    enabled: !!id,
    retry: 1,
  });
}

export function useHasAnyFood(profileId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "any", profileId],
    queryFn: () => hasAnyFood(profileId as string),
    enabled: !!profileId,
    retry: 1,
  });
}

export function useAddFood(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FoodInput) => {
      if (!profileId) throw new Error("No active profile");
      return addFood(profileId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FoodInput }) => updateFood(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFood(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
