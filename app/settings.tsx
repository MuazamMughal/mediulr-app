import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppCard } from "../src/components/AppCard";
import { supabase } from "../src/lib/supabase";

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                  onPress: () => {
                    // TODO: call a Supabase edge function with the service role to cascade-delete
                    // the auth.users row (profiles/medications/etc. cascade via FK on delete).
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionLabel: { marginBottom: 8, marginLeft: 2, marginTop: 8, letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
