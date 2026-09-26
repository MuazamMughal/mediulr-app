import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../src/components/SheetStatus";
import { useI18n } from "../../src/i18n/LocaleProvider";
import type { ExerciseEntry } from "../../src/types/domain";
import { ExerciseForm } from "../../src/features/exercise/ExerciseForm";
import { useExerciseEntry } from "../../src/features/exercise/useExercise";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { data: entry, isLoading, isError, refetch } = useExerciseEntry(id);

  // Deleting refetches the entry into `null` while the sheet is still animating away — keep showing the last one.
  const lastSeen = useRef<ExerciseEntry | null>(null);
  if (entry) lastSeen.current = entry;
  const shown = entry ?? lastSeen.current;

  if (isLoading) return <SheetStatus title={t("nav.activity")} onClose={() => router.dismiss()} />;
  if (isError) return <SheetStatus title={t("nav.activity")} onClose={() => router.dismiss()} message={t("exercise.sheet.loadError")} onRetry={() => refetch()} />;
  if (!shown) return <SheetStatus title={t("nav.activity")} onClose={() => router.dismiss()} message={t("exercise.sheet.gone")} />;
  return <ExerciseForm mode="edit" entry={shown} />;
}
