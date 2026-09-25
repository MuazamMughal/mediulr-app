import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

interface DateTimeFieldProps {
  label?: string;
  value: Date;
  onChange: (next: Date) => void;
  /** Icon tint; defaults to the accent. */
  tint?: string;
}

/**
 * Date and time as two separate, always-visible controls (a date and a time are two different decisions, and
 * most entries only ever change the time). iOS shows the native compact pickers in place; Android opens the
 * system dialog on tap — the same pickers the rest of the app uses.
 */
export function DateTimeField({ label = "When", value, onChange, tint }: DateTimeFieldProps) {
  const theme = useTheme();
  const [androidMode, setAndroidMode] = useState<"date" | "time" | null>(null);
  const iconColor = tint ?? theme.colors.accent;

  function merge(mode: "date" | "time", picked: Date) {
    const next = new Date(value);
    if (mode === "date") next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next);
  }

  return (
    <View>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.box, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        {Platform.OS === "ios" ? (
          <>
            <Ionicons name="calendar-outline" size={18} color={iconColor} />
            <View style={styles.pickers}>
              <DateTimePicker value={value} mode="date" display="compact" onValueChange={(_, d) => merge("date", d)} />
              <DateTimePicker value={value} mode="time" display="compact" onValueChange={(_, d) => merge("time", d)} />
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setAndroidMode("date")}
              accessibilityRole="button"
              accessibilityLabel={`Date, ${value.toLocaleDateString()}. Change`}
              style={styles.androidButton}
            >
              <Ionicons name="calendar-outline" size={18} color={iconColor} />
              <AppText variant="bodyMedium">{value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</AppText>
            </Pressable>
            <Pressable
              onPress={() => setAndroidMode("time")}
              accessibilityRole="button"
              accessibilityLabel={`Time, ${value.toLocaleTimeString()}. Change`}
              style={styles.androidButton}
            >
              <Ionicons name="time-outline" size={18} color={iconColor} />
              <AppText variant="bodyMedium">{value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</AppText>
            </Pressable>
          </>
        )}
      </View>
      {Platform.OS === "android" && androidMode && (
        <DateTimePicker
          value={value}
          mode={androidMode}
          onValueChange={(_, d) => merge(androidMode, d)}
          onDismiss={() => setAndroidMode(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, marginLeft: 2 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pickers: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: -4 },
  androidButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingRight: 14, minHeight: 44 },
});
