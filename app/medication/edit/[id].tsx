import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../../src/components/SheetStatus";
import { MedicationForm } from "../../../src/features/medications/MedicationForm";
import { useAllMedications } from "../../../src/features/medications/useMedications";
import { useI18n } from "../../../src/i18n/LocaleProvider";
import { useActiveProfile } from "../../../src/features/profile/ActiveProfile";

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { profile } = useActiveProfile();
  const { data: medications, isLoading } = useAllMedications(profile?.id);
  const medication = medications?.find((m) => m.id === id);

  if (isLoading || !profile) return <SheetStatus title={t("nav.medication")} onClose={() => router.dismiss()} />;
  if (!medication) return <SheetStatus title={t("nav.medication")} onClose={() => router.dismiss()} message={t("meds.sheet.gone")} />;
  return <MedicationForm mode="edit" medication={medication} />;
}
