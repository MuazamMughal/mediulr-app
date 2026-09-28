import { dismissForm } from "../../lib/dismissForm";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { SheetHeader } from "../../components/SheetHeader";
import { DateTimeField } from "../../components/DateTimeField";
import { friendlyError } from "../../lib/friendlyError";
import { useActiveProfile } from "../profile/ActiveProfile";
import { useI18n } from "../../i18n/LocaleProvider";
import { useAddAppointment, useDeleteAppointment, useUpdateAppointment } from "./useAppointments";
import { requestNotificationPermission } from "../notifications/scheduleNotifications";
import type { Appointment } from "../../types/domain";

type Props = { mode: "create" } | { mode: "edit"; appointment: Appointment };

/** Adds or edits a doctor visit (and deletes it). Reminders follow automatically: the reminder sync re-plans on every change. */
export function AppointmentForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const { t } = useI18n();
  const addAppointment = useAddAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const appointment = props.mode === "edit" ? props.appointment : null;
  const editing = !!appointment;

  const [providerName, setProviderName] = useState(appointment?.providerName ?? "");
  const [specialty, setSpecialty] = useState(appointment?.specialty ?? "");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [preVisitNotes, setPreVisitNotes] = useState(appointment?.preVisitNotes ?? "");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (appointment) return new Date(appointment.scheduledAt);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setSeconds(0, 0);
    return tomorrow;
  });

  const trimmed = providerName.trim();
  const changed =
    !appointment ||
    trimmed !== appointment.providerName ||
    (specialty.trim() || null) !== appointment.specialty ||
    (location.trim() || null) !== appointment.location ||
    (preVisitNotes.trim() || null) !== appointment.preVisitNotes ||
    scheduledAt.getTime() !== new Date(appointment.scheduledAt).getTime();
  const canSave = trimmed.length > 0 && !!profile && changed;

  async function handleSave() {
    if (!profile || !canSave) return;
    const fields = {
      providerName: trimmed,
      specialty: specialty.trim() || undefined,
      location: location.trim() || undefined,
      scheduledAt: scheduledAt.toISOString(),
      preVisitNotes: preVisitNotes.trim() || undefined,
    };
    try {
      if (appointment) {
        await updateAppointment.mutateAsync({ id: appointment.id, edit: fields });
      } else {
        // Ask before saving: the reminder sync runs the instant the visit lands, so permission must already be settled.
        await requestNotificationPermission();
        await addAppointment.mutateAsync({ profileId: profile.id, ...fields });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      dismissForm(router);
    } catch (err) {
      Alert.alert(appointment ? t("visits.form.errUpdate") : t("visits.form.errSave"), friendlyError(err));
    }
  }

  function handleDelete() {
    if (!appointment) return;
    Alert.alert(t("visits.form.deleteTitle"), t("visits.form.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () =>
          deleteAppointment.mutate(appointment.id, {
            // The visit's detail screen underneath closes itself once its visit is gone.
            onSuccess: () => dismissForm(router),
            onError: (err) => Alert.alert(t("visits.form.errDelete"), friendlyError(err)),
          }),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? t("visits.form.editTitle") : t("visits.form.addTitle")} onClose={() => dismissForm(router)} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {editing
            ? t("visits.form.editHint")
            : `${profile && !profile.isSelf ? `${t("common.addingFor", { name: profile.displayName })} ` : ""}${t("visits.form.addHint")}`}
        </AppText>

        <View style={styles.field}>
          <AppInput label={t("visits.form.provider")} placeholder={t("visits.form.providerPlaceholder")} value={providerName} onChangeText={setProviderName} autoFocus={!editing} />
        </View>
        <View style={styles.field}>
          <AppInput label={t("visits.form.specialty")} placeholder={t("visits.form.specialtyPlaceholder")} value={specialty} onChangeText={setSpecialty} />
        </View>
        <View style={styles.field}>
          <AppInput label={t("visits.form.location")} placeholder={t("visits.form.locationPlaceholder")} value={location} onChangeText={setLocation} />
        </View>
        <View style={styles.field}>
          <DateTimeField label={t("visits.form.dateTime")} value={scheduledAt} onChange={setScheduledAt} tint={theme.colors.visit} />
        </View>
        <View style={styles.field}>
          <AppInput
            label={t("visits.form.prep")}
            placeholder={t("visits.form.prepPlaceholder")}
            value={preVisitNotes}
            onChangeText={setPreVisitNotes}
            multiline
            style={styles.multiline}
          />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label={t("visits.form.delete")} variant="destructive" onPress={handleDelete} loading={deleteAppointment.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label={editing ? t("common.saveChanges") : t("visits.form.save")}
          onPress={handleSave}
          disabled={!canSave}
          loading={addAppointment.isPending || updateAppointment.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  subheading: { marginBottom: 24 },
  field: { marginBottom: 18 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  destructive: { marginTop: 10 },
  footer: { padding: 16, borderTopWidth: 1 },
});
