import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppCard } from "../../src/components/AppCard";
import { Avatar } from "../../src/components/Avatar";
import { Divider } from "../../src/components/Divider";
import { friendlyError } from "../../src/lib/friendlyError";
import { useAddDependentProfile, useProfiles } from "../../src/features/profile/useProfiles";

function NavRow({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.navIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <AppText variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: profiles } = useProfiles();
  const addDependent = useAddDependentProfile();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const self = profiles?.find((p) => p.isSelf);
  const dependents = profiles?.filter((p) => !p.isSelf) ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "profile"}
        contentContainerStyle={styles.content}
        renderItem={() => (
          <>
            <AppText variant="h1" style={styles.pageTitle}>
              Profile
            </AppText>

            {/* Your profile */}
            {self && (
              <View style={styles.selfRow}>
                <Avatar name={self.displayName} size={56} />
                <View style={{ marginLeft: 14 }}>
                  <AppText variant="h2">{self.displayName}</AppText>
                  <AppText variant="bodySmall" color="secondary">
                    Your Mediulr account
                  </AppText>
                </View>
              </View>
            )}

            {/* Family / Care */}
            <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
              FAMILY & CARE
            </AppText>
            <AppCard padded={false} style={styles.familyCard}>
              {dependents.map((dep, i) => (
                <View key={dep.id}>
                  {i > 0 && <Divider style={{ marginLeft: 68 }} />}
                  <View style={styles.dependentRow}>
                    <Avatar name={dep.displayName} size={40} />
                    <AppText variant="bodyMedium" style={{ marginLeft: 12 }}>
                      {dep.displayName}
                    </AppText>
                  </View>
                </View>
              ))}
              {dependents.length > 0 && <Divider style={{ marginLeft: 68 }} />}
              {adding ? (
                <View style={styles.addForm}>
                  <TextInput
                    style={[styles.addInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                    placeholder="Family member's name"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    onSubmitEditing={() => {
                      const displayName = newName.trim();
                      if (!displayName) return;
                      addDependent.mutate(
                        { displayName },
                        { onError: (err) => Alert.alert("Couldn't add family member", friendlyError(err)) }
                      );
                      setNewName("");
                      setAdding(false);
                    }}
                  />
                </View>
              ) : (
                <Pressable style={styles.addRow} onPress={() => setAdding(true)}>
                  <View style={[styles.navIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                    <Ionicons name="add" size={18} color={theme.colors.accent} />
                  </View>
                  <AppText variant="bodyMedium" color="accent">
                    Add family member
                  </AppText>
                </Pressable>
              )}
            </AppCard>

            {/* Premium & Settings */}
            <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
              ACCOUNT
            </AppText>
            <AppCard padded={false}>
              <NavRow
                icon="sparkles"
                iconColor={theme.colors.accent}
                iconBg={theme.colors.accentSoft}
                label="Mediulr Premium"
                onPress={() => router.push("/paywall")}
              />
              <Divider style={{ marginLeft: 68 }} />
              <NavRow
                icon="settings-outline"
                iconColor={theme.colors.textSecondary}
                iconBg={theme.colors.surfaceSunken}
                label="Settings"
                onPress={() => router.push("/settings")}
              />
            </AppCard>
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { marginBottom: 20 },
  selfRow: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  sectionLabel: { marginBottom: 8, marginLeft: 2, letterSpacing: 0.4 },
  familyCard: { marginBottom: 24 },
  dependentRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  addForm: { padding: 14 },
  addInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  navIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
