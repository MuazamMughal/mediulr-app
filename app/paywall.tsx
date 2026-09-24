import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * Subscription screen stub. Real purchase flow wires up here via RevenueCat
 * (react-native-purchases) once App Store Connect / Play Console products exist
 * — see docs/SETUP.md. Deliberately not wired to a live SDK yet so this compiles
 * and runs before those store-side products are created.
 */
export default function PaywallScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mediulr Premium</Text>
      <Text style={styles.price}>$2.99/month</Text>
      <Text style={styles.subtitle}>7-day free trial, cancel anytime.</Text>

      <View style={styles.features}>
        <Text style={styles.feature}>• Unlimited family/caregiver profiles</Text>
        <Text style={styles.feature}>• Health-record PDF export</Text>
        <Text style={styles.feature}>• Priority reminder customization</Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          // TODO: wire up react-native-purchases purchase flow.
          router.back();
        }}
      >
        <Text style={styles.primaryButtonText}>Start free trial</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  price: { fontSize: 32, fontWeight: "800", textAlign: "center", marginTop: 8, color: "#4C8BF5" },
  subtitle: { textAlign: "center", color: "#888", marginTop: 4, marginBottom: 28 },
  features: { gap: 8, marginBottom: 32 },
  feature: { fontSize: 15, color: "#333" },
  primaryButton: { backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  secondaryButton: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#888" },
});
