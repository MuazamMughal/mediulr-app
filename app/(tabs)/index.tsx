import { useEffect, useMemo, useState } from "react";
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
import { MonthCalendar } from "../../src/components/MonthCalendar";
import { PeriodHeader, periodOf, type Period } from "../../src/components/PeriodHeader";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useCalendarEvents } from "../../src/features/calendar/useCalendarEvents";
import { useMonthOverview } from "../../src/features/calendar/useMonthOverview";
import { useAllMedications } from "../../src/features/medications/useMedications";
import { cancelDoseReminders } from "../../src/features/notifications/scheduleNotifications";
import { submitDose } from "../../src/features/offline/submitDose";
import { usePendingDoses } from "../../src/features/offline/doseOutbox";
import { applyPendingDoses } from "../../src/features/offline/overlay";
import { refillStatus } from "../../src/features/medications/refill";
import { SyncBanner } from "../../src/components/SyncBanner";
import { RefillBanner, type LowSupply } from "../../src/components/RefillBanner";
import { endOfLocalDay, startOfLocalDay, toLocalDateString } from "../../src/lib/dates";
import { useAppointments } from "../../src/features/appointments/useAppointments";
import { useFoodForRange, useHasAnyFood } from "../../src/features/nutrition/useFood";
import { useExerciseForRange, useHasAnyExercise } from "../../src/features/exercise/useExercise";
import { useMonthLogs } from "../../src/features/lifestyle/useMonthLogs";
import { useGuardians } from "../../src/features/guardians/useGuardians";
import { alertGuardians, tellLabel } from "../../src/features/guardians/logic";
import { tellGuardians } from "../../src/features/guardians/tellGuardians";
import { mergeTimeline, summarizeLogs } from "../../src/features/lifestyle/logic";
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

