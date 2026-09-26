import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { DatePanel } from "./DatePanel";
import { TimePanel } from "./TimePanel";
import { formatTimeParts, withCalendarDay, withClockTime } from "../lib/timeParts";

interface DateTimeFieldProps {
  label?: string;
  value: Date;
  onChange: (next: Date) => void;
  /** Icon tint; defaults to the accent. */
  tint?: string;
}

type Open = "date" | "time" | null;

/**
 * Date and time as two always-visible buttons; tapping one opens its picker right underneath (inline, in the page —
 * never a system dialog), and tapping it again or "Done" closes it. Choosing a date closes it straight away.
 */
export function DateTimeField({ label = "When", value, onChange, tint }: DateTimeFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState<Open>(null);
  const iconColor = tint ?? theme.colors.accent;

  const toggle = (which: Exclude<Open, null>) => setOpen((cur) => (cur === which ? null : which));

  return (
    <View>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.row}>
        <Pill
          icon="calendar-outline"
          text={value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          a11y={`Date, ${value.toLocaleDateString(undefined, { dateStyle: "full" })}. Change`}
          active={open === "date"}
          tint={iconColor}
          onPress={() => toggle("date")}
        />
        <Pill
          icon="time-outline"
          text={formatTimeParts({ hour: value.getHours(), minute: value.getMinutes() })}
          a11y={`Time, ${formatTimeParts({ hour: value.getHours(), minute: value.getMinutes() })}. Change`}
          active={open === "time"}
          tint={iconColor}
          onPress={() => toggle("time")}
        />
      </View>

      {open === "date" && (
        <Animated.View entering={FadeIn.duration(150)} style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <DatePanel
            value={value}
            onChange={(day) => {
              onChange(withCalendarDay(value, day));
              setOpen(null);
            }}
          />
        </Animated.View>
      )}

      {open === "time" && (
        <Animated.View entering={FadeIn.duration(150)} style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TimePanel hour={value.getHours()} minute={value.getMinutes()} onChange={(hour, minute) => onChange(withClockTime(value, { hour, minute }))} />
          <Pressable onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel="Done choosing time" style={styles.done}>
            <AppText variant="bodyMedium" color="accent" weight="semibold">
              Done
            </AppText>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function Pill({ icon, text, a11y, active, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; text: string; a11y: string; active: boolean; tint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ expanded: active }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: theme.colors.surface, borderColor: active ? theme.colors.accent : theme.colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={icon} size={18} color={tint} />
      <AppText variant="bodyMedium">{text}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, marginLeft: 2 },
  row: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderWidth: 1.5, borderRadius: 14, borderCurve: "continuous", paddingHorizontal: 12 },
  panel: { marginTop: 10, borderWidth: 1.5, borderRadius: 14, borderCurve: "continuous", padding: 12 },
  done: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8, marginTop: 4 },
});
