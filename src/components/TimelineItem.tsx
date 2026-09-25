import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
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
        <View style={[styles.avatar, { backgroundColor: done ? theme.colors.surfaceSunken : theme.colors.medicationSoft }]}>
          <Ionicons name="medkit" size={17} color={done ? theme.colors.textTertiary : theme.colors.medication} />
        </View>
        <Animated.View style={styles.body} layout={LinearTransition.springify().damping(18).stiffness(180)}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <AppText variant="bodyMedium" weight="semibold" style={done ? styles.doneText : undefined}>
                  {medication.name}
                </AppText>
                <View style={[styles.dosagePill, { backgroundColor: theme.colors.surfaceSunken }]}>
                  <AppText variant="metadata" color="secondary" weight="semibold">
                    {medication.dosage}
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" color={missed ? "warning" : "tertiary"} weight={missed ? "semibold" : undefined} style={styles.subtitle}>
                {missed ? "Missed · " : ""}
                {formatTime(event.at)}
                {medication.instructions ? ` · ${medication.instructions}` : ""}
              </AppText>
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
            <Animated.View exiting={FadeOut.duration(150)}>
              <Pressable onPress={() => onSkip?.(medication.id, event.at)} hitSlop={6} style={styles.skipLink}>
                <AppText variant="caption" color="tertiary">
                  Skip
                </AppText>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  if (event.kind === "appointment") {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.visitSoft }]}>
          <Ionicons name="medical" size={17} color={theme.colors.visit} />
        </View>
        <View style={styles.body}>
          <AppText variant="bodyMedium" weight="semibold">
            {event.appointment.providerName}
          </AppText>
          <AppText variant="caption" color="tertiary" style={styles.subtitle}>
            {formatTime(event.at)}
            {event.appointment.specialty ? ` · ${event.appointment.specialty}` : ""}
          </AppText>
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
  row: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 20, gap: 12 },
  pressed: { opacity: 0.7 },
  time: { width: 60, paddingTop: 3 },
  avatar: { width: 40, height: 40, borderRadius: 13, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  dosagePill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  subtitle: { marginTop: 3 },
  doneText: { opacity: 0.5, textDecorationLine: "line-through" },
  skipLink: { marginTop: 6, alignSelf: "flex-start" },
});
