import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const { error } =
        mode === "signIn"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      router.replace(mode === "signUp" ? "/onboarding" : "/(tabs)");
    } catch (err) {
      Alert.alert("Couldn't sign in", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mediulr</Text>
      <Text style={styles.subtitle}>Your medications, doctor visits, and calendar — in one place.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} disabled={loading} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>
          {loading ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode((m) => (m === "signIn" ? "signUp" : "signIn"))}>
        <Text style={styles.switchText}>
          {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28 },
  title: { fontSize: 32, fontWeight: "800", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#888", marginTop: 8, marginBottom: 32 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  primaryButton: { backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  switchText: { textAlign: "center", color: "#4C8BF5", marginTop: 20 },
});
