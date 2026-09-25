import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../../src/components/SheetStatus";
import { MedicationForm } from "../../../src/features/medications/MedicationForm";
import { useAllMedications } from "../../../src/features/medications/useMedications";
import { useActiveProfile } from "../../../src/features/profile/ActiveProfile";

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useActiveProfile();
  const { data: medications, isLoading } = useAllMedications(profile?.id);
  const medication = medications?.find((m) => m.id === id);

  if (isLoading || !profile) return <SheetStatus title="Medication" onClose={() => router.dismiss()} />;
  if (!medication) return <SheetStatus title="Medication" onClose={() => router.dismiss()} message="This medication no longer exists." />;
  return <MedicationForm mode="edit" medication={medication} />;
}
