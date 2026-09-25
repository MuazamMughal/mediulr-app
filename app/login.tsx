import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppInput } from "../src/components/AppInput";
import { AppButton } from "../src/components/AppButton";
import { AppLogo } from "../src/components/AppLogo";
import { friendlyError } from "../src/lib/friendlyError";
import { supabase } from "../src/lib/supabase";

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        // With email confirmation switched on in Supabase there's no session yet — don't walk into an app that can't load anything.
        if (!data.session) {
          Alert.alert("Check your email", "We sent you a confirmation link. Confirm your email, then sign in.");
          setMode("signIn");
          return;
        }
      }
      router.replace(mode === "signUp" ? "/onboarding" : "/(tabs)");
    } catch (err) {
      Alert.alert("Couldn't sign in", friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppLogo size={56} style={styles.logo} />
        <AppText variant="display" style={styles.title}>
          Mediulr
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          Your medications, doctor visits, and calendar — in one calm place.
        </AppText>

        <View style={styles.field}>
          <AppInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.field}>
          <AppInput
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry={!showPassword}
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.showPassword} hitSlop={8}>
            <AppText variant="caption" color="accent">
              {showPassword ? "Hide password" : "Show password"}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.submitButton}>
          <AppButton
            label={mode === "signIn" ? "Sign in" : "Create account"}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
          />
        </View>

        <Pressable onPress={() => setMode((m) => (m === "signIn" ? "signUp" : "signIn"))} style={styles.switchLink}>
          <AppText variant="bodySmall" color="secondary">
            {mode === "signIn" ? "New here? " : "Already have an account? "}
            <AppText variant="bodySmall" color="accent" weight="semibold">
              {mode === "signIn" ? "Create an account" : "Sign in"}
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, flexGrow: 1 },
  logo: { marginBottom: 20 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 40, lineHeight: 22 },
  field: { marginBottom: 16 },
  showPassword: { alignSelf: "flex-end", marginTop: 8 },
  submitButton: { marginTop: 8 },
  switchLink: { alignItems: "center", marginTop: 24 },
});
