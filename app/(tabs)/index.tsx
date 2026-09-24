import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
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

export default function CalendarScreen() {
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const [day, setDay] = useState(() => new Date());
  const rangeStart = useMemo(() => startOfDay(day), [day]);
  const rangeEnd = useMemo(() => endOfDay(day), [day]);

  const { data: events, isLoading } = useCalendarEvents(profile?.id, rangeStart, rangeEnd);
  const logDose = useLogDose();

  return (
    <View style={styles.container}>
      <View style={styles.dayNav}>
        <Pressable onPress={() => setDay((d) => new Date(d.getTime() - 86400000))}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.dayLabel}>
          {day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </Text>
        <Pressable onPress={() => setDay((d) => new Date(d.getTime() + 86400000))}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {isLoading && <Text style={styles.empty}>Loading…</Text>}
      {!isLoading && (!events || events.length === 0) && (
        <Text style={styles.empty}>Nothing scheduled today.</Text>
      )}

      <FlatList
        data={events ?? []}
        keyExtractor={(item, i) => `${item.kind}:${item.at}:${i}`}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            onMarkTaken={(medicationId, scheduledAt) =>
              logDose.mutate({ medicationId, scheduledAt, status: "taken" })
            }
            onSkip={(medicationId, scheduledAt) =>
              logDose.mutate({ medicationId, scheduledAt, status: "skipped" })
            }
          />
        )}
      />

      <View style={styles.fabRow}>
        <Pressable style={styles.fab} onPress={() => router.push("/medication/new")}>
          <Text style={styles.fabText}>+ Medication</Text>
        </Pressable>
        <Pressable style={styles.fab} onPress={() => router.push("/appointment/new")}>
          <Text style={styles.fabText}>+ Doctor visit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EventRow({
  event,
  onMarkTaken,
  onSkip,
}: {
  event: CalendarEvent;
  onMarkTaken: (medicationId: string, scheduledAt: string) => void;
  onSkip: (medicationId: string, scheduledAt: string) => void;
}) {
  const time = new Date(event.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (event.kind === "medication") {
    const taken = event.dose.status === "taken";
    const skipped = event.dose.status === "skipped";
    return (
      <View style={[styles.row, styles.medicationRow]}>
        <Text style={styles.time}>{time}</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>
            {event.medication.name} · {event.medication.dosage}
          </Text>
          {!taken && !skipped && (
            <View style={styles.doseActions}>
              <Pressable onPress={() => onMarkTaken(event.medication.id, event.at)}>
                <Text style={styles.actionTaken}>Mark taken</Text>
              </Pressable>
              <Pressable onPress={() => onSkip(event.medication.id, event.at)}>
                <Text style={styles.actionSkip}>Skip</Text>
              </Pressable>
            </View>
          )}
          {taken && <Text style={styles.statusTaken}>✓ Taken</Text>}
          {skipped && <Text style={styles.statusSkipped}>Skipped</Text>}
        </View>
      </View>
    );
  }

  if (event.kind === "appointment") {
    return (
      <View style={[styles.row, styles.appointmentRow]}>
        <Text style={styles.time}>{time}</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Dr. visit · {event.appointment.providerName}</Text>
          {event.appointment.specialty && <Text style={styles.rowSubtitle}>{event.appointment.specialty}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.rowTitle}>{event.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  navArrow: { fontSize: 28, paddingHorizontal: 12 },
  dayLabel: { fontSize: 17, fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  row: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  medicationRow: { borderLeftWidth: 3, borderLeftColor: "#4C8BF5" },
  appointmentRow: { borderLeftWidth: 3, borderLeftColor: "#F5A623" },
  time: { width: 72, color: "#666", fontVariant: ["tabular-nums"] },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  doseActions: { flexDirection: "row", gap: 16, marginTop: 6 },
  actionTaken: { color: "#1a9e5c", fontWeight: "600" },
  actionSkip: { color: "#999" },
  statusTaken: { color: "#1a9e5c", marginTop: 4 },
  statusSkipped: { color: "#999", marginTop: 4 },
  fabRow: { flexDirection: "row", gap: 12, padding: 16 },
  fab: { flex: 1, backgroundColor: "#4C8BF5", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "white", fontWeight: "600" },
});
