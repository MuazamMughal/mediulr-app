import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../src/components/SheetStatus";
import type { FoodEntry } from "../../src/types/domain";
import { FoodForm } from "../../src/features/nutrition/FoodForm";
import { useFoodEntry } from "../../src/features/nutrition/useFood";

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading, isError, refetch } = useFoodEntry(id);

  // Deleting refetches the entry into `null` while the sheet is still animating away — keep showing the last one.
  const lastSeen = useRef<FoodEntry | null>(null);
  if (entry) lastSeen.current = entry;
  const shown = entry ?? lastSeen.current;

  if (isLoading) return <SheetStatus title="Meal" onClose={() => router.dismiss()} />;
  if (isError) return <SheetStatus title="Meal" onClose={() => router.dismiss()} message="Couldn't load this meal." onRetry={() => refetch()} />;
  if (!shown) return <SheetStatus title="Meal" onClose={() => router.dismiss()} message="This meal no longer exists." />;
  return <FoodForm mode="edit" entry={shown} />;
}
