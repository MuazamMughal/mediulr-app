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
import { MAX_GUARDIANS } from "../src/features/guardians/logic";

export default function GuardiansScreen() {
  const theme = useTheme();
  const router = useRouter();
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
          title="Couldn't load guardians"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      )}

      {!isLoading && !isError && count === 0 && (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No guardians yet"
          description="Add someone you trust. When you miss a dose, one tap opens a message to them. You choose whether to send it."
          actionLabel="Add a guardian"
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
                {isViewingSelf ? "People you trust to be told when you miss a dose." : `People who can be told when ${profile?.displayName} misses a dose.`}
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/guardian/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}${item.relationship ? `, ${item.relationship}` : ""}. Edit`}
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
                    {item.relationship ? `${item.relationship} · ` : ""}
                    {item.phone}
                  </AppText>
                </View>
                <Ionicons
                  name={item.notifyOnMissed ? "notifications" : "notifications-off-outline"}
                  size={16}
                  color={item.notifyOnMissed ? theme.colors.accent : theme.colors.textTertiary}
                  accessibilityLabel={item.notifyOnMissed ? "Offered on missed doses" : "Not offered on missed doses"}
                />
              </Pressable>
            )}
            ListFooterComponent={
              <AppText variant="caption" color="tertiary" style={styles.privacy}>
                Mediulr never contacts your guardians on its own. Tapping "Tell" on a missed dose opens your messaging app with a short note, and nothing is sent until you press Send.
              </AppText>
            }
          />
          {count < MAX_GUARDIANS && (
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              <AppButton label="+ Add guardian" onPress={() => router.push("/guardian/new")} />
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
