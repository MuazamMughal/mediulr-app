import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetStatus } from "../../../src/components/SheetStatus";
import { AppointmentForm } from "../../../src/features/appointments/AppointmentForm";
import { useAppointments } from "../../../src/features/appointments/useAppointments";
import { useI18n } from "../../../src/i18n/LocaleProvider";
import { useActiveProfile } from "../../../src/features/profile/ActiveProfile";
import type { Appointment } from "../../../src/types/domain";

export default function EditAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { profile } = useActiveProfile();
  const { data: appointments, isLoading } = useAppointments(profile?.id);

  // Deleting refetches the list without this visit while the sheet animates away — keep showing the last one.
  const found = appointments?.find((a) => a.id === id);
  const lastSeen = useRef<Appointment | null>(null);
  if (found) lastSeen.current = found;
  const shown = found ?? lastSeen.current;

  if (isLoading || !profile) return <SheetStatus title={t("nav.doctorVisit")} onClose={() => router.dismiss()} />;
  if (!shown) return <SheetStatus title={t("nav.doctorVisit")} onClose={() => router.dismiss()} message={t("visits.sheet.gone")} />;
  return <AppointmentForm mode="edit" appointment={shown} />;
}
