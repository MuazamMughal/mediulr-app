import { useMemo } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { EmptyState } from "../../src/components/EmptyState";
import { SkeletonRow } from "../../src/components/Skeleton";
import { VisitCard } from "../../src/components/VisitCard";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAppointments } from "../../src/features/appointments/useAppointments";
import type { Appointment } from "../../src/types/domain";

export default function AppointmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: appointments, isLoading } = useAppointments(profile?.id);

  const sections = useMemo(() => {
    if (!appointments) return [];
    const now = Date.now();
    const upcoming = appointments.filter((a) => new Date(a.scheduledAt).getTime() >= now);
    const past = appointments
      .filter((a) => new Date(a.scheduledAt).getTime() < now)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const result: { title: string; data: Appointment[] }[] = [];
    if (upcoming.length) result.push({ title: "Upcoming", data: upcoming });
    if (past.length) result.push({ title: "Past", data: past });
    return result;
  }, [appointments]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="h1">Doctor Visits</AppText>
      </View>

      {isLoading && (
        <View>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && sections.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="No doctor visits yet"
          description="Add an upcoming visit and Mediulr will remind you the day before and an hour before."
          actionLabel="Add doctor visit"
          onAction={() => router.push("/appointment/new")}
        />
      )}

      {!isLoading && sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(a) => a.id}
          renderSectionHeader={({ section }) => (
            <AppText variant="caption" color="secondary" style={styles.sectionHeader}>
              {section.title.toUpperCase()}
            </AppText>
          )}
          renderItem={({ item }) => (
            <VisitCard appointment={item} onPress={() => router.push(`/appointment/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <AppButton label="+ Add doctor visit" variant="secondary" onPress={() => router.push("/appointment/new")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.4 },
  listContent: { paddingBottom: 8 },
  footer: { padding: 16, borderTopWidth: 1 },
});
