import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppInput } from "../../src/components/AppInput";
import { AppButton } from "../../src/components/AppButton";
import { SheetHeader } from "../../src/components/SheetHeader";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useAddAppointment } from "../../src/features/appointments/useAppointments";
import { requestNotificationPermission } from "../../src/features/notifications/scheduleNotifications";

export default function NewAppointmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const addAppointment = useAddAppointment();

  const [providerName, setProviderName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [preVisitNotes, setPreVisitNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);

  const canSave = providerName.trim().length > 0 && !!profile;

  async function handleSave() {
    if (!profile) return;
    try {
      // Ask before saving: the reminder sync runs the instant the visit lands, so permission must already be settled.
      await requestNotificationPermission();

      await addAppointment.mutateAsync({
        profileId: profile.id,
        providerName: providerName.trim(),
        specialty: specialty.trim() || undefined,
        location: location.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        preVisitNotes: preVisitNotes.trim() || undefined,
      });

      router.dismiss();
    } catch (err) {
      Alert.alert("Couldn't save doctor visit", friendlyError(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SheetHeader title="Add doctor visit" onClose={() => router.dismiss()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {profile && !profile.isSelf ? `Adding for ${profile.displayName}. ` : ""}We'll remind you the day before and an hour before.
        </AppText>

        <View style={styles.field}>
          <AppInput label="Provider name" placeholder="e.g. Dr. Patel" value={providerName} onChangeText={setProviderName} autoFocus />
        </View>

        <View style={styles.field}>
          <AppInput label="Specialty (optional)" placeholder="e.g. Cardiology" value={specialty} onChangeText={setSpecialty} />
        </View>

        <View style={styles.field}>
          <AppInput label="Location (optional)" placeholder="e.g. Main St Clinic" value={location} onChangeText={setLocation} />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            Date & time
          </AppText>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.dateButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.colors.visit} />
            <AppText variant="body">{scheduledAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</AppText>
          </Pressable>
          {showPicker && Platform.OS === "ios" && (
            <View style={[styles.pickerWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <DateTimePicker value={scheduledAt} mode="datetime" display="spinner" onValueChange={(_, date) => setScheduledAt(date)} />
              <Pressable onPress={() => setShowPicker(false)} style={styles.doneRow}>
                <AppText variant="bodySmall" color="accent" weight="semibold">
                  Done
                </AppText>
              </Pressable>
            </View>
          )}
          {showPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={scheduledAt}
              mode="datetime"
              onValueChange={(_, date) => setScheduledAt(date)}
              onDismiss={() => setShowPicker(false)}
            />
          )}
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label="Save doctor visit"
          onPress={handleSave}
          disabled={!canSave}
          loading={addAppointment.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  subheading: { marginBottom: 24 },
  field: { marginBottom: 18 },
  label: { marginBottom: 8, marginLeft: 2 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  pickerWrap: { borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginTop: -8, paddingTop: 8 },
  doneRow: { alignItems: "flex-end", paddingVertical: 8, paddingHorizontal: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
});
