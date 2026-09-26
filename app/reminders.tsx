import { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { useI18n } from "../src/i18n/LocaleProvider";
import { AppText } from "../src/components/AppText";
import { AppButton } from "../src/components/AppButton";
import { EmptyState } from "../src/components/EmptyState";
import { SkeletonRow } from "../src/components/Skeleton";
import { useActiveProfile } from "../src/features/profile/ActiveProfile";
import { useReminders } from "../src/features/reminders/useReminders";
import { nextOccurrence } from "../src/features/reminders/schedule";
import { describeReminderSchedule } from "../src/features/reminders/describe";
import type { CustomReminder } from "../src/types/domain";

interface Row {
  reminder: CustomReminder;
  next: Date | null;
}

export default function RemindersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const i18n = useI18n();
  const { t, fmt } = i18n;
  const { profile, isViewingSelf } = useActiveProfile();
  const { data, isLoading: queryLoading, isError, refetch } = useReminders(profile?.id);
  const isLoading = !profile || queryLoading;

  const sections = useMemo(() => {
    const rows: Row[] = (data ?? []).map((reminder) => ({ reminder, next: nextOccurrence(reminder) }));
    const upcoming = rows.filter((r) => r.next).sort((a, b) => (a.next as Date).getTime() - (b.next as Date).getTime());
    const finished = rows.filter((r) => !r.next);
    const result: { title: string; data: Row[] }[] = [];
    if (upcoming.length) result.push({ title: t("reminders.section.upcoming"), data: upcoming });
    if (finished.length) result.push({ title: t("reminders.section.finished"), data: finished });
    return result;
  }, [data, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      {isLoading && (
        <View style={{ marginTop: 12 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && isError && (
        <EmptyState icon="cloud-offline-outline" title={t("reminders.errLoad")} description={t("common.checkConnection")} actionLabel={t("common.tryAgain")} onAction={() => refetch()} />
      )}

      {!isLoading && !isError && sections.length === 0 && (
        <EmptyState icon="notifications-outline" title={t("reminders.empty.title")} description={t("reminders.empty.text")} actionLabel={t("reminders.empty.action")} onAction={() => router.push("/reminder/new")} />
      )}

      {!isLoading && !isError && sections.length > 0 && (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(r) => r.reminder.id}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              !isViewingSelf && profile ? (
                <AppText variant="bodySmall" color="secondary" style={styles.forWhom}>
                  {profile.displayName}
                </AppText>
              ) : null
            }
            renderSectionHeader={({ section }) => (
              <AppText variant="caption" color="secondary" style={styles.sectionHeader}>
                {section.title.toUpperCase()}
              </AppText>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/reminder/${item.reminder.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.reminder.title}. ${describeReminderSchedule(item.reminder.recurrenceRule, i18n)}`}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.colors.border }, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.icon, { backgroundColor: theme.colors.reminderSoft }]}>
                  <Ionicons name="notifications" size={18} color={theme.colors.reminder} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium" weight="semibold">
                    {item.reminder.title}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {describeReminderSchedule(item.reminder.recurrenceRule, i18n)}
                  </AppText>
                  <AppText variant="caption" color={item.next ? "accent" : "tertiary"} weight="semibold" style={{ marginTop: 2 }}>
                    {item.next ? t("reminders.next", { when: fmt.dateTimeMedium(item.next) }) : t("reminders.noneLeft")}
                  </AppText>
                </View>
                <Ionicons name={i18n.isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.textTertiary} />
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton label={`+ ${t("reminders.add")}`} onPress={() => router.push("/reminder/new")} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  forWhom: { paddingHorizontal: 20, paddingTop: 4 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  footer: { padding: 16, borderTopWidth: 1 },
});
