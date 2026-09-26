import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/LocaleProvider";
import { AppText } from "./AppText";
import { WEEKDAY_ORDER, weekdayIndex } from "../features/reminders/describe";
import type { Weekday } from "../lib/recurrence";

/** Seven tappable weekday buttons (Monday first); any number can be on. */
export function WeekdayChips({ selected, onChange }: { selected: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const theme = useTheme();
  const { fmt } = useI18n();
  const toggle = (day: Weekday) => onChange(selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day]);
  return (
    <View style={styles.row}>
      {WEEKDAY_ORDER.map((day) => {
        const on = selected.includes(day);
        const name = fmt.weekdayName(weekdayIndex(day), "long");
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [styles.chip, { backgroundColor: on ? theme.colors.accent : theme.colors.surfaceSunken, borderColor: on ? theme.colors.accent : theme.colors.border }, pressed && { opacity: 0.8 }]}
          >
            <AppText variant="caption" weight="semibold" color={on ? "inverse" : "secondary"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {fmt.weekdayName(weekdayIndex(day), "short")}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  chip: { flex: 1, minHeight: 44, borderRadius: 12, borderCurve: "continuous", borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
});
