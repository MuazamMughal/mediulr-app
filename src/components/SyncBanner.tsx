import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import type { PendingDose } from "../features/offline/outbox";

/** An answer is normally sent within a moment; only ones still waiting after this are worth telling the person about. */
const SHOW_AFTER_MS = 3000;

/** "Saved on this phone. Will sync when you're back online." — shown only when answers have been stuck waiting. */
export function SyncBanner({ pending }: { pending: PendingDose[] }) {
  const theme = useTheme();
  const [, tick] = useState(0);
  useEffect(() => {
    if (pending.length === 0) return;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [pending.length]);
  const count = pending.filter((p) => Date.now() - p.queuedAt > SHOW_AFTER_MS).length;
  if (count === 0) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${count} ${count === 1 ? "change is" : "changes are"} saved on this phone and will sync when you're back online`}
      style={[styles.row, { backgroundColor: theme.colors.warningSoft }]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.warning} />
      <AppText variant="caption" color="warning" weight="semibold" style={{ flex: 1 }}>
        {count === 1 ? "1 answer" : `${count} answers`} saved on this phone. Will sync when you're back online.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderCurve: "continuous" },
});