type Row =
  | { key: string; kind: "now" }
  | { key: string; kind: "section"; period: Period }
  | { key: string; kind: "event"; event: CalendarEvent };

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, isViewingSelf } = useActiveProfile();
  const [day, setDay] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  // Simple mode starts on the one-week strip instead of the full month grid.
  const [calendarExpanded, setCalendarExpanded] = useState(!theme.simple);
  useEffect(() => setCalendarExpanded(!theme.simple), [theme.simple]);
  const rangeStart = useMemo(() => startOfLocalDay(day), [day]);
  const rangeEnd = useMemo(() => endOfLocalDay(day), [day]);
  const today = isToday(day);

  const { data: calendarEvents, isLoading: dayLoading } = useCalendarEvents(profile?.id, rangeStart, rangeEnd);
  // Food and exercise load on their own, so a problem there can never hide medications or doctor visits.
  const { data: foodEntries, isLoading: foodLoading } = useFoodForRange(profile?.id, rangeStart, rangeEnd);
  const { data: exerciseEntries, isLoading: exerciseLoading } = useExerciseForRange(profile?.id, rangeStart, rangeEnd);
  const monthLogs = useMonthLogs(profile?.id, month);
  const anyFood = useHasAnyFood(profile?.id);
  const anyExercise = useHasAnyExercise(profile?.id);
  // A failed lookup counts as "nothing logged" so an unreachable new table can never hide the brand-new-account screen.
  const noLogsYet = (anyFood.isError || anyFood.data === false) && (anyExercise.isError || anyExercise.data === false);
  const logsLoading = foodLoading || exerciseLoading;
  // Answers still waiting to sync show as already answered, so tapping "Taken" feels instant with or without signal.
  const pendingDoses = usePendingDoses();
  const events = useMemo<CalendarEvent[] | undefined>(
    () => (calendarEvents ? applyPendingDoses(mergeTimeline(calendarEvents, foodEntries, exerciseEntries), pendingDoses) : undefined),
    [calendarEvents, foodEntries, exerciseEntries, pendingDoses]
  );
  const { data: overview } = useMonthOverview(profile?.id, month);
  const { data: allMedications, isLoading: medsLoading } = useAllMedications(profile?.id);
  const { data: allVisits, isLoading: visitsLoading } = useAppointments(profile?.id);
  // Guardians are optional extras: if they fail to load, the missed-dose row simply has no "Tell" button.
  const { data: guardians } = useGuardians(profile?.id);
  const toTell = useMemo(() => alertGuardians(guardians), [guardians]);
  // FlatList redraws rows only when its data changes; these arrive later (or change), so they must be declared as row inputs.
  const rowInputs = useMemo(() => ({ toTell, isViewingSelf, patient: profile?.displayName }), [toTell, isViewingSelf, profile?.displayName]);

  // "Loading" here is only the first load. Switching days keeps the calendar on screen and just skeletons the timeline.
  const noMedsOrVisits = (allMedications?.length ?? 0) === 0 && (allVisits?.length ?? 0) === 0;
  // Only wait on the meal/exercise lookups when they could change the answer, so the welcome screen never flashes the calendar first.
  const isLoading = !profile || medsLoading || visitsLoading || (noMedsOrVisits && (anyFood.isLoading || anyExercise.isLoading));
  // Brand new = no medications, no visits, and no meals or activity either.
  const hasNothingYet = !isLoading && noMedsOrVisits && noLogsYet;

  const medicationEvents = events?.filter((e) => e.kind === "medication") ?? [];
  const visitCount = events?.filter((e) => e.kind === "appointment").length ?? 0;
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

  function selectDay(date: Date) {
    setDay(date);
    setMonth(date);
  }

  function handleDoseAction(medicationId: string, scheduledAt: string, status: "taken" | "skipped") {
    if (status === "taken") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    // Queue first (the row updates at once), then silence this dose's reminder and follow-ups. Saved now, or as soon as there's signal.
    submitDose({ medicationId, scheduledAt, status }).catch((err) => Alert.alert("Couldn't update", friendlyError(err)));
    cancelDoseReminders(medicationId, scheduledAt);
  }

  const daySummary = [
    totalCount > 0 ? `${totalCount} ${totalCount === 1 ? "dose" : "doses"}` : null,
    visitCount > 0 ? `${visitCount} doctor ${visitCount === 1 ? "visit" : "visits"}` : null,
    ...summarizeLogs(foodEntries ?? [], exerciseEntries ?? []),
  ]
    .filter(Boolean)
    .join(" · ");

  const lowSupplies = useMemo<LowSupply[]>(
    () =>
      (allMedications ?? []).flatMap((medication) => {
        const status = refillStatus(medication);
        return status?.low ? [{ medication, status }] : [];
      }),
    [allMedications]
  );

  const listHeader = (
    <View>
      <SyncBanner pending={pendingDoses} />
      <RefillBanner low={lowSupplies} onOpen={(id) => router.push(`/medication/${id}`)} onOpenList={() => router.push("/(tabs)/medications")} />
      <MonthCalendar
        selected={day}
        onSelect={selectDay}
        month={month}
        onMonthChange={setMonth}
        expanded={calendarExpanded}
        onToggleExpanded={() => setCalendarExpanded((e) => !e)}
        overview={overview}
        logs={monthLogs}
      />
      <View style={styles.dayHeading}>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</AppText>
          <AppText variant="caption" color={dayLoading ? "tertiary" : "secondary"} style={{ marginTop: 2 }}>
            {dayLoading ? "Loading…" : daySummary || "Nothing scheduled"}
          </AppText>
        </View>
        {!theme.simple && (
          <>
        <QuickLogButton icon="restaurant-outline" label="Add food" tint={theme.colors.nutrition} onPress={() => router.push(`/food/new?date=${toLocalDateString(day)}`)} />
        <QuickLogButton icon="walk-outline" label="Add exercise" tint={theme.colors.exercise} onPress={() => router.push(`/exercise/new?date=${toLocalDateString(day)}`)} />
          </>
        )}
      </View>
    </View>
  );

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

      {!isLoading && !hasNothingYet && (
        <FlatList
          data={dayLoading ? [] : rows}
          keyExtractor={(r) => r.key}
          extraData={rowInputs}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            dayLoading || logsLoading ? (
              <View>
                <SkeletonRow />
                <SkeletonRow />
              </View>
            ) : (
              <EmptyState
                icon="sunny-outline"
                title="A clear day"
                description="Nothing scheduled for this day. Enjoy the breathing room."
              />
            )
          }
          renderItem={({ item }) => {
            if (item.kind === "now") return <NowMarker />;
            if (item.kind === "section") return <PeriodHeader period={item.period} />;
            const event = item.event;
            return (
              <TimelineItem
                event={event}
                onMarkTaken={(id, at) => handleDoseAction(id, at, "taken")}
                onSkip={(id, at) => handleDoseAction(id, at, "skipped")}
                tellGuardianLabel={toTell.length > 0 ? tellLabel(toTell) : undefined}
                onTellGuardian={(medication, at) =>
                  tellGuardians(toTell, {
                    patientName: isViewingSelf ? null : (profile?.displayName ?? null),
                    medicationName: medication.name,
                    dosage: medication.dosage,
                    scheduledAt: new Date(at),
                  })
                }
                onPress={
                  event.kind === "medication"
                    ? () => router.push(`/medication/${event.medication.id}`)
                    : event.kind === "appointment"
                      ? () => router.push(`/appointment/${event.appointment.id}`)
                      : event.kind === "food"
                        ? () => router.push(`/food/${event.food.id}`)
                        : event.kind === "exercise"
                          ? () => router.push(`/exercise/${event.exercise.id}`)
                          : undefined
                }
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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

function QuickLogButton({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickButton, { backgroundColor: theme.colors.surfaceSunken }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={tint} />
    </Pressable>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  dateTitle: { marginTop: 2 },
  viewingChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, marginTop: 6 },
  dayHeading: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 2 },
  quickButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 12 },
  fabRow: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
  nowRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 14, gap: 8 },
  nowDot: { width: 7, height: 7, borderRadius: 3.5 },
  nowLine: { flex: 1, height: 1.5, opacity: 0.5 },
});
