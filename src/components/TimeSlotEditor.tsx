import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { TimePanel } from "./TimePanel";
import { formatTimeParts, parseHHMM, toHHMM } from "../lib/timeParts";

/**
 * Editable list of dose reminder times — one row per occurrence. Tapping a row opens the app's time picker right
 * under it (inline, never a system dialog); "Done" or tapping the row again closes it. The number of rows is
 * controlled by the caller (the medication form resizes `times` when the frequency chip changes); this component
 * only edits values.
 */
export function TimeSlotEditor({ times, onChange }: { times: string[]; onChange: (times: string[]) => void }) {
  const theme = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateTime(index: number, hour: number, minute: number) {
    const next = [...times];
    next[index] = toHHMM({ hour, minute });
    onChange(next);
  }

  return (
    <View style={styles.container}>
      {times.map((time, index) => {
        const isEditing = editingIndex === index;
        const parts = parseHHMM(time);
        return (
          <View key={index}>
            <Pressable
              onPress={() => setEditingIndex(isEditing ? null : index)}
              accessibilityRole="button"
              accessibilityLabel={`Dose ${index + 1}, ${formatTimeParts(parts)}. Change time`}
              accessibilityState={{ expanded: isEditing }}
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
                {formatTimeParts(parts)}
              </AppText>
            </Pressable>

            {isEditing && (
              <Animated.View entering={FadeIn.duration(150)} style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TimePanel hour={parts.hour} minute={parts.minute} onChange={(h, m) => updateTime(index, h, m)} />
                <Pressable onPress={() => setEditingIndex(null)} accessibilityRole="button" accessibilityLabel="Done choosing time" style={styles.done}>
                  <AppText variant="bodyMedium" color="accent" weight="semibold">
                    Done
                  </AppText>
                </Pressable>
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderWidth: 1.5, borderRadius: 12, borderCurve: "continuous", paddingVertical: 10, paddingHorizontal: 12 },
  doseIcon: { width: 26, height: 26, borderRadius: 8, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  panel: { marginTop: 6, borderWidth: 1.5, borderRadius: 12, borderCurve: "continuous", padding: 12 },
  done: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8, marginTop: 4 },
});
