import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { Alert } from "react-native";

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

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const [day, setDay] = useState(() => new Date());
  const rangeStart = useMemo(() => startOfDay(day), [day]);
  const rangeEnd = useMemo(() => endOfDay(day), [day]);

  const { data: events, isLoading } = useCalendarEvents(profile?.id, rangeStart, rangeEnd);
  const logDose = useLogDose();

  const medicationEvents = events?.filter((e) => e.kind === "medication") ?? [];
  const doneCount = medicationEvents.filter((e) => e.dose.status === "taken" || e.dose.status === "skipped").length;
  const totalCount = medicationEvents.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  function handleDoseAction(medicationId: string, scheduledAt: string, status: "taken" | "skipped") {
    logDose.mutate(
      { medicationId, scheduledAt, status },
      { onError: (err) => Alert.alert("Couldn't update", friendlyError(err)) }
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      {/* Date header */}
      <View style={styles.header}>
        <View>
          <AppText variant="metadata" color="tertiary">
            {isToday(day) ? "TODAY" : day.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}
          </AppText>
          <AppText variant="display" style={styles.dateTitle}>
            {day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </AppText>
        </View>
        <View style={styles.dayNav}>
          <Pressable
            hitSlop={8}
            onPress={() => setDay((d) => new Date(d.getTime() - 86400000))}
            style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => setDay((d) => new Date(d.getTime() + 86400000))}
            style={[styles.navButton, { backgroundColor: theme.colors.surfaceSunken }]}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Progress */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <AppText variant="bodySmall" color="secondary">
              {doneCount} of {totalCount} done today
            </AppText>
            {progress === 1 && (
              <AppText variant="bodySmall" color="success" weight="semibold">
                All set ✓
              </AppText>
            )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceSunken }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: theme.colors.success },
              ]}
            />
          </View>
        </View>
      )}

      {isLoading && (
        <View>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <EmptyState
          icon="sunny-outline"
          title="Nothing scheduled today"
          description="Add a medication or doctor visit and it'll show up here, right when you need it."
          actionLabel="Add medication"
          onAction={() => router.push("/medication/new")}
        />
      )}

      {!isLoading && events && events.length > 0 && (
        <FlatList
          data={events}
          keyExtractor={(item, i) => `${item.kind}:${item.at}:${i}`}
          renderItem={({ item }) => (
            <TimelineItem
              event={item}
              onMarkTaken={(id, at) => handleDoseAction(id, at, "taken")}
              onSkip={(id, at) => handleDoseAction(id, at, "skipped")}
              onPress={item.kind === "medication" ? () => router.push(`/medication/${item.medication.id}`) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={[styles.fabRow, { borderTopColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <AppButton label="+ Medication" variant="primary" size="md" onPress={() => router.push("/medication/new")} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            label="+ Doctor visit"
            variant="secondary"
            size="md"
            onPress={() => router.push("/appointment/new")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8 },
  dateTitle: { marginTop: 2 },
  dayNav: { flexDirection: "row", gap: 8 },
  navButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  progressSection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 4 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  listContent: { paddingTop: 12, paddingBottom: 8 },
  fabRow: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
});
