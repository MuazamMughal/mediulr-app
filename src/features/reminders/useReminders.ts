import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addReminder, completeReminder, deleteReminder, listCompletionsInRange, listReminders, uncompleteReminder, updateReminder, type ReminderInput } from "./api";
import { remindersInRange, reminderKey } from "./schedule";
import type { ReminderCompletion } from "../../types/domain";

/** Everything about custom reminders lives under "customReminders", so one prefix invalidation refreshes it all. */
const KEY = ["customReminders"] as const;

export function useReminders(profileId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "list", profileId],
    queryFn: () => listReminders(profileId as string),
    enabled: !!profileId,
    retry: 1,
  });
}

/** One day's (or any range's) reminder occurrences, each marked done or not. Undefined until the reminders have loaded. */
export function useReminderEvents(profileId: string | undefined, start: Date, end: Date) {
  const reminders = useReminders(profileId);
  const ids = useMemo(() => (reminders.data ?? []).map((r) => r.id), [reminders.data]);
  const completions = useQuery({
    queryKey: [...KEY, "completions", profileId, ids.join(","), start.toISOString(), end.toISOString()],
    queryFn: () => listCompletionsInRange(ids, start, end),
    enabled: ids.length > 0,
    retry: 1,
  });
  const events = useMemo(
    () => (reminders.data ? remindersInRange(reminders.data, start, end, completions.data ?? []) : undefined),
    // start/end are recreated every render by callers; their instants are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reminders.data, completions.data, start.getTime(), end.getTime()]
  );
  return { events, isLoading: reminders.isLoading || (ids.length > 0 && completions.isLoading), isError: reminders.isError };
}

export function useAddReminder(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReminderInput) => {
      if (!profileId) throw new Error("No active profile");
      return addReminder(profileId, input);
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: KEY }); },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReminderInput }) => updateReminder(id, input),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: KEY }); },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: KEY }); },
  });
}

/** Tick / untick one occurrence. The tick shows instantly and is rolled back if saving fails. */
export function useToggleReminderDone() {
  const queryClient = useQueryClient();
  const completionsKey = [...KEY, "completions"] as const;
  return useMutation({
    mutationFn: ({ reminderId, scheduledAt, done }: { reminderId: string; scheduledAt: string; done: boolean }) =>
      done ? completeReminder(reminderId, scheduledAt) : uncompleteReminder(reminderId, scheduledAt),
    onMutate: async ({ reminderId, scheduledAt, done }) => {
      await queryClient.cancelQueries({ queryKey: completionsKey });
      const before = queryClient.getQueriesData<ReminderCompletion[]>({ queryKey: completionsKey });
      const key = reminderKey(reminderId, scheduledAt);
      queryClient.setQueriesData<ReminderCompletion[]>({ queryKey: completionsKey }, (old) => {
        const list = old ?? [];
        const without = list.filter((c) => reminderKey(c.reminderId, c.scheduledAt) !== key);
        return done ? [...without, { reminderId, scheduledAt, completedAt: new Date().toISOString() }] : without;
      });
      return { before };
    },
    onError: (_err, _vars, context) => context?.before.forEach(([k, data]) => queryClient.setQueryData(k, data)),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: completionsKey }); },
  });
}
