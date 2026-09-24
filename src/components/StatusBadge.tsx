import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export type Status = "upcoming" | "taken" | "skipped" | "missed";

export function StatusBadge({ status }: { status: Status }) {
  const theme = useTheme();

  const config: Record<Status, { label: string; bg: string; fg: "success" | "secondary" | "danger" | "accent" }> = {
    upcoming: { label: "Upcoming", bg: theme.colors.accentSoft, fg: "accent" },
    taken: { label: "Taken", bg: theme.colors.successSoft, fg: "success" },
    skipped: { label: "Skipped", bg: theme.colors.surfaceSunken, fg: "secondary" },
    missed: { label: "Missed", bg: theme.colors.dangerSoft, fg: "danger" },
  };
  const c = config[status];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant="metadata" color={c.fg} weight="semibold">
        {c.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
