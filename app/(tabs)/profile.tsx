import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppCard } from "../../src/components/AppCard";
import { AppButton } from "../../src/components/AppButton";
import { Avatar } from "../../src/components/Avatar";
import { Divider } from "../../src/components/Divider";
import { friendlyError } from "../../src/lib/friendlyError";
import { useAddDependentProfile, useProfiles } from "../../src/features/profile/useProfiles";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useI18n } from "../../src/i18n/LocaleProvider";
import { Chevron } from "../../src/components/Chevron";

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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.navIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <AppText variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Chevron color={theme.colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  // The account's own profile is created with the default name "Me"; show that in the current language.
  const shownName = (p: { isSelf: boolean; displayName: string }) => (p.isSelf && p.displayName === "Me" ? t("profile.me") : p.displayName);
  const { data: profiles } = useProfiles();
  const { profile: activeProfile, setActiveProfileId } = useActiveProfile();
  const addDependent = useAddDependentProfile();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function saveFamilyMember() {
    const displayName = newName.trim();
    if (!displayName || addDependent.isPending) return;
    try {
      await addDependent.mutateAsync({ displayName });
      setNewName("");
      setAdding(false);
    } catch (err) {
      Alert.alert(t("profile.errAdd"), friendlyError(err));
    }
  }

  const self = profiles?.find((p) => p.isSelf);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <FlatList
        data={[1]}
        keyExtractor={() => "profile"}
        contentContainerStyle={styles.content}
        renderItem={() => (
          <>
            <AppText variant="h1" style={styles.pageTitle}>
              {t("tabs.profile")}
            </AppText>

            {/* Your profile */}
            {self && (
              <View style={styles.selfRow}>
                <Avatar name={self.displayName} size={56} />
                <View style={{ marginStart: 14 }}>
                  <AppText variant="h2">{shownName(self)}</AppText>
                  <AppText variant="bodySmall" color="secondary">
                    {t("profile.account")}
                  </AppText>
                </View>
              </View>
            )}

            {/* Family / Care */}
            <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
              {t("profile.family")}
            </AppText>
            <AppCard padded={false} style={styles.familyCard}>
              {(profiles ?? []).map((p, i) => {
                const isActive = activeProfile?.id === p.id;
                return (
                  <View key={p.id}>
                    {i > 0 && <Divider style={{ marginStart: 68 }} />}
                    <Pressable
                      onPress={() => setActiveProfileId(p.isSelf ? null : p.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={isActive ? t("profile.a11yActive", { name: p.isSelf ? t("profile.you") : p.displayName }) : t("profile.a11yInactive", { name: p.isSelf ? t("profile.you") : p.displayName })}
                      style={({ pressed }) => [styles.dependentRow, pressed && { opacity: 0.7 }]}
                    >
                      <Avatar name={p.displayName} size={40} />
                      <View style={{ flex: 1, marginStart: 12 }}>
                        <AppText variant="bodyMedium">{p.isSelf ? t("profile.selfLabel", { name: shownName(p) }) : p.displayName}</AppText>
                        {isActive && (
                          <AppText variant="caption" color="accent" weight="semibold">
                            {t("profile.viewingNow")}
                          </AppText>
                        )}
                      </View>
                      {isActive ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={22} color={theme.colors.borderStrong} />
                      )}
                    </Pressable>
                  </View>
                );
              })}
              {(profiles?.length ?? 0) > 0 && <Divider style={{ marginStart: 68 }} />}
              {adding ? (
                <View style={styles.addForm}>
                  <TextInput
                    style={[styles.addInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                    placeholder={t("profile.namePlaceholder")}
                    accessibilityLabel={t("profile.namePlaceholder")}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    onSubmitEditing={saveFamilyMember}
                  />
                  <View style={{ marginTop: 12 }}>
                    <AppButton label={t("common.save")} onPress={saveFamilyMember} disabled={!newName.trim()} loading={addDependent.isPending} />
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={t("profile.addMember")} style={styles.addRow} onPress={() => setAdding(true)}>
                  <View style={[styles.navIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                    <Ionicons name="add" size={18} color={theme.colors.accent} />
                  </View>
                  <AppText variant="bodyMedium" color="accent">
                    {t("profile.addMember")}
                  </AppText>
                </Pressable>
              )}
            </AppCard>

            {/* Reminders & Settings */}
            <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
              {t("profile.accountSection")}
            </AppText>
            <AppCard padded={false}>
              <NavRow
                icon="notifications"
                iconColor={theme.colors.reminder}
                iconBg={theme.colors.reminderSoft}
                label={t("reminders.title")}
                onPress={() => router.push("/reminders")}
              />
              <Divider style={{ marginStart: 68 }} />
              <NavRow
                icon="settings-outline"
                iconColor={theme.colors.textSecondary}
                iconBg={theme.colors.surfaceSunken}
                label={t("nav.settings")}
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
  sectionLabel: { marginBottom: 8, marginStart: 2, letterSpacing: 0.4 },
  familyCard: { marginBottom: 24 },
  dependentRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  addForm: { padding: 14 },
  addInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  navIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
