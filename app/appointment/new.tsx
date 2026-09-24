import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAddAppointment } from "../../src/features/appointments/useAppointments";
import { requestNotificationPermission, scheduleReminder } from "../../src/features/notifications/scheduleNotifications";

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
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
    const appointment = await addAppointment.mutateAsync({
      profileId: profile.id,
      providerName: providerName.trim(),
      specialty: specialty.trim() || undefined,
      location: location.trim() || undefined,
      scheduledAt: scheduledAt.toISOString(),
      preVisitNotes: preVisitNotes.trim() || undefined,
    });

    const granted = await requestNotificationPermission();
    if (granted) {
      const dayBefore = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
      const hourBefore = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
      for (const fireAt of [dayBefore, hourBefore]) {
        await scheduleReminder({
          id: `${appointment.id}:${fireAt.toISOString()}`,
          title: `Upcoming visit: ${appointment.providerName}`,
          body: appointment.specialty ?? "Doctor visit reminder",
          fireAt,
        });
      }
    } else {
      Alert.alert("Notifications off", "Enable notifications in Settings to get visit reminders.");
    }

    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Provider name</Text>
      <TextInput style={styles.input} placeholder="e.g. Dr. Patel" value={providerName} onChangeText={setProviderName} />

      <Text style={styles.label}>Specialty (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. Cardiology" value={specialty} onChangeText={setSpecialty} />

      <Text style={styles.label}>Location (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. Main St Clinic" value={location} onChangeText={setLocation} />

      <Text style={styles.label}>Date & time</Text>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{scheduledAt.toLocaleString()}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={scheduledAt}
          mode="datetime"
          onChange={(_, date) => {
            setShowPicker(Platform.OS === "ios");
            if (date) setScheduledAt(date);
          }}
        />
      )}

      <Text style={styles.label}>Notes to bring / prep (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. bring insurance card, fasting required"
        value={preVisitNotes}
        onChangeText={setPreVisitNotes}
        multiline
      />

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave || addAppointment.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>{addAppointment.isPending ? "Saving…" : "Save doctor visit"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  label: { fontSize: 13, color: "#888", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, justifyContent: "center" },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  saveButton: { marginTop: 28, backgroundColor: "#F5A623", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
