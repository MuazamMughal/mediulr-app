import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppSwitch } from "../src/components/AppSwitch";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppCard } from "../src/components/AppCard";
import { Divider } from "../src/components/Divider";
import { supabase } from "../src/lib/supabase";
import { friendlyError } from "../src/lib/friendlyError";
import { usePreferences } from "../src/features/preferences/Preferences";
import { useI18n } from "../src/i18n/LocaleProvider";
import { LOCALES, type LanguagePref } from "../src/i18n/core";
import { editStore } from "../src/features/offline/editApi";
import { doseOutbox } from "../src/features/offline/doseOutbox";

const LANGUAGE_CHOICES: { pref: LanguagePref; label: (t: (k: "language.system") => string) => string }[] = [
  { pref: "system", label: (t) => t("language.system") },
  ...LOCALES.map((l) => ({ pref: l.code as LanguagePref, label: () => l.name })),
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { prefs, setPreference } = usePreferences();
  const { t, languagePref, setLanguage } = useI18n();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("settings.easier")}
      </AppText>
      <AppCard padded={false}>
        <View style={styles.row}>
          <Ionicons name="text-outline" size={18} color={theme.colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">{t("settings.simple")}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 17 }}>
              {t("settings.simpleText")}
            </AppText>
          </View>
          <AppSwitch
            value={prefs.simpleMode}
            onValueChange={(v) => setPreference("simpleMode", v)}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            accessibilityLabel={t("settings.simple")}
          />
        </View>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("settings.language")}
      </AppText>
      <AppCard padded={false}>
        {LANGUAGE_CHOICES.map((choice, i) => {
          const selected = languagePref === choice.pref;
          return (
            <View key={choice.pref}>
              {i > 0 && <Divider />}
              <Pressable
                onPress={() => setLanguage(choice.pref)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={choice.label(t)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="language-outline" size={18} color={theme.colors.textSecondary} />
                <AppText variant="bodyMedium" style={{ flex: 1 }}>
                  {choice.label(t)}
                </AppText>
                {selected && <Ionicons name="checkmark" size={20} color={theme.colors.accent} />}
              </Pressable>
            </View>
          );
        })}
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("settings.reminders")}
      </AppText>
      <AppCard padded={false}>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={18} color={theme.colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">{t("settings.followUps")}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 17 }}>
              {t("settings.followUpsText")}
            </AppText>
          </View>
          <AppSwitch
            value={prefs.followUps}
            onValueChange={(v) => setPreference("followUps", v)}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            accessibilityLabel={t("settings.followUps")}
          />
        </View>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("settings.account")}
      </AppText>
      <AppCard padded={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.signOut")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() =>
            Alert.alert(t("settings.signOutTitle"), editStore.list().length || doseOutbox.list().length ? t("settings.signOutPending") : undefined, [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("settings.signOut"),
                style: "destructive",
                onPress: async () => {
                  // Cached data and scheduled reminders are cleared by the SIGNED_OUT listener in app/_layout.tsx.
                  const { error } = await supabase.auth.signOut();
                  if (error) Alert.alert(t("settings.signOutTitle"), friendlyError(error));
                  else router.replace("/");
                },
              },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
          <AppText variant="bodyMedium">{t("settings.signOut")}</AppText>
        </Pressable>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("settings.dataPrivacy")}
      </AppText>
      <AppCard padded={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.deleteAccount")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() =>
            Alert.alert(t("settings.deleteTitle"), t("settings.deleteBody"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.delete"),
                style: "destructive",
                onPress: async () => {
                  const { error } = await supabase.rpc("delete_my_account");
                  if (error) {
                    const notSetUp = /could not find the function|delete_my_account/i.test(error.message);
                    Alert.alert(t("settings.errDelete"), notSetUp ? t("settings.errDeleteNotSetUp") : friendlyError(error));
                    return;
                  }
                  // The auth user is gone, so there's no server session to revoke — just clear the local one.
                  await supabase.auth.signOut({ scope: "local" });
                  router.replace("/");
                },
              },
            ])
          }
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          <AppText variant="bodyMedium" color="danger">
            {t("settings.deleteAccount")}
          </AppText>
        </Pressable>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  sectionLabel: { marginBottom: 8, marginStart: 2, marginTop: 8, letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
