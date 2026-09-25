import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../src/components/SheetStatus";
import { GuardianForm } from "../../src/features/guardians/GuardianForm";
import { useGuardians } from "../../src/features/guardians/useGuardians";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import type { Guardian } from "../../src/types/domain";

export default function GuardianDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useActiveProfile();
  const { data: guardians, isLoading, isError, refetch } = useGuardians(profile?.id);

  // Removing a guardian refetches the list without them while the sheet animates away — keep showing the last one.
  const found = guardians?.find((g) => g.id === id);
  const lastSeen = useRef<Guardian | null>(null);
  if (found) lastSeen.current = found;
  const shown = found ?? lastSeen.current;

  if (isLoading) return <SheetStatus title="Guardian" onClose={() => router.dismiss()} />;
  if (isError) return <SheetStatus title="Guardian" onClose={() => router.dismiss()} message="Couldn't load this guardian." onRetry={() => refetch()} />;
  if (!shown) return <SheetStatus title="Guardian" onClose={() => router.dismiss()} message="This guardian no longer exists." />;
  return <GuardianForm mode="edit" guardian={shown} />;
}
