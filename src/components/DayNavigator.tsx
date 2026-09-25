import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeProvider";
import { addDays } from "../lib/dates";
import { isSameDay, relativeDayLabel } from "../lib/dayTime";
import { AppText } from "./AppText";

/**
 * Previous / next day with a tappable label that opens a date picker — the "history" control for the
 * food and exercise days. Arrows step one day; tapping the label jumps anywhere; "Today" snaps back.
 */
export function DayNavigator({ day, onChange }: { day: Date; onChange: (next: Date) => void }) {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  // iOS's spinner fires on every notch; hold the choice in a draft and load the day only when "Done" is tapped.
  const [draft, setDraft] = useState(day);
  const isToday = isSameDay(day, new Date());

  function go(next: Date) {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(next);
  }

  return (
    <View>
      <View style={styles.row}>
        <NavButton icon="chevron-back" label="Previous day" onPress={() => go(addDays(day, -1))} />
        <Pressable
          onPress={() => {
            setDraft(day);
            setPicking((p) => !p);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${day.toLocaleDateString(undefined, { dateStyle: "full" })}. Choose a date`}
          style={styles.label}
        >
          <AppText variant="h3">{relativeDayLabel(day)}</AppText>
          <AppText variant="metadata" color="tertiary">
            {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </AppText>
        </Pressable>
        {!isToday && (
          <Pressable onPress={() => go(new Date())} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to today">
            <AppText variant="caption" color="accent" weight="semibold">
              Today
            </AppText>
          </Pressable>
        )}
        <NavButton icon="chevron-forward" label="Next day" onPress={() => go(addDays(day, 1))} />
      </View>

      {picking && Platform.OS === "ios" && (
        <View style={[styles.pickerWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <DateTimePicker value={draft} mode="date" display="spinner" onValueChange={(_, d) => setDraft(d)} />
          <Pressable
            onPress={() => {
              setPicking(false);
              onChange(draft);
            }} style={styles.doneRow} accessibilityRole="button">
            <AppText variant="bodySmall" color="accent" weight="semibold">
              Done
            </AppText>
          </Pressable>
        </View>
      )}
      {picking && Platform.OS === "android" && (
        <DateTimePicker value={day} mode="date" onValueChange={(_, d) => onChange(d)} onDismiss={() => setPicking(false)} />
      )}
    </View>
  );
}

function NavButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.navButton, { backgroundColor: theme.colors.surfaceSunken }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  label: { flex: 1, minHeight: 44, justifyContent: "center" },
  navButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pickerWrap: { marginHorizontal: 20, marginTop: 8, borderWidth: 1.5, borderRadius: 14, borderCurve: "continuous", paddingTop: 8 },
  doneRow: { alignItems: "flex-end", paddingVertical: 10, paddingHorizontal: 14 },
});
