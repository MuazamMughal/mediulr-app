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
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useCalendarEvents } from "../../src/features/calendar/useCalendarEvents";
import { useLogDose } from "../../src/features/medications/useMedications";
import type { CalendarEvent } from "../../src/types/domain";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
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

type Row = { key: string; kind: "now" } | { key: string; kind: "event"; event: CalendarEvent };

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const [day, setDay] = useState(() => new Date());
  const rangeStart = useMemo(() => startOfDay(day), [day]);
  const rangeEnd = useMemo(() => endOfDay(day), [day]);
  const today = isToday(day);

  const { data: events, isLoading } = useCalendarEvents(profile?.id, rangeStart, rangeEnd);
  const logDose = useLogDose();

  const medicationEvents = events?.filter((e) => e.kind === "medication") ?? [];
  const doneCount = medicationEvents.filter((e) => e.dose.status === "taken" || e.dose.status === "skipped").length;
  const totalCount = medicationEvents.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const rows = useMemo<Row[]>(() => {
    if (!events) return [];
    const eventRows: Row[] = events.map((e, i) => ({ key: `${e.kind}:${e.at}:${i}`, kind: "event", event: e }));
    if (!today) return eventRows;
    const now = Date.now();
    const insertAt = eventRows.findIndex((r) => r.kind === "event" && new Date(r.event.at).getTime() > now);
    const marker: Row = { key: "now-marker", kind: "now" };
    if (insertAt === -1) return [...eventRows, marker];
    eventRows.splice(insertAt, 0, marker);
    return eventRows;
  }, [events, today]);

  function handleDoseAction(medicationId: string, scheduledAt: string, status: "taken" | "skipped") {
    if (status === "taken") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
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
          <AppText variant="h1" style={styles.dateTitle}>
            {today ? "Today" : day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </AppText>
        </View>
        <View style={styles.dayNav}>
          <Pressable
            hitSlop={8}
            onPress={() => setDay((d) => new Date(d.getTime() - 86400000))}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
          >
            <Ionicons name="chevron-back" size={17} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => setDay((d) => new Date(d.getTime() + 86400000))}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
          >
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Status */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceSunken }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: allDone ? theme.colors.success : theme.colors.accent },
              ]}
            />
          </View>
          <AppText variant="caption" color={allDone ? "success" : "secondary"} weight={allDone ? "semibold" : undefined}>
            {allDone ? "All done for today" : `${doneCount} of ${totalCount} taken`}
          </AppText>
        </View>
      )}

      {isLoading && (
        <View style={{ marginTop: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon="sunny-outline"
          title="A clear day"
          description="Add a medication or doctor visit and it'll show up here, right when you need it."
          actionLabel="Add medication"
          onAction={() => router.push("/medication/new")}
        />
      )}

      {!isLoading && rows.length > 0 && (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => {
            if (item.kind === "now") return <NowMarker />;
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

      <View style={[styles.fabRow, { borderTopColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <AppButton label="Medication" size="md" onPress={() => router.push("/medication/new")} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton label="Doctor visit" variant="secondary" size="md" onPress={() => router.push("/appointment/new")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function NowMarker() {
  const theme = useTheme();
  return (
    <View style={styles.nowRow}>
      <View style={styles.nowTimeCol}>
        <View style={[styles.nowDot, { backgroundColor: theme.colors.accent }]} />
      </View>
      <View style={[styles.nowLine, { backgroundColor: theme.colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8 },
  dateTitle: { marginTop: 2 },
  dayNav: { flexDirection: "row", gap: 8 },
  navButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  progressSection: { paddingHorizontal: 20, marginTop: 24, marginBottom: 4, gap: 8 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  listContent: { paddingTop: 16, paddingBottom: 8 },
  fabRow: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
  nowRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 16 },
  nowTimeCol: { width: 60, alignItems: "flex-end", paddingRight: 8 },
  nowDot: { width: 7, height: 7, borderRadius: 3.5 },
  nowLine: { flex: 1, height: 1.5, opacity: 0.5 },
});
