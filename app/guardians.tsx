import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppButton } from "../src/components/AppButton";
import { EmptyState } from "../src/components/EmptyState";
import { SkeletonRow } from "../src/components/Skeleton";
import { useActiveProfile } from "../src/features/profile/ActiveProfile";
import { useGuardians } from "../src/features/guardians/useGuardians";
import { MAX_GUARDIANS, relationshipLabel } from "../src/features/guardians/logic";
import { useI18n } from "../src/i18n/LocaleProvider";

export default function GuardiansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const i18n = useI18n();
  const { t } = i18n;
  const { profile, isViewingSelf } = useActiveProfile();
  const { data: guardians, isLoading: queryLoading, isError, refetch } = useGuardians(profile?.id);
  const isLoading = !profile || queryLoading;
  const count = guardians?.length ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      {isLoading && (
        <View style={{ marginTop: 12 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title={t("guardians.screen.errLoad")}
          description={t("common.checkConnection")}
          actionLabel={t("common.tryAgain")}
          onAction={() => refetch()}
        />
      )}

      {!isLoading && !isError && count === 0 && (
        <EmptyState
          icon="shield-checkmark-outline"
          title={t("guardians.screen.emptyTitle")}
          description={t("guardians.screen.emptyText")}
          actionLabel={t("guardians.screen.emptyAction")}
          onAction={() => router.push("/guardian/new")}
        />
      )}

      {!isLoading && !isError && count > 0 && (
        <>
          <FlatList
            data={guardians}
            keyExtractor={(g) => g.id}
            ListHeaderComponent={
              <AppText variant="bodySmall" color="secondary" style={styles.intro}>
                {isViewingSelf ? t("guardians.screen.introSelf") : t("guardians.screen.introOther", { name: profile?.displayName ?? "" })}
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/guardian/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={t("guardians.screen.editA11y", { name: item.name, relationship: item.relationship ? `, ${relationshipLabel(item.relationship, i18n)}` : "" })}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.colors.accentSoft }]}>
                  <AppText variant="h3" color="accent">
                    {item.name.trim().charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium" weight="semibold">
                    {item.name}
                  </AppText>
                  <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                    {item.relationship ? `${relationshipLabel(item.relationship, i18n)} · ` : ""}
                    {item.phone}
                  </AppText>
                </View>
                <Ionicons
                  name={item.notifyOnMissed ? "notifications" : "notifications-off-outline"}
                  size={16}
                  color={item.notifyOnMissed ? theme.colors.accent : theme.colors.textTertiary}
                  accessibilityLabel={item.notifyOnMissed ? t("guardians.screen.offered") : t("guardians.screen.notOffered")}
                />
              </Pressable>
            )}
            ListFooterComponent={
              <AppText variant="caption" color="tertiary" style={styles.privacy}>
                {t("guardians.screen.privacy")}
              </AppText>
            }
          />
          {count < MAX_GUARDIANS && (
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              <AppButton label={`+ ${t("guardians.screen.add")}`} onPress={() => router.push("/guardian/new")} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  privacy: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, lineHeight: 17 },
  footer: { padding: 16, borderTopWidth: 1 },
});
