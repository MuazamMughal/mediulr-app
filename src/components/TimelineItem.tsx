import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { DoseCheckButton } from "./DoseCheckButton";
import type { CalendarEvent } from "../types/domain";

interface TimelineItemProps {
  event: CalendarEvent;
  onMarkTaken?: (medicationId: string, scheduledAt: string) => void;
  onSkip?: (medicationId: string, scheduledAt: string) => void;
  onPress?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function TimelineItem({ event, onMarkTaken, onSkip, onPress }: TimelineItemProps) {
  const theme = useTheme();

  if (event.kind === "medication") {
    const { medication, dose } = event;
    const taken = dose.status === "taken";
    const skipped = dose.status === "skipped";
    const done = taken || skipped;
    const missed = !done && new Date(event.at).getTime() < Date.now();

    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <AppText variant="caption" color={missed ? "warning" : "tertiary"} weight={missed ? "semibold" : undefined} style={styles.time}>
          {formatTime(event.at)}
        </AppText>
        <View style={[styles.rail, { backgroundColor: theme.colors.medication }]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium" weight="semibold" style={done ? styles.doneText : undefined}>
                {medication.name}
              </AppText>
              <AppText variant="caption" color="secondary" style={styles.subtitle}>
                {medication.dosage}
                {medication.instructions ? ` · ${medication.instructions}` : ""}
              </AppText>
              {missed && (
                <AppText variant="metadata" color="warning" weight="semibold" style={styles.missedLabel}>
                  Missed
                </AppText>
              )}
            </View>
            <DoseCheckButton
              done={done}
              taken={taken}
              missed={missed}
              onPress={() => {
                if (done) return;
                onMarkTaken?.(medication.id, event.at);
              }}
            />
          </View>
          {!done && (
            <Pressable onPress={() => onSkip?.(medication.id, event.at)} hitSlop={6} style={styles.skipLink}>
              <AppText variant="caption" color="tertiary">
                Skip
              </AppText>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  }

  if (event.kind === "appointment") {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <AppText variant="caption" color="tertiary" style={styles.time}>
          {formatTime(event.at)}
        </AppText>
        <View style={[styles.rail, { backgroundColor: theme.colors.visit }]} />
        <View style={styles.body}>
          <View style={styles.visitHeader}>
            <Ionicons name="medical-outline" size={14} color={theme.colors.visit} />
            <AppText variant="metadata" color="secondary" style={styles.visitLabel}>
              DOCTOR VISIT
            </AppText>
          </View>
          <AppText variant="bodyMedium" weight="semibold">
            {event.appointment.providerName}
          </AppText>
          {event.appointment.specialty && (
            <AppText variant="caption" color="secondary" style={styles.subtitle}>
              {event.appointment.specialty}
            </AppText>
          )}
        </View>
      </Pressable>
    );
  }

  // custom event (not yet used by any feature, but part of the CalendarEvent union)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <AppText variant="caption" color="tertiary" style={styles.time}>
        {formatTime(event.at)}
      </AppText>
      <View style={styles.body}>
        <AppText variant="bodyMedium">{event.title}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  pressed: { opacity: 0.7 },
  time: { width: 60, paddingTop: 3 },
  rail: { width: 3, borderRadius: 2, alignSelf: "stretch" },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  subtitle: { marginTop: 2 },
  doneText: { opacity: 0.5, textDecorationLine: "line-through" },
  missedLabel: { marginTop: 4 },
  skipLink: { marginTop: 6, alignSelf: "flex-start" },
  visitHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  visitLabel: { letterSpacing: 0.4 },
});
