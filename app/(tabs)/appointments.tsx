import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAppointments } from "../../src/features/appointments/useAppointments";

export default function AppointmentsScreen() {
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: appointments, isLoading } = useAppointments(profile?.id);

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.empty}>Loading…</Text>}
      {!isLoading && (!appointments || appointments.length === 0) && (
        <Text style={styles.empty}>No doctor visits yet — add one below.</Text>
      )}
      <FlatList
        data={appointments ?? []}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/appointment/${item.id}`)}>
            <Text style={styles.name}>{item.providerName}</Text>
            <Text style={styles.subtitle}>
              {new Date(item.scheduledAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            {item.specialty && <Text style={styles.meta}>{item.specialty}</Text>}
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/appointment/new")}>
        <Text style={styles.fabText}>+ Add doctor visit</Text>
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
  meta: { color: "#888", marginTop: 2, fontSize: 12 },
  fab: { margin: 16, backgroundColor: "#F5A623", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "white", fontWeight: "600" },
});
