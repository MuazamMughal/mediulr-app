import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../src/components/SheetStatus";
import { useI18n } from "../../src/i18n/LocaleProvider";
import { ReminderForm } from "../../src/features/reminders/ReminderForm";
import { useReminders } from "../../src/features/reminders/useReminders";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import type { CustomReminder } from "../../src/types/domain";

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { profile } = useActiveProfile();
  const { data, isLoading, isError, refetch } = useReminders(profile?.id);

  // Deleting refetches the list without this reminder while the sheet animates away — keep showing the last one.
  const found = data?.find((r) => r.id === id);
  const lastSeen = useRef<CustomReminder | null>(null);
  if (found) lastSeen.current = found;
  const shown = found ?? lastSeen.current;

  const title = t("reminders.title");
  if (isLoading || !profile) return <SheetStatus title={title} onClose={() => router.dismiss()} />;
  if (isError) return <SheetStatus title={title} onClose={() => router.dismiss()} message={t("reminders.errLoadOne")} onRetry={() => refetch()} />;
  if (!shown) return <SheetStatus title={title} onClose={() => router.dismiss()} message={t("reminders.gone")} />;
  return <ReminderForm mode="edit" reminder={shown} />;
}
