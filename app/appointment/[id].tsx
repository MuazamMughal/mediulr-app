import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAppointments, useUpdatePostVisitNotes } from "../../src/features/appointments/useAppointments";

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useActiveSelfProfile();
  const { data: appointments } = useAppointments(profile?.id);
  const updateNotes = useUpdatePostVisitNotes(profile?.id);

  const appointment = appointments?.find((a) => a.id === id);
  const [notes, setNotes] = useState(appointment?.postVisitNotes ?? "");

  if (!appointment) return <View style={styles.container}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{appointment.providerName}</Text>
      {appointment.specialty && <Text style={styles.detail}>{appointment.specialty}</Text>}
      {appointment.location && <Text style={styles.detail}>{appointment.location}</Text>}
      <Text style={styles.detail}>{new Date(appointment.scheduledAt).toLocaleString()}</Text>

      {appointment.preVisitNotes && (
        <>
          <Text style={styles.label}>Before your visit</Text>
          <Text style={styles.detail}>{appointment.preVisitNotes}</Text>
        </>
      )}

      <Text style={styles.label}>What the doctor said (after your visit)</Text>
      <TextInput
        style={styles.multiline}
        multiline
        placeholder="Notes, next steps…"
        value={notes}
        onChangeText={setNotes}
        onBlur={() => {
          if (notes !== appointment.postVisitNotes) {
            updateNotes.mutate({ id: appointment.id, notes });
          }
        }}
      />

      <Text style={styles.hint}>
        This stays on your device and account only — Mediulr never sends visit notes to a provider.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  detail: { fontSize: 15, color: "#444", marginBottom: 4 },
  label: { fontSize: 13, color: "#888", marginTop: 20, marginBottom: 6 },
  multiline: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: "top", fontSize: 15 },
  hint: { marginTop: 16, fontSize: 12, color: "#999" },
});
