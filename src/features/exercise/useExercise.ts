import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExercise,
  deleteExercise,
  getExerciseEntry,
  hasAnyExercise,
  listExerciseInRange,
  updateExercise,
  type ExerciseInput,
} from "./api";

/** All exercise queries live under "exerciseEntries", so one prefix invalidation refreshes every view of them. */
const KEY = ["exerciseEntries"] as const;

export function useExerciseForRange(profileId: string | undefined, start: Date, end: Date) {
  return useQuery({
    queryKey: [...KEY, "range", profileId, start.toISOString(), end.toISOString()],
    queryFn: () => listExerciseInRange(profileId as string, start, end),
    enabled: !!profileId,
    retry: 1,
  });
}

export function useExerciseEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "one", id],
    queryFn: () => getExerciseEntry(id as string),
    enabled: !!id,
    retry: 1,
  });
}

export function useHasAnyExercise(profileId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "any", profileId],
    queryFn: () => hasAnyExercise(profileId as string),
    enabled: !!profileId,
    retry: 1,
  });
}

export function useAddExercise(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExerciseInput) => {
      if (!profileId) throw new Error("No active profile");
      return addExercise(profileId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExerciseInput }) => updateExercise(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
