import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import type { Appointment } from "../types/domain";

export function VisitCard({ appointment, onPress }: { appointment: Appointment; onPress: () => void }) {
  const theme = useTheme();
  const date = new Date(appointment.scheduledAt);
  const isPast = date.getTime() < Date.now();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.dateBlock}>
        <AppText variant="metadata" color="tertiary">
          {date.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
        </AppText>
        <AppText variant="h2" style={{ marginTop: -2 }}>
          {date.getDate()}
        </AppText>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <View style={styles.body}>
        <AppText variant="bodyMedium" weight="semibold">
          {appointment.providerName}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {appointment.specialty ? `${appointment.specialty} · ` : ""}
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </AppText>
        {appointment.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textTertiary} />
            <AppText variant="metadata" color="tertiary">
              {appointment.location}
            </AppText>
          </View>
        )}
      </View>
      {isPast && (
        <View style={[styles.pastBadge, { backgroundColor: theme.colors.surfaceSunken }]}>
          <AppText variant="metadata" color="tertiary">
            Past
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, borderCurve: "continuous", padding: 14, marginHorizontal: 20, marginBottom: 10 },
  pressed: { opacity: 0.75 },
  dateBlock: { width: 44, alignItems: "center" },
  divider: { width: 1, height: 36, marginHorizontal: 14 },
  body: { flex: 1 },
  subtitle: { marginTop: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  pastBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
});
