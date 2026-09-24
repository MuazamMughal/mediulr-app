import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
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
        <Text style={styles.rowTextDestructive}>Sign out</Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert(
            "Delete account?",
            "This permanently deletes your account and all data. This can't be undone.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => {
                // TODO: call a Supabase edge function with the service role to cascade-delete
                // the auth.users row (profiles/medications/etc. cascade via FK on delete).
              } },
            ]
          )
        }
      >
        <Text style={styles.rowTextDestructive}>Delete account & data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  row: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowTextDestructive: { color: "#d9534f", fontSize: 16 },
});
