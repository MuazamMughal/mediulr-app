import { useMemo } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { EmptyState } from "../../src/components/EmptyState";
import { SkeletonRow } from "../../src/components/Skeleton";
import { MedicationRow } from "../../src/components/MedicationRow";
import { GuardianBanner } from "../../src/components/GuardianBanner";
import { useGuardians } from "../../src/features/guardians/useGuardians";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useFinishedMedications, useMedications } from "../../src/features/medications/useMedications";
import type { Medication } from "../../src/types/domain";

export default function MedicationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, isViewingSelf } = useActiveProfile();
  const { data: active, isLoading: activeLoading } = useMedications(profile?.id);
  const { data: finished, isLoading: finishedLoading } = useFinishedMedications(profile?.id);
  const isLoading = !profile || activeLoading || finishedLoading;
  // Optional extra: until guardians have loaded (or if they fail to), the banner is simply absent.
  const { data: guardians } = useGuardians(profile?.id);

  const sections = useMemo(() => {
    const result: { title: string; data: Medication[] }[] = [];
    if (active?.length) result.push({ title: "Active", data: active });
    // Finished courses and stopped medications stay listed so the history behind the calendar is never a mystery.
    if (finished?.length) result.push({ title: "Completed", data: finished });
    return result;
  }, [active, finished]);
  const hasAny = sections.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="h1">Medications</AppText>
        {!isViewingSelf && profile && (
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
            For {profile.displayName}
          </AppText>
        )}
      </View>

      {isLoading && (
        <View>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {/* Empty: the illustration carries the single action, so no footer button below. */}
      {!isLoading && !hasAny && (
        <EmptyState
          icon="medkit-outline"
          title="Your medication list is clear"
          description="Add your first medication and Mediulr will build a reminder schedule so you never lose track."
          actionLabel="Add medication"
          onAction={() => router.push("/medication/new")}
        />
      )}

      {!isLoading && hasAny && (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={guardians ? <GuardianBanner guardians={guardians} onPress={() => router.push("/guardians")} /> : null}
          renderSectionHeader={({ section }) =>
            // The first section needs no label when it's the only one.
            sections.length > 1 || section.title === "Completed" ? (
              <AppText variant="caption" color="secondary" style={styles.sectionHeader}>
                {section.title.toUpperCase()}
              </AppText>
            ) : null
          }
          renderItem={({ item }) => <MedicationRow medication={item} onPress={() => router.push(`/medication/${item.id}`)} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isLoading && hasAny && (
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <AppButton label="+ Add medication" onPress={() => router.push("/medication/new")} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, letterSpacing: 0.4 },
  listContent: { paddingBottom: 8 },
  footer: { padding: 16, borderTopWidth: 1 },
});
