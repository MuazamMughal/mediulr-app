import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAddMedication } from "../../src/features/medications/useMedications";
import { occurrencesInRange, type RecurrenceRule } from "../../src/lib/recurrence";
import { requestNotificationPermission, scheduleReminder } from "../../src/features/notifications/scheduleNotifications";

const FREQUENCY_OPTIONS: { label: string; rule: (times: string[]) => RecurrenceRule }[] = [
  { label: "Once a day", rule: (times) => ({ type: "times_per_day", count: 1, at: times }) },
  { label: "Twice a day", rule: (times) => ({ type: "times_per_day", count: 2, at: times }) },
  { label: "3x a day", rule: (times) => ({ type: "times_per_day", count: 3, at: times }) },
  { label: "4x a day", rule: (times) => ({ type: "times_per_day", count: 4, at: times }) },
];

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

export default function NewMedicationScreen() {
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const addMedication = useAddMedication();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequencyIndex, setFrequencyIndex] = useState(2); // default: 3x/day
  const [quantityOnHand, setQuantityOnHand] = useState("");

  const canSave = name.trim().length > 0 && dosage.trim().length > 0 && !!profile;

  async function handleSave() {
    if (!profile) return;
    const option = FREQUENCY_OPTIONS[frequencyIndex];
    const times = DEFAULT_TIMES[frequencyIndex + 1]; // FREQUENCY_OPTIONS[i] means "(i+1)x a day"
    const recurrenceRule = option.rule(times);
    const startDate = new Date().toISOString().slice(0, 10);

    const medication = await addMedication.mutateAsync({
      profileId: profile.id,
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim() || undefined,
      recurrenceRule,
      quantityOnHand: quantityOnHand ? Number(quantityOnHand) : undefined,
      startDate,
    });

    const granted = await requestNotificationPermission();
    if (granted) {
      const now = new Date();
      const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const occurrences = occurrencesInRange(recurrenceRule, now, weekOut, { startDate: now });
      for (const at of occurrences) {
        await scheduleReminder({
          id: `${medication.id}:${at.toISOString()}`,
          title: `Time for ${medication.name}`,
          body: medication.dosage,
          fireAt: at,
        });
      }
    } else {
      Alert.alert(
        "Notifications off",
        "Mediulr can't remind you without notification permission — enable it in Settings to get dose reminders."
      );
    }

    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Medication name</Text>
      <TextInput style={styles.input} placeholder="e.g. Amoxicillin" value={name} onChangeText={setName} />

      <Text style={styles.label}>Dosage</Text>
      <TextInput style={styles.input} placeholder="e.g. 500mg" value={dosage} onChangeText={setDosage} />

      <Text style={styles.label}>Instructions (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. with food" value={instructions} onChangeText={setInstructions} />

      <Text style={styles.label}>How often</Text>
      <View style={styles.freqRow}>
        {FREQUENCY_OPTIONS.map((opt, i) => (
          <Pressable
            key={opt.label}
            style={[styles.freqChip, frequencyIndex === i && styles.freqChipActive]}
            onPress={() => setFrequencyIndex(i)}
          >
            <Text style={[styles.freqChipText, frequencyIndex === i && styles.freqChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Quantity on hand (optional, for refill reminders)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 30"
        keyboardType="numeric"
        value={quantityOnHand}
        onChangeText={setQuantityOnHand}
      />

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave || addMedication.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>{addMedication.isPending ? "Saving…" : "Save medication"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 4 },
  label: { fontSize: 13, color: "#888", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  freqChipActive: { backgroundColor: "#4C8BF5", borderColor: "#4C8BF5" },
  freqChipText: { color: "#333" },
  freqChipTextActive: { color: "white", fontWeight: "600" },
  saveButton: { marginTop: 28, backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
