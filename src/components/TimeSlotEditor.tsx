import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTime(time: string): string {
  return timeToDate(time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Editable list of dose reminder times — one row per occurrence, each opening the
 * native time picker. The number of rows is controlled by the caller (medication/new.tsx
 * resizes `times` when the frequency chip changes); this component only edits values.
 */
export function TimeSlotEditor({ times, onChange }: { times: string[]; onChange: (times: string[]) => void }) {
  const theme = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateTime(index: number, date: Date) {
    const next = [...times];
    next[index] = dateToTime(date);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      {times.map((time, index) => {
        const isEditing = editingIndex === index;
        return (
          <View key={index}>
            <Pressable
              onPress={() => setEditingIndex(isEditing ? null : index)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.colors.surface, borderColor: isEditing ? theme.colors.accent : theme.colors.border },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.doseIcon, { backgroundColor: theme.colors.medicationSoft }]}>
                <Ionicons name="time-outline" size={15} color={theme.colors.medication} />
              </View>
              <AppText variant="bodySmall" color="secondary" style={{ flex: 1 }}>
                Dose {index + 1}
              </AppText>
              <AppText variant="bodyMedium" weight="semibold">
                {formatTime(time)}
              </AppText>
            </Pressable>

            {isEditing && Platform.OS === "ios" && (
              <View style={[styles.pickerWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <DateTimePicker
                  value={timeToDate(time)}
                  mode="time"
                  display="spinner"
                  onValueChange={(_, date) => updateTime(index, date)}
                />
                <Pressable onPress={() => setEditingIndex(null)} style={styles.doneRow}>
                  <AppText variant="bodySmall" color="accent" weight="semibold">
                    Done
                  </AppText>
                </Pressable>
              </View>
            )}

            {isEditing && Platform.OS === "android" && (
              <DateTimePicker
                value={timeToDate(time)}
                mode="time"
                onValueChange={(_, date) => updateTime(index, date)}
                onDismiss={() => setEditingIndex(null)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, borderCurve: "continuous", paddingVertical: 12, paddingHorizontal: 12 },
  doseIcon: { width: 26, height: 26, borderRadius: 8, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  pickerWrap: { borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8, paddingTop: 8 },
  doneRow: { alignItems: "flex-end", paddingVertical: 8, paddingHorizontal: 12 },
});
