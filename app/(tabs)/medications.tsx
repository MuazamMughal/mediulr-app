import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useMedications } from "../../src/features/medications/useMedications";
import { describeRecurrence } from "../../src/features/medications/describeRecurrence";

export default function MedicationsScreen() {
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: medications, isLoading } = useMedications(profile?.id);

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.empty}>Loading…</Text>}
      {!isLoading && (!medications || medications.length === 0) && (
        <Text style={styles.empty}>No medications yet — add your first one below.</Text>
      )}
      <FlatList
        data={medications ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/medication/${item.id}`)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subtitle}>
              {item.dosage} · {describeRecurrence(item.recurrenceRule)}
            </Text>
            {item.quantityOnHand != null && (
              <Text style={styles.meta}>{item.quantityOnHand} remaining</Text>
            )}
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/medication/new")}>
        <Text style={styles.fabText}>+ Add medication</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  row: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  subtitle: { color: "#666", marginTop: 2 },
  meta: { color: "#F5A623", marginTop: 2, fontSize: 12 },
  fab: { margin: 16, backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "white", fontWeight: "600" },
});
