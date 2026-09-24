import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useArchiveMedication, useMedications } from "../../src/features/medications/useMedications";
import { describeRecurrence } from "../../src/features/medications/describeRecurrence";

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: medications } = useMedications(profile?.id);
  const archiveMedication = useArchiveMedication(profile?.id);

  const medication = medications?.find((m) => m.id === id);
  if (!medication) return <View style={styles.container}><Text>Loading…</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{medication.name}</Text>
      <Text style={styles.detail}>{medication.dosage}</Text>
      <Text style={styles.detail}>{describeRecurrence(medication.recurrenceRule)}</Text>
      {medication.instructions && <Text style={styles.detail}>{medication.instructions}</Text>}
      {medication.quantityOnHand != null && (
        <Text style={styles.detail}>{medication.quantityOnHand} doses remaining</Text>
      )}

      <Pressable
        style={styles.archiveButton}
        onPress={() =>
          Alert.alert("Stop this medication?", "This stops future reminders. It won't delete past history.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Stop",
              style: "destructive",
              onPress: async () => {
                await archiveMedication.mutateAsync(medication.id);
                router.back();
              },
            },
          ])
        }
      >
        <Text style={styles.archiveButtonText}>Stop this medication</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  detail: { fontSize: 15, color: "#444", marginBottom: 4 },
  archiveButton: { marginTop: 32, paddingVertical: 14, alignItems: "center" },
  archiveButtonText: { color: "#d9534f", fontWeight: "600" },
});
