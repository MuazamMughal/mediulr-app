import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { refillHeadline, type RefillStatus } from "../features/medications/refill";
import { useI18n } from "../i18n/LocaleProvider";
import type { Medication } from "../types/domain";
import { Chevron } from "./Chevron";

export interface LowSupply {
  medication: Medication;
  status: RefillStatus;
}

/** One calm line on Home when a medication is running low. Tapping opens it (or the list, if several are low). */
export function RefillBanner({ low, onOpen, onOpenList }: { low: LowSupply[]; onOpen: (id: string) => void; onOpenList: () => void }) {
  const theme = useTheme();
  const i18n = useI18n();
  const { t, tn } = i18n;
  if (low.length === 0) return null;
  const first = low[0];
  const single = low.length === 1;
  const title = single ? t("refill.soonNamed", { name: first.medication.name }) : tn("refill.runningLow", low.length);
  const detail = single ? refillHeadline(first.status, i18n) : low.map((l) => l.medication.name).join(i18n.locale === "ur" ? "، " : ", ");
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
      <Chevron color={theme.colors.warning} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderCurve: "continuous" },
});
