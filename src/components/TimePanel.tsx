import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { formatTimeParts, from12Hour, shiftMinutes, to12Hour } from "../lib/timeParts";

interface TimePanelProps {
  hour: number; // 0–23
  minute: number; // 0–59
  onChange: (hour: number, minute: number) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const COLUMNS = 6;

/**
 * The app's one time picker: tap an hour, tap a minute, choose AM or PM. Everything is a plain button, so it looks
 * and behaves the same on every phone, has large touch targets, and has no system dialog to open, dismiss or
 * accidentally reopen. ±1 minute buttons handle times that aren't on a five-minute mark.
 */
export function TimePanel({ hour, minute, onChange }: TimePanelProps) {
  const theme = useTheme();
  const { hour12, pm } = to12Hour(hour);

  function set(next: { hour?: number; minute?: number }) {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(next.hour ?? hour, next.minute ?? minute);
  }
  function nudge(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    const t = shiftMinutes({ hour, minute }, delta);
    onChange(t.hour, t.minute);
  }

  return (
    <View>
      <View style={styles.readout}>
        <Nudge icon="remove" label="One minute earlier" onPress={() => nudge(-1)} />
        <AppText variant="h1" accessibilityLiveRegion="polite" accessibilityLabel={`Time ${formatTimeParts({ hour, minute })}`}>
          {formatTimeParts({ hour, minute })}
        </AppText>
        <Nudge icon="add" label="One minute later" onPress={() => nudge(1)} />
      </View>

      <AppText variant="caption" color="secondary" style={styles.label}>
        Hour
      </AppText>
      <Grid
        items={HOURS.map((h) => ({ key: h, text: String(h), selected: h === hour12, a11y: `${h} o'clock` }))}
        onPick={(h) => set({ hour: from12Hour(h, pm) })}
      />

      <AppText variant="caption" color="secondary" style={styles.label}>
        Minute
      </AppText>
      <Grid
        items={MINUTES.map((m) => ({ key: m, text: String(m).padStart(2, "0"), selected: m === minute, a11y: `${m} minutes` }))}
        onPick={(m) => set({ minute: m })}
      />

      <View style={styles.meridiem}>
        {([false, true] as const).map((isPm) => (
          <Cell
            key={String(isPm)}
            text={isPm ? "PM" : "AM"}
            selected={pm === isPm}
            a11y={isPm ? "PM" : "AM"}
            onPress={() => set({ hour: from12Hour(hour12, isPm) })}
            style={{ flex: 1 }}
          />
        ))}
      </View>
    </View>
  );
}

function Grid<T extends number>({ items, onPick }: { items: { key: T; text: string; selected: boolean; a11y: string }[]; onPick: (key: T) => void }) {
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += COLUMNS) rows.push(items.slice(i, i + COLUMNS));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((item) => (
            <Cell key={item.key} text={item.text} selected={item.selected} a11y={item.a11y} onPress={() => onPick(item.key)} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Cell({ text, selected, a11y, onPress, style }: { text: string; selected: boolean; a11y: string; onPress: () => void; style?: object }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.cell,
        theme.simple && styles.cellSimple,
        { backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceSunken },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <AppText variant="bodySmall" weight="semibold" color={selected ? "inverse" : "primary"}>
        {text}
      </AppText>
    </Pressable>
  );
}

function Nudge({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.nudge, { backgroundColor: theme.colors.surfaceSunken }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  label: { marginBottom: 6, marginTop: 4, marginLeft: 2 },
  grid: { gap: 6, marginBottom: 8 },
  gridRow: { flexDirection: "row", gap: 6 },
  cell: { minHeight: 44, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  cellSimple: { minHeight: 54 },
  meridiem: { flexDirection: "row", gap: 6, marginTop: 4 },
  nudge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
