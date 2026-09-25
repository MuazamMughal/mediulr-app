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
      router.dismiss();
    } catch (err) {
      Alert.alert(appointment ? "Couldn't update doctor visit" : "Couldn't save doctor visit", friendlyError(err));
    }
  }

  function handleDelete() {
    if (!appointment) return;
    Alert.alert("Delete this visit?", "It will be removed from your calendar and its reminders cancelled. Any notes you wrote about it are deleted too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteAppointment.mutate(appointment.id, {
            // The visit's detail screen underneath closes itself once its visit is gone.
            onSuccess: () => router.dismiss(),
            onError: (err) => Alert.alert("Couldn't delete visit", friendlyError(err)),
          }),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? "Edit doctor visit" : "Add doctor visit"} onClose={() => router.dismiss()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {editing
            ? "Reminders move with the visit."
            : `${profile && !profile.isSelf ? `Adding for ${profile.displayName}. ` : ""}We'll remind you the day before and an hour before.`}
        </AppText>

        <View style={styles.field}>
          <AppInput label="Provider name" placeholder="e.g. Dr. Patel" value={providerName} onChangeText={setProviderName} autoFocus={!editing} />
        </View>
        <View style={styles.field}>
          <AppInput label="Specialty (optional)" placeholder="e.g. Cardiology" value={specialty} onChangeText={setSpecialty} />
        </View>
        <View style={styles.field}>
          <AppInput label="Location (optional)" placeholder="e.g. Main St Clinic" value={location} onChangeText={setLocation} />
        </View>
        <View style={styles.field}>
          <DateTimeField label="Date & time" value={scheduledAt} onChange={setScheduledAt} tint={theme.colors.visit} />
        </View>
        <View style={styles.field}>
          <AppInput
            label="Notes to bring / prep (optional)"
            placeholder="e.g. bring insurance card, fasting required"
            value={preVisitNotes}
            onChangeText={setPreVisitNotes}
            multiline
            style={styles.multiline}
          />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label="Delete visit" variant="destructive" onPress={handleDelete} loading={deleteAppointment.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label={editing ? "Save changes" : "Save doctor visit"}
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
