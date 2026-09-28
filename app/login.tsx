import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppInput } from "../src/components/AppInput";
import { AppButton } from "../src/components/AppButton";
import { AppLogo } from "../src/components/AppLogo";
import { useI18n } from "../src/i18n/LocaleProvider";
import { friendlyError } from "../src/lib/friendlyError";
import { supabase } from "../src/lib/supabase";
import { authRedirectUrl } from "../src/features/auth/links";
import { useAuthSession } from "../src/features/auth/AuthSession";

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<"/onboarding" | "/(tabs)" | null>(null);
  const session = useAuthSession();

  useEffect(() => {
    if (session) router.replace(destination ?? "/(tabs)");
  }, [session, destination, router]);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && (mode === "signIn" ? password.length > 0 : password.length >= 8);

  async function handleSubmit() {
    if (!canSubmit) return;
    setDestination(mode === "signUp" ? "/onboarding" : "/(tabs)");
    setLoading(true);
    try {
      if (mode === "signIn") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) throw new Error("No session was returned after sign in");
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { emailRedirectTo: authRedirectUrl("signup") } });
        if (error) throw error;
        // With email confirmation switched on in Supabase there's no session yet — don't walk into an app that can't load anything.
        if (!data.session) {
          Alert.alert(t("auth.checkEmailTitle"), t("auth.checkEmailBody"));
          setMode("signIn");
          setDestination(null);
          return;
        }
      }
    } catch (err) {
      setDestination(null);
      Alert.alert(t(mode === "signIn" ? "auth.errSignIn" : "auth.errSignUp"), friendlyError(err));
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
          {t("auth.subtitle")}
        </AppText>

        <View style={styles.field}>
          <AppInput
            label={t("auth.email")}
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
            label={t("auth.password")}
            placeholder={mode === "signUp" ? t("auth.passwordPlaceholder") : t("auth.password")}
            secureTextEntry={!showPassword}
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.showPassword} hitSlop={8}>
            <AppText variant="caption" color="accent">
              {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </AppText>
          </Pressable>
          {mode === "signIn" && <Pressable onPress={() => router.push("/auth/forgot-password")} style={styles.showPassword} hitSlop={8}>
            <AppText variant="caption" color="accent">{t("auth.forgotPassword")}</AppText>
          </Pressable>}
        </View>

        <View style={styles.submitButton}>
          <AppButton
            label={mode === "signIn" ? t("auth.signIn") : t("auth.createAccount")}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
          />
        </View>

        <Pressable onPress={() => setMode((m) => (m === "signIn" ? "signUp" : "signIn"))} style={styles.switchLink}>
          <AppText variant="bodySmall" color="secondary">
            {mode === "signIn" ? t("auth.newHere") : t("auth.haveAccount")}
            <AppText variant="bodySmall" color="accent" weight="semibold">
              {mode === "signIn" ? t("auth.createAnAccount") : t("auth.signIn")}
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  logo: { marginBottom: 20 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 40, lineHeight: 22 },
  field: { marginBottom: 16 },
  showPassword: { alignSelf: "flex-end", marginTop: 8 },
  submitButton: { marginTop: 8 },
  switchLink: { alignItems: "center", marginTop: 24 },
});
