import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAddDependentProfile, useProfiles } from "../../src/features/profile/useProfiles";

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profiles } = useProfiles();
  const addDependent = useAddDependentProfile();
  const [newName, setNewName] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Profiles</Text>
      <FlatList
        data={profiles ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.displayName}</Text>
            {item.isSelf && <Text style={styles.badge}>You</Text>}
          </View>
        )}
      />

      <View style={styles.addDependentRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a family member's name"
          value={newName}
          onChangeText={setNewName}
        />
        <Pressable
          style={styles.addButton}
          disabled={!newName.trim() || addDependent.isPending}
          onPress={() => {
            addDependent.mutate({ displayName: newName.trim() });
            setNewName("");
          }}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.push("/paywall")}>
          <Text style={styles.link}>Mediulr Premium</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/settings")}>
          <Text style={styles.link}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  sectionTitle: { fontSize: 13, color: "#888", textTransform: "uppercase", paddingHorizontal: 20, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 16 },
  badge: { color: "#4C8BF5", fontWeight: "600" },
  addDependentRow: { flexDirection: "row", gap: 8, padding: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addButton: { backgroundColor: "#4C8BF5", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  addButtonText: { color: "white", fontWeight: "600" },
  links: { marginTop: 12, paddingHorizontal: 20, gap: 16 },
  link: { fontSize: 16, color: "#4C8BF5" },
});
