import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toDateId, useCalendar } from "@marceloterreiro/flash-calendar";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

interface DatePanelProps {
  value: Date;
  onChange: (date: Date) => void;
}

/** A plain month grid for choosing a date: tap a day, done. Same look and behaviour on every phone, no system dialog. */
export function DatePanel({ value, onChange }: DatePanelProps) {
  const theme = useTheme();
  const [month, setMonth] = useState(value);
  const selectedId = toDateId(value);

  const { weeksList, weekDaysList, calendarRowMonth } = useCalendar({
    calendarMonthId: toDateId(month),
    calendarFirstDayOfWeek: "monday",
    getCalendarWeekDayFormat: (date, locale) => date.toLocaleDateString(locale, { weekday: "narrow" }),
    calendarFormatLocale: undefined,
  });

  function step(direction: -1 | 1) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
  }

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="h3" style={{ flex: 1 }}>
          {calendarRowMonth}
        </AppText>
        <Nav icon="chevron-back" label="Previous month" onPress={() => step(-1)} />
        <Nav icon="chevron-forward" label="Next month" onPress={() => step(1)} />
      </View>

      <View style={styles.row}>
        {weekDaysList.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekday}>
            <AppText variant="metadata" color="tertiary" weight="semibold">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {weeksList.map((week) => (
        <View key={week[0].id} style={styles.row}>
          {week.map((meta) => {
            const selected = meta.id === selectedId;
            return (
              <Pressable
                key={meta.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  onChange(meta.date);
                }}
                accessibilityRole="button"
                accessibilityLabel={meta.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                accessibilityState={{ selected }}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    selected && { backgroundColor: theme.colors.accent },
                    !selected && meta.isToday && { borderWidth: 1.5, borderColor: theme.colors.accent },
                  ]}
                >
                  <AppText
                    variant="bodySmall"
                    weight={selected || meta.isToday ? "bold" : "medium"}
                    color={selected ? "inverse" : meta.isDifferentMonth ? "tertiary" : meta.isToday ? "accent" : "primary"}
                  >
                    {meta.displayLabel}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Nav({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.nav, { backgroundColor: theme.colors.surfaceSunken }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  nav: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  weekday: { flex: 1, height: 24, alignItems: "center", justifyContent: "center" },
  cell: { flex: 1, height: 44, alignItems: "center", justifyContent: "center" },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
