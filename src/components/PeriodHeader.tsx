import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export type Period = "Morning" | "Afternoon" | "Evening" | "Night";

const PERIOD_ICON: Record<Period, keyof typeof Ionicons.glyphMap> = {
  Morning: "sunny-outline",
  Afternoon: "partly-sunny-outline",
  Evening: "cloudy-night-outline",
  Night: "moon",
};

export function periodOf(date: Date): Period {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}

/** The small "MORNING / AFTERNOON…" label that groups a day's timeline. */
export function PeriodHeader({ period }: { period: Period }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={PERIOD_ICON[period]} size={13} color={theme.colors.textTertiary} />
      <AppText variant="metadata" color="tertiary" style={styles.label}>
        {period.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  label: { letterSpacing: 0.6 },
});
