import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "../../src/components/AppButton";
import { AppInput } from "../../src/components/AppInput";
import { AppText } from "../../src/components/AppText";
import { useI18n } from "../../src/i18n/LocaleProvider";
import { friendlyError } from "../../src/lib/friendlyError";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  async function save() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert(t("auth.passwordUpdated"));
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(t("auth.resetFailed"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }
  return <View style={{ flex: 1, width: "100%", maxWidth: 480, alignSelf: "center", padding: 28, gap: 18, justifyContent: "center", backgroundColor: theme.colors.background }}>
    <AppText variant="h1">{t("auth.choosePassword")}</AppText>
    <AppInput label={t("auth.newPassword")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <AppInput label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
    <AppButton label={t("auth.savePassword")} onPress={save} loading={loading} disabled={password.length < 8 || password !== confirm} />
  </View>;
}
