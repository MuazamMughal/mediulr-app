import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "../../src/components/AppButton";
import { AppInput } from "../../src/components/AppInput";
import { AppText } from "../../src/components/AppText";
import { authRedirectUrl } from "../../src/features/auth/links";
import { useI18n } from "../../src/i18n/LocaleProvider";
import { friendlyError } from "../../src/lib/friendlyError";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  async function send() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl("recovery") });
      if (error) throw error;
      Alert.alert(t("auth.checkEmailTitle"), t("auth.resetEmailSent"));
      router.replace("/login");
    } catch (error) {
      Alert.alert(t("auth.resetFailed"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }
  return <View style={{ flex: 1, width: "100%", maxWidth: 480, alignSelf: "center", padding: 28, gap: 18, justifyContent: "center", backgroundColor: theme.colors.background }}>
    <AppText variant="h1">{t("auth.forgotPassword")}</AppText>
    <AppText color="secondary">{t("auth.resetInstructions")}</AppText>
    <AppInput label={t("auth.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <AppButton label={t("auth.sendResetLink")} onPress={send} loading={loading} disabled={!/\S+@\S+\.\S+/.test(email.trim())} />
    <AppButton label={t("auth.backToSignIn")} variant="ghost" onPress={() => router.replace("/login")} />
  </View>;
}
