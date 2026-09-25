import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { EmptyState } from "../../src/components/EmptyState";
import { SkeletonRow } from "../../src/components/Skeleton";
import { TimelineItem } from "../../src/components/TimelineItem";
import { ProgressRing } from "../../src/components/ProgressRing";
import { HomeEmptyState } from "../../src/components/HomeEmptyState";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useCalendarEvents } from "../../src/features/calendar/useCalendarEvents";
import { useAllMedications, useLogDose } from "../../src/features/medications/useMedications";
import { cancelReminder } from "../../src/features/notifications/scheduleNotifications";
import { addDays, endOfLocalDay, startOfLocalDay } from "../../src/lib/dates";
import { useAppointments } from "../../src/features/appointments/useAppointments";
import type { CalendarEvent } from "../../src/types/domain";

function isToday(d: Date) {
  const t = new Date();
  return d.toDateString() === t.toDateString();
}
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type Period = "Morning" | "Afternoon" | "Evening" | "Night";
const PERIOD_ICON: Record<Period, keyof typeof Ionicons.glyphMap> = {
  Morning: "sunny-outline",
  Afternoon: "partly-sunny-outline",
  Evening: "cloudy-night-outline",
  Night: "moon",
};
function periodOf(date: Date): Period {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}

type Row =
  | { key: string; kind: "now" }
  | { key: string; kind: "section"; period: Period }
  | { key: string; kind: "event"; event: CalendarEvent };

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, isViewingSelf } = useActiveProfile();
  const [day, setDay] = useState(() => new Date());
  const rangeStart = useMemo(() => startOfLocalDay(day), [day]);
  const rangeEnd = useMemo(() => endOfLocalDay(day), [day]);
  const today = isToday(day);

  const { data: events, isLoading: eventsLoading } = useCalendarEvents(profile?.id, rangeStart, rangeEnd);
  const { data: allMedications, isLoading: medsLoading } = useAllMedications(profile?.id);
  const { data: allVisits, isLoading: visitsLoading } = useAppointments(profile?.id);
  const logDose = useLogDose();

  // Until the profile and both lists have loaded we can't tell "empty" from "not fetched yet".
  const isLoading = !profile || eventsLoading || medsLoading || visitsLoading;
  const hasNothingYet = !isLoading && (allMedications?.length ?? 0) === 0 && (allVisits?.length ?? 0) === 0;

  const medicationEvents = events?.filter((e) => e.kind === "medication") ?? [];
  const doneCount = medicationEvents.filter((e) => e.dose.status === "taken" || e.dose.status === "skipped").length;
  const totalCount = medicationEvents.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const rows = useMemo<Row[]>(() => {
    if (!events || events.length === 0) return [];
    const now = Date.now();
    let nowInserted = false;

    const result: Row[] = [];
    let lastPeriod: Period | null = null;

    for (const [i, event] of events.entries()) {
      const eventDate = new Date(event.at);
      const period = periodOf(eventDate);

      if (period !== lastPeriod) {
        result.push({ key: `section-${period}`, kind: "section", period });
        lastPeriod = period;
      }

      // The "now" marker goes right before the first event still in the future.
      if (today && !nowInserted && eventDate.getTime() > now) {
        result.push({ key: "now-marker", kind: "now" });
        nowInserted = true;
      }

      result.push({ key: `${event.kind}:${event.at}:${i}`, kind: "event", event });
    }

    if (today && !nowInserted) result.push({ key: "now-marker", kind: "now" });
    return result;
  }, [events, today]);

  function handleDoseAction(medicationId: string, scheduledAt: string, status: "taken" | "skipped") {
    if (status === "taken") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    // The dose is handled, so its reminder must not fire (ids match planReminders).
    cancelReminder(`dose:${medicationId}:${new Date(scheduledAt).getTime()}`);
    logDose.mutate(
      { medicationId, scheduledAt, status },
      { onError: (err) => Alert.alert("Couldn't update", friendlyError(err)) }
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySmall" color="secondary">
            {today ? greeting() : day.toLocaleDateString(undefined, { weekday: "long" })}
          </AppText>
          {!isViewingSelf && profile && (
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel={`Viewing ${profile.displayName}. Switch profile`}
              style={[styles.viewingChip, { backgroundColor: theme.colors.accentSoft }]}
            >
              <Ionicons name="people" size={12} color={theme.colors.accent} />
              <AppText variant="metadata" color="accent" weight="semibold">
                {profile.displayName} · Switch
              </AppText>
            </Pressable>
          )}
          <AppText variant="h1" style={styles.dateTitle}>
            {today ? "Today" : day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </AppText>
          {!hasNothingYet && (
            <View style={styles.dayNav}>
              <Pressable
                hitSlop={8}
                onPress={() => setDay((d) => addDays(d, -1))}
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
              >
                <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setDay((d) => addDays(d, 1))}
                accessibilityRole="button"
                accessibilityLabel="Next day"
                style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
              >
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          )}
        </View>
        {totalCount > 0 && (
          <ProgressRing progress={progress} done={doneCount} total={totalCount} complete={allDone} />
        )}
      </View>

      {isLoading && (
        <View style={{ marginTop: 20 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {/* Brand new account: one illustration, one action — no bottom bar competing with it. */}
      {hasNothingYet && (
        <HomeEmptyState
          onAddMedication={() => router.push("/medication/new")}
          onAddVisit={() => router.push("/appointment/new")}
        />
      )}

      {/* Has data, just nothing on this day: the bottom bar below is the way to add, so no second button here. */}
      {!isLoading && !hasNothingYet && rows.length === 0 && (
        <EmptyState
          icon="sunny-outline"
          title="A clear day"
          description="Nothing scheduled for this day. Enjoy the breathing room."
        />
      )}

      {!isLoading && rows.length > 0 && (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => {
            if (item.kind === "now") return <NowMarker />;
            if (item.kind === "section") return <SectionHeader period={item.period} />;
            const event = item.event;
            return (
              <TimelineItem
                event={event}
                onMarkTaken={(id, at) => handleDoseAction(id, at, "taken")}
                onSkip={(id, at) => handleDoseAction(id, at, "skipped")}
                onPress={event.kind === "medication" ? () => router.push(`/medication/${event.medication.id}`) : undefined}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isLoading && !hasNothingYet && (
        <View style={[styles.fabRow, { borderTopColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <AppButton label="Medication" size="md" onPress={() => router.push("/medication/new")} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="Doctor visit" variant="secondary" size="md" onPress={() => router.push("/appointment/new")} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({ period }: { period: Period }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={PERIOD_ICON[period]} size={13} color={theme.colors.textTertiary} />
      <AppText variant="metadata" color="tertiary" style={styles.sectionLabel}>
        {period.toUpperCase()}
      </AppText>
    </View>
  );
}

function NowMarker() {
  const theme = useTheme();
  return (
    <View style={styles.nowRow}>
      <View style={[styles.nowDot, { backgroundColor: theme.colors.accent }]} />
      <View style={[styles.nowLine, { backgroundColor: theme.colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8 },
  dateTitle: { marginTop: 2 },
  viewingChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, marginTop: 6 },
  dayNav: { flexDirection: "row", gap: 6, marginTop: 10 },
  navButton: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  listContent: { paddingTop: 20, paddingBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  sectionLabel: { letterSpacing: 0.6 },
  fabRow: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
  nowRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 14, gap: 8 },
  nowDot: { width: 7, height: 7, borderRadius: 3.5 },
  nowLine: { flex: 1, height: 1.5, opacity: 0.5 },
});
