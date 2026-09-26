import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { DatePanel } from "./DatePanel";
import { TimePanel } from "./TimePanel";
import { withCalendarDay, withClockTime } from "../lib/timeParts";
import { useI18n } from "../i18n/LocaleProvider";

interface DateTimeFieldProps {
  label?: string;
  value: Date;
  onChange: (next: Date) => void;
  /** Icon tint; defaults to the accent. */
  tint?: string;
  /** "date" hides the time button (for "starts on / ends on" fields). */
  mode?: "datetime" | "date";
}

type Open = "date" | "time" | null;

/**
 * Date and time as two always-visible buttons; tapping one opens its picker right underneath (inline, in the page —
 * never a system dialog), and tapping it again or "Done" closes it. Choosing a date closes it straight away.
 */
export function DateTimeField({ label, value, onChange, tint, mode = "datetime" }: DateTimeFieldProps) {
  const theme = useTheme();
  const { t, fmt } = useI18n();
  const clock = fmt.clock({ hour: value.getHours(), minute: value.getMinutes() });
  const [open, setOpen] = useState<Open>(null);
  const iconColor = tint ?? theme.colors.accent;

  const toggle = (which: Exclude<Open, null>) => setOpen((cur) => (cur === which ? null : which));

  return (
    <View>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {label ?? t("picker.when")}
      </AppText>
      <View style={styles.row}>
        <Pill
          icon="calendar-outline"
          text={fmt.dateMedium(value)}
          a11y={t("picker.dateButton", { date: fmt.dateFull(value) })}
          active={open === "date"}
          tint={iconColor}
          onPress={() => toggle("date")}
        />
        {mode === "datetime" && (
        <Pill
          icon="time-outline"
          text={clock}
          a11y={t("picker.timeButton", { time: clock })}
          active={open === "time"}
          tint={iconColor}
          onPress={() => toggle("time")}
        />
        )}
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
          <Pressable onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel={t("picker.doneChoosingTime")} style={styles.done}>
            <AppText variant="bodyMedium" color="accent" weight="semibold">
              {t("common.done")}
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
  label: { marginBottom: 8, marginStart: 2 },
  row: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderWidth: 1.5, borderRadius: 14, borderCurve: "continuous", paddingHorizontal: 12 },
  panel: { marginTop: 10, borderWidth: 1.5, borderRadius: 14, borderCurve: "continuous", padding: 12 },
  done: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8, marginTop: 4 },
});
