import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { refillHeadline, type RefillStatus } from "../features/medications/refill";
import type { Medication } from "../types/domain";

export interface LowSupply {
  medication: Medication;
  status: RefillStatus;
}

/** One calm line on Home when a medication is running low. Tapping opens it (or the list, if several are low). */
export function RefillBanner({ low, onOpen, onOpenList }: { low: LowSupply[]; onOpen: (id: string) => void; onOpenList: () => void }) {
  const theme = useTheme();
  if (low.length === 0) return null;
  const first = low[0];
  const single = low.length === 1;
  const title = single ? `Refill soon: ${first.medication.name}` : `${low.length} medications running low`;
  const detail = single ? refillHeadline(first.status) : low.map((l) => l.medication.name).join(", ");
  return (
    <Pressable
      onPress={() => (single ? onOpen(first.medication.id) : onOpenList())}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.warningSoft }, pressed && { opacity: 0.75 }]}
    >
      <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium" weight="semibold" color="warning">
          {title}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 1 }} numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.warning} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderCurve: "continuous" },
});
