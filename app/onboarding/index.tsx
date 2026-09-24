import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Mediulr</Text>
      <Text style={styles.subtitle}>
        One calendar for your medications, doctor visits, and everything in between.
      </Text>

      <Pressable style={styles.primaryButton} onPress={() => router.replace("/medication/new")}>
        <Text style={styles.primaryButtonText}>Add your first medication</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(tabs)/calendar")}>
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 40 },
  primaryButton: { backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  secondaryButton: { marginTop: 16, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#888" },
});
