import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../src/components/SheetStatus";
import type { ExerciseEntry } from "../../src/types/domain";
import { ExerciseForm } from "../../src/features/exercise/ExerciseForm";
import { useExerciseEntry } from "../../src/features/exercise/useExercise";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading, isError, refetch } = useExerciseEntry(id);

  // Deleting refetches the entry into `null` while the sheet is still animating away — keep showing the last one.
  const lastSeen = useRef<ExerciseEntry | null>(null);
  if (entry) lastSeen.current = entry;
  const shown = entry ?? lastSeen.current;

  if (isLoading) return <SheetStatus title="Activity" onClose={() => router.dismiss()} />;
  if (isError) return <SheetStatus title="Activity" onClose={() => router.dismiss()} message="Couldn't load this activity." onRetry={() => refetch()} />;
  if (!shown) return <SheetStatus title="Activity" onClose={() => router.dismiss()} message="This activity no longer exists." />;
  return <ExerciseForm mode="edit" entry={shown} />;
}
