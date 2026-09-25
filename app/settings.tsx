import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppCard } from "../src/components/AppCard";
import { supabase } from "../src/lib/supabase";
import { friendlyError } from "../src/lib/friendlyError";
import { usePreferences } from "../src/features/preferences/Preferences";

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { prefs, setPreference } = usePreferences();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        EASIER TO USE
      </AppText>
      <AppCard padded={false}>
        <View style={styles.row}>
          <Ionicons name="text-outline" size={18} color={theme.colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">Simple mode</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 17 }}>
              Larger text and buttons, and only the essentials on screen.
            </AppText>
          </View>
          <Switch
            value={prefs.simpleMode}
            onValueChange={(v) => setPreference("simpleMode", v)}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            accessibilityLabel="Simple mode"
          />
        </View>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        REMINDERS
      </AppText>
      <AppCard padded={false}>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={18} color={theme.colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">Follow-up reminders</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 17 }}>
              If a dose is left unanswered, nudge again 15 and 30 minutes later, and offer to tell a guardian.
            </AppText>
          </View>
          <Switch
            value={prefs.followUps}
            onValueChange={(v) => setPreference("followUps", v)}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            accessibilityLabel="Follow-up reminders"
          />
        </View>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        ACCOUNT
      </AppText>
      <AppCard padded={false}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() =>
            Alert.alert("Sign out?", undefined, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: async () => {
                  // Cached data and scheduled reminders are cleared by the SIGNED_OUT listener in app/_layout.tsx.
                  await supabase.auth.signOut();
                  router.replace("/");
                },
              },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
          <AppText variant="bodyMedium">Sign out</AppText>
        </Pressable>
      </AppCard>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        DATA & PRIVACY
      </AppText>
      <AppCard padded={false}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() =>
            Alert.alert(
              "Delete account & data?",
              "This permanently deletes your account and everything in it — medications, doctor visits, and history. This can't be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    const { error } = await supabase.rpc("delete_my_account");
                    if (error) {
                      const notSetUp = /could not find the function|delete_my_account/i.test(error.message);
                      Alert.alert(
                        "Couldn't delete account",
                        notSetUp
                          ? "Account deletion isn't set up on the server yet (run supabase/migrations/0002_delete_account.sql)."
                          : friendlyError(error)
                      );
                      return;
                    }
                    // The auth user is gone, so there's no server session to revoke — just clear the local one.
                    await supabase.auth.signOut({ scope: "local" });
                    router.replace("/");
                  },
                },
              ]
            )
          }
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          <AppText variant="bodyMedium" color="danger">
            Delete account & data
          </AppText>
        </Pressable>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  sectionLabel: { marginBottom: 8, marginLeft: 2, marginTop: 8, letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
